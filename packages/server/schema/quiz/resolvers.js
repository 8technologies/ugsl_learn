import { GraphQLError } from "graphql";
import { JSONResolver } from "graphql-scalars";
import { db } from "../../config/database.js";
import saveData from "../../utils/db/saveData.js";
import requireAnyPermission from "../../helpers/requireAnyPermission.js";
import saveUpload from "../../helpers/saveUpload.js";

const QUESTION_TYPES = ["watch_match", "multiple_choice", "sign_recall", "video_record", "fill_blank"];
const QUIZ_MEDIA_MAX_SIZE = 50 * 1024 * 1024;
const MAX_HEARTS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

// Streaks count calendar days (UTC), matching learner_stats.last_active_date
function startOfUtcDay(date) {
  const day = new Date(date);
  day.setUTCHours(0, 0, 0, 0);
  return day;
}

// True when the learner has completed every published lesson in the module
async function isModuleCompleted(tx, learnerId, moduleId) {
  const lessonWhere = { moduleId, status: "published", deleted: false };
  const [lessonCount, completedCount] = await Promise.all([
    tx.lesson.count({ where: lessonWhere }),
    tx.learnerProgress.count({ where: { learnerId, status: "completed", lesson: lessonWhere } }),
  ]);
  return lessonCount > 0 && completedCount >= lessonCount;
}

function badInput(message) {
  return new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });
}

// GraphQL IDs arrive as strings; quiz tables use Int ids
function toIntId(id) {
  const value = Number(id);
  if (!Number.isInteger(value)) throw badInput("Invalid id.");
  return value;
}

function rethrow(error, what) {
  if (error instanceof GraphQLError) throw error;
  throw new GraphQLError(`Failed to save ${what}: ${error.message}`);
}

// Creating needs can_create_content, editing needs can_edit_content
function requireContentPermission(context, id) {
  requireAnyPermission(
    context,
    id ? ["can_edit_content"] : ["can_create_content"],
    `You do not have permission to ${id ? "edit" : "create"} learning content.`,
  );
}

// Keep only fields the client sent, trimming strings
function pickFields(input, fields) {
  const data = {};
  for (const field of fields) {
    if (input[field] === undefined) continue;
    data[field] = typeof input[field] === "string" ? input[field].trim() : input[field];
  }
  return data;
}

// Stores an uploaded sign video or image and returns its file name for mediaRef
async function saveQuizMedia(file) {
  const upload = await file;
  // Yoga gives a web File (`type`); graphql-upload style objects use `mimetype`
  const mediaType = upload?.type ?? upload?.mimetype ?? "";
  if (!mediaType.startsWith("video/") && !mediaType.startsWith("image/")) {
    throw badInput("A quiz sign must be a video or an image file.");
  }
  const saved = await saveUpload({ file: upload, subdir: "quizMedia", maxSize: QUIZ_MEDIA_MAX_SIZE });
  return saved.filename;
}

export const getQuiz = async ({ lessonId } = {}) => {
  try {
    const where = { deleted: false };
    if (lessonId) where.lessonId = lessonId;

    return await db.quiz.findMany({
      where,
      orderBy: { id: "desc" },
    });
  } catch (error) {
    throw new GraphQLError(`Failed to fetch quizzes: ${error.message}`);
  }
};

// Upserts the given options and removes the question's other options
async function replaceOptions(tx, questionId, options) {
  const rows = [];
  for (const option of options) {
    const data = {
      label: option.label?.trim() || null,
      correctFlag: !!option.correctFlag,
    };
    if (option.video) data.mediaRef = await saveQuizMedia(option.video);
    rows.push({ id: option.id ? toIntId(option.id) : null, data });
  }

  // Only this question's own options can be updated by id
  const existing = await tx.quizOption.findMany({ where: { questionId }, select: { id: true } });
  const existingIds = new Set(existing.map((option) => option.id));
  const keptIds = rows.filter((row) => row.id).map((row) => row.id);
  if (keptIds.some((id) => !existingIds.has(id))) throw badInput("An option does not belong to this question.");

  await tx.quizOption.deleteMany({ where: { questionId, id: { notIn: keptIds } } });

  for (const row of rows) {
    await saveData({ model: "quizOption", data: row.id ? row.data : { ...row.data, questionId }, id: row.id, tx });
  }
}

const quizResolvers = {
  JSON: JSONResolver,

  Query: {
    lessonQuiz: (_parent, { lessonId }) => getQuiz({ lessonId }),
  },

  Quiz: {
    quizQuestions: (quiz) =>
      db.quizQuestion.findMany({ where: { quizId: quiz.id }, orderBy: [{ sequence: "asc" }, { id: "asc" }] }),
  },
  QuizQuestion: {
    quiz: (question) => db.quiz.findUnique({ where: { id: question.quizId } }),
    Options: (question) => db.quizOption.findMany({ where: { questionId: question.id }, orderBy: { id: "asc" } }),
  },
  QuizOption: {
    question: (option) => db.quizQuestion.findUnique({ where: { id: option.questionId } }),
  },

  Mutation: {
    saveQuiz: async (_parent, { input }, context) => {
      const id = input.id ? toIntId(input.id) : null;
      requireContentPermission(context, id);

      try {
        const data = pickFields(input, ["lessonId", "passThreshold", "status"]);
        if (data.passThreshold != null && (data.passThreshold < 0 || data.passThreshold > 100)) {
          throw badInput("Pass mark must be between 0 and 100.");
        }

        if (id) {
          const quiz = await db.quiz.findUnique({ where: { id } });
          if (!quiz || quiz.deleted) throw badInput(`Quiz ${id} does not exist.`);
        } else {
          if (!data.lessonId) throw badInput("Missing required field(s): lessonId.");
          const lesson = await db.lesson.findUnique({ where: { id: data.lessonId } });
          if (!lesson || lesson.deleted) throw badInput(`Lesson ${data.lessonId} does not exist.`);
          data.passThreshold ??= 70;
        }

        await saveData({ model: "quiz", data, id });

        return { success: true, message: id ? "Quiz updated successfully" : "Quiz created successfully" };
      } catch (error) {
        rethrow(error, "quiz");
      }
    },

    saveQuizQuestion: async (_parent, { input }, context) => {
      const id = input.id ? toIntId(input.id) : null;
      requireContentPermission(context, id);

      try {
        const data = pickFields(input, ["quizId", "questionType", "prompt", "sequence", "correctAnswer"]);
        if (data.questionType !== undefined && !QUESTION_TYPES.includes(data.questionType)) {
          throw badInput(`Question type must be one of: ${QUESTION_TYPES.join(", ")}.`);
        }

        if (id) {
          if (!(await db.quizQuestion.findUnique({ where: { id } }))) throw badInput(`Question ${id} does not exist.`);
        } else {
          if (!data.quizId || !data.questionType) throw badInput("Missing required field(s): quizId, questionType.");
          const quiz = await db.quiz.findUnique({ where: { id: data.quizId } });
          if (!quiz || quiz.deleted) throw badInput(`Quiz ${data.quizId} does not exist.`);

          // New questions go to the end of their quiz unless an order is given
          if (data.sequence === undefined) {
            const last = await db.quizQuestion.aggregate({
              where: { quizId: data.quizId },
              _max: { sequence: true },
            });
            data.sequence = (last._max.sequence ?? 0) + 1;
          }
        }

        if (input.video) data.mediaRef = await saveQuizMedia(input.video);
        else if (input.removeMedia) data.mediaRef = null;

        // The question and its options are saved all-or-nothing
        await db.$transaction(async (tx) => {
          const savedId = await saveData({ model: "quizQuestion", data, id, tx });
          if (input.options) await replaceOptions(tx, savedId, input.options);
        });

        return { success: true, message: id ? "Question saved" : "Question added" };
      } catch (error) {
        rethrow(error, "question");
      }
    },

    deleteQuizQuestion: async (_parent, { id }, context) => {
      requireAnyPermission(context, ["can_delete_content"], "You do not have permission to delete learning content.");

      try {
        const questionId = toIntId(id);
        if (!(await db.quizQuestion.findUnique({ where: { id: questionId } }))) {
          throw badInput(`Question ${id} does not exist.`);
        }
        if (await db.questionAttempt.count({ where: { questionId } })) {
          throw badInput("Learners have already answered this question, so it cannot be deleted.");
        }

        // Questions have no soft-delete column, so remove the row and what hangs off it
        await db.$transaction([
          db.quizOption.deleteMany({ where: { questionId } }),
          db.quizQuestionSign.deleteMany({ where: { questionId } }),
          db.quizQuestion.delete({ where: { id: questionId } }),
        ]);

        return { success: true, message: "Question deleted" };
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError(`Failed to delete question: ${error.message}`);
      }
    },

    saveQuizAttempt: async (_parent, { input }, context) => {
      const userId = context?.req?.user?.id;
      if (!userId) {
        throw new GraphQLError("Please sign in to continue.", { extensions: { code: "UNAUTHENTICATED" } });
      }

      try {
        const { quizId, lessonId, score, metadata, hearts } = input;
        if (score < 0 || score > 100) throw badInput("Score must be between 0 and 100.");
        if (hearts != null && (hearts < 0 || hearts > MAX_HEARTS)) {
          throw badInput(`Hearts must be between 0 and ${MAX_HEARTS}.`);
        }

        const quiz = await db.quiz.findUnique({ where: { id: quizId } });
        if (!quiz || quiz.deleted || quiz.lessonId !== lessonId) {
          throw badInput(`Quiz ${quizId} does not belong to lesson ${lessonId}.`);
        }
        const lesson = await db.lesson.findUnique({ where: { id: lessonId } });
        if (!lesson || lesson.deleted) throw badInput(`Lesson ${lessonId} does not exist.`);

        const passed = score >= quiz.passThreshold;
        const now = new Date();
        const today = startOfUtcDay(now);

        const result = await db.$transaction(async (tx) => {
          // Learners get a profile the first time they finish a quiz
          const learner = await tx.learnerProfile.findUnique({ where: { userId } });
          const learnerId = learner?.id ?? (await saveData({ model: "learnerProfile", data: { userId }, tx }));

          await saveData({
            model: "quizAttempt",
            data: { learnerId, quizId, score, startedAt: now, completedAt: now },
            tx,
          });

          // A completed lesson stays completed even if a later retry fails
          const progress = await tx.learnerProgress.findUnique({
            where: { learnerId_lessonId: { learnerId, lessonId } },
          });
          const wasCompleted = progress?.status === "completed";
          const firstCompletion = passed && !wasCompleted;

          const progressData = {
            status: wasCompleted || passed ? "completed" : "in_progress",
            score: Math.round(score),
            metadata,
            ...(firstCompletion && { completedAt: now }),
          };
          await saveData({
            model: "learnerProgress",
            data: progress ? progressData : { ...progressData, learnerId, lessonId },
            id: progress?.id,
            tx,
          });

          // XP is only earned the first time a lesson (or module) is completed
          let xpEarned = firstCompletion ? lesson.xpReward : 0;
          const moduleCompleted = firstCompletion && (await isModuleCompleted(tx, learnerId, lesson.moduleId));

          const moduleProgress = await tx.learnerModuleProgress.findUnique({
            where: { learnerId_moduleId: { learnerId, moduleId: lesson.moduleId } },
          });
          if (moduleProgress?.status !== "completed") {
            const moduleData = moduleCompleted
              ? { status: "completed", completedAt: now }
              : { status: "in_progress" };
            await saveData({
              model: "learnerModuleProgress",
              data: moduleProgress ? moduleData : { ...moduleData, learnerId, moduleId: lesson.moduleId },
              id: moduleProgress?.id,
              tx,
            });
          }

          if (moduleCompleted) {
            const module = await tx.module.findUnique({ where: { id: lesson.moduleId } });
            xpEarned += module.xpReward;

            // Modules that required this one can now be started
            const unlocked = await tx.module.findMany({
              where: { requiresModuleId: lesson.moduleId, deleted: false },
              select: { id: true },
            });
            for (const { id: moduleId } of unlocked) {
              const next = await tx.learnerModuleProgress.findUnique({
                where: { learnerId_moduleId: { learnerId, moduleId } },
              });
              if (next && next.status !== "locked") continue;
              await saveData({
                model: "learnerModuleProgress",
                data: next ? { status: "available" } : { learnerId, moduleId, status: "available" },
                id: next?.id,
                tx,
              });
            }
          }

          // Streak goes up once per day of activity and resets after a missed day
          const stats = await tx.learnerStats.findUnique({ where: { learnerId } });
          const lastActive = stats?.lastActiveDate ? startOfUtcDay(stats.lastActiveDate) : null;
          const daysSinceActive = lastActive ? Math.round((today - lastActive) / DAY_MS) : null;
          let currentStreak = stats?.currentStreak ?? 0;
          if (daysSinceActive === null || daysSinceActive > 1) currentStreak = 1;
          else if (daysSinceActive === 1) currentStreak += 1;
          const longestStreak = Math.max(stats?.longestStreak ?? 0, currentStreak);

          // learner_stats is keyed by learnerId, so that is the id column saveData updates by
          const statsData = {
            totalXp: (stats?.totalXp ?? 0) + xpEarned,
            currentStreak,
            longestStreak,
            lastActiveDate: today,
            ...(hearts != null && { hearts }),
          };
          await saveData({
            model: "learnerStats",
            data: stats ? statsData : { ...statsData, learnerId },
            id: stats ? learnerId : null,
            idColumn: "learnerId",
            tx,
          });

          return { xpEarned, moduleCompleted };
        });

        let message = passed ? "Quiz passed" : "Quiz not passed";
        if (result.xpEarned) message += ` · +${result.xpEarned} XP`;
        if (result.moduleCompleted) message += " · module completed";
        return { success: true, message };
      } catch (error) {
        rethrow(error, "quiz attempt");
      }
    },
  },
};

export default quizResolvers;
