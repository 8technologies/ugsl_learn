const learnerTypeDefs = `#graphql
    scalar DateTime

    type Learner {
        id: ID!
        userId: String!
        user: User
        hearingStatus: String
        preferredLanguage: String
        preferences: JSON
        createdAt: DateTime!
        updatedAt: DateTime!

        quizAttempts: [QuizAttempt!]!
        progress: [LearnerProgress!]!
        favourites: [Favourite!]!
        badges: [LearnerBadge!]!
        activity: [LearnerActivity!]!
        moduleProgress: [LearnerModuleProgress!]!
        questionAttempts: [QuestionAttempt!]!
        stats: LearnerStats
        xpTransactions: [XpTransaction!]!
        dailyChallenges: [LearnerDailyChallenge!]!
    }

    type LearnerProgress {
        id: ID!
        learnerId: String!
        lessonId: Int!
        status: String!
        score: Int
        metadata: JSON
        completedAt: DateTime
        syncRef: String
        createdAt: DateTime!
        updatedAt: DateTime!
    }

    enum ModuleStatus {
        locked
        available
        in_progress
        completed
    }

    type LearnerModuleProgress {
        id: ID!
        learnerId: String!
        moduleId: Int!
        status: ModuleStatus!
        completedAt: DateTime
        createdAt: DateTime!
        updatedAt: DateTime!
    }

    type QuestionAttempt {
        id: ID!
        learnerId: String!
        questionId: Int!
        givenAnswer: JSON
        isCorrect: Boolean
        attemptedAt: DateTime!
    }

    type Favourite {
        learnerId: String!
        entityType: String!
        entityId: String!
        createdAt: DateTime!
    }

    type Badge {
        id: ID!
        name: String!
        description: String
        criteria: JSON
        status: String!
    }

    type LearnerBadge {
        learnerId: String!
        badgeId: Int!
        badge: Badge
        earnedAt: DateTime!
    }

    type LearnerActivity {
        id: ID!
        learnerId: String!
        activityDate: DateTime!
        event: String
        points: Int
        maintained: Boolean!
        streakState: JSON
        createdAt: DateTime!
    }

    type LearnerStats {
        learnerId: String!
        totalXp: Int!
        currentStreak: Int!
        longestStreak: Int!
        hearts: Int!
        lastActiveDate: DateTime
        updatedAt: DateTime!
    }

    type XpTransaction {
        id: ID!
        learnerId: String!
        amount: Int!
        sourceType: String!
        sourceId: String
        createdAt: DateTime!
    }

    type DailyChallenge {
        id: ID!
        date: DateTime!
        targetCount: Int!
        xpReward: Int!
    }

    type LearnerDailyChallenge {
        learnerId: String!
        challengeId: Int!
        challenge: DailyChallenge
        currentCount: Int!
        completedAt: DateTime
    }

    input saveLearnerInput {
        id: ID
        hearingStatus: String
        preferredLanguage: String
        preferences: JSON
    }

    extend type Query {
        learners(limit: Int = 20, offset: Int = 0, search: String): [Learner!]!
        # Look up by learner id or user id; with neither, returns the signed-in user's profile
        learner(id: ID, userId: ID): Learner
    }

    extend type Mutation {
        SaveLearner(input: saveLearnerInput!): LearnerResponse!
    
    }

    

    
`;

export default learnerTypeDefs;
