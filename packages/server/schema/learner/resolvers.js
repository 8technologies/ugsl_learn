import { GraphQLError } from "graphql";
import { DateTimeResolver } from "graphql-scalars";
import { db } from "../../config/database.js";
import hasPermission from "../../helpers/hasPermission.js";
import saveData from "../../utils/db/saveData.js";

function badInput(message) {
  return new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });
}

export const getLearners = async ({ limit = 20, offset = 0, id, userId, search } = {}) => {
  try {
    const where = { deleted: false, user: { deleted: false } };

    if (id) where.id = id;
    if (userId) where.userId = userId;
    if (search) {
      where.user.OR = [
        { username: { contains: search } },
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    return await db.learnerProfile.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    });
  } catch (error) {
    throw new GraphQLError(`Failed to fetch learners: ${error.message}`);
  }
};

// Relation fields load lazily, so a query only hits the tables it asks for
const profile = (learner) => db.learnerProfile.findUnique({ where: { id: learner.id } });

const learnerResolvers = {
  DateTime: DateTimeResolver,
  Query: {
    learners: (_parent, { limit, offset, search }) => {
      if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0) {
        throw badInput("Limit must be 1–100 and offset must be zero or greater.");
      }
      return getLearners({ limit, offset, search });
    },
    learner: async (_parent, { id, userId }, context) => {
      const lookupUserId = id || userId ? userId : context.req?.user?.id;
      if (!id && !lookupUserId) {
        throw new GraphQLError("Please sign in to continue.", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }
      const [learner] = await getLearners({ id, userId: lookupUserId, limit: 1 });
      return learner ?? null;
    },
  },
  Learner: {
    user: (learner) => db.user.findUnique({ where: { id: learner.userId } }),
    quizAttempts: (learner) => profile(learner).quizAttempts({ orderBy: { startedAt: "desc" } }),
    progress: (learner) => profile(learner).progress(),
    favourites: (learner) => profile(learner).favourites({ orderBy: { createdAt: "desc" } }),
    badges: (learner) => profile(learner).badges({ orderBy: { earnedAt: "desc" } }),
    activity: (learner) => profile(learner).activity({ orderBy: { activityDate: "desc" } }),
    moduleProgress: (learner) => profile(learner).moduleProgress(),
    questionAttempts: (learner) => profile(learner).questionAttempts({ orderBy: { attemptedAt: "desc" } }),
    stats: (learner) => profile(learner).stats(),
    xpTransactions: (learner) => profile(learner).xpTransactions({ orderBy: { createdAt: "desc" } }),
    dailyChallenges: (learner) => profile(learner).dailyChallenges(),
  },
  LearnerBadge: {
    badge: (row) => db.badge.findUnique({ where: { id: row.badgeId } }),
  },
  LearnerDailyChallenge: {
    challenge: (row) => db.dailyChallenge.findUnique({ where: { id: row.challengeId } }),
  },

  //Mutations for the learner
  Mutation: {
    SaveLearner: async (parent, { input }, context) => {
      const userId = context?.req?.user?.id;
      const userPermissions = context?.req?.user?.permissions;

      if (!userId) {
        throw new GraphQLError("Please sign in to continue.", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      try {
        // Undefined fields are skipped by Prisma, so updates only touch what was sent
        const data = {
          hearingStatus: input.hearingStatus,
          preferredLanguage: input.preferredLanguage,
          preferences: input.preferences,
        };

        // With an id, update that profile (own profile, or anyone's with permission).
        // Without one, save the signed-in user's own profile, creating it if needed.
        const existing = input.id
          ? await db.learnerProfile.findUnique({ where: { id: input.id } })
          : await db.learnerProfile.findUnique({ where: { userId } });

        if (input.id && (!existing || existing.deleted)) {
          throw new GraphQLError("Learner not found.", { extensions: { code: "NOT_FOUND" } });
        }

        if (existing && existing.userId !== userId && !hasPermission(userPermissions, "can_update_learner")) {
          throw new GraphQLError("You do not have permission to update this learner.", {
            extensions: { code: "FORBIDDEN" },
          });
        }

        const learnerId = await saveData({
          model: "learnerProfile",
          data: existing ? data : { ...data, userId },
          id: existing?.id ?? null,
        });

        const learner = await db.learnerProfile.findUnique({ where: { id: learnerId } });

        return {
          success: true,
          message: existing ? "Learner updated successfully" : "Learner created successfully",
          Learner: learner,
        };
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        console.log("Failed to save learner information", error);
        throw new GraphQLError(`Failed to save learner information: ${error.message}`);
      }
    },
  }
};

export default learnerResolvers;
