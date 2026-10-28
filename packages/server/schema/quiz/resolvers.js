import { GraphQLError } from "graphql";
import { JSONResolver } from "graphql-scalars";
import { db } from "../../config/database.js";
import saveData from "../../utils/db/saveData.js";
import requireAnyPermission from "../../helpers/requireAnyPermission.js";
import saveUpload from "../../helpers/saveUpload.js";

const QUESTION_TYPES = ["watch_match", "multiple_choice", "sign_recall", "video_record", "fill_blank"];
const QUIZ_MEDIA_MAX_SIZE = 50 * 1024 * 1024;

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

  const keptIds = rows.filter((row) => row.id).map((row) => row.id);
  await tx.quizOption.deleteMany({ where: { questionId, id: { notIn: keptIds } } });

  for (const row of rows) {
    if (row.id) {
      await tx.quizOption.updateMany({ where: { id: row.id, questionId }, data: row.data });
    } else {
      await tx.quizOption.create({ data: { ...row.data, questionId } });
    }
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
  },
};

export default quizResolvers;
