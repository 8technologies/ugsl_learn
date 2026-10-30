const quizTypeDefs = `#graphql
    scalar DateTime
    scalar Upload

    # The test learners take after finishing a lesson's units
     type Quiz {
        id: ID!
        lessonId: Int
        # Percentage of questions a learner must get right to pass
        passThreshold: Int,
        status: String
        createdAt: DateTime
        updatedAt: DateTime
        quizQuestions: [QuizQuestion!]
    }

    type QuizAttempt {
        id: ID!
        learnerId: String
        learner:     Learner
        quizId:      Int
        quiz:        Quiz
        score:       Float
        startedAt:   DateTime
        completedAt: DateTime
    }

    type QuizQuestion {
        id: Int!
        quizId: Int!
        quiz: Quiz!
        # watch_match, multiple_choice, sign_recall, video_record or fill_blank
        questionType: String!
        prompt: String
        mediaRef: String
        sequence: Int!
        # Answer for question types that don't use QuizOption.correctFlag (sign id, text, etc.)
        correctAnswer: JSON
        createdAt: DateTime!
        updatedAt: DateTime!

        Options: [QuizOption!]
    }

    type QuizOption {
        id: Int!
        questionId: Int!
        question: QuizQuestion!
        label: String
        mediaRef: String
        # TODO: "correct_flag/score rule": simple boolean, or JSON for partial-credit scoring?
        correctFlag: Boolean!
        createdAt: DateTime!
        updatedAt: DateTime!
    }

    extend type Query {
        lessonQuiz(lessonId: Int): [Quiz!]!
    }

    extend type Mutation {
        saveQuiz(input: quizInput!): ResponseMessage!
        saveQuizQuestion(input: quizQuestionInput!): ResponseMessage!
        deleteQuizQuestion(id: ID!): ResponseMessage!

        saveQuizAttempt(input: attemptInput!): ResponseMessage!
    }

    # XP, streaks, lesson and module progress are worked out on the server
    input attemptInput {
        quizId: Int!
        lessonId: Int!
        # Percentage of questions answered correctly (0-100)
        score: Float!
        # Answers and timing, kept on the learner's lesson progress
        metadata: JSON
        # Hearts left after the quiz; omit to leave them unchanged
        hearts: Int
    }

    input quizInput {
        id: ID
        lessonId: Int
        passThreshold: Int
        status: String
    }

    input quizQuestionInput {
        id: ID
        quizId: Int
        questionType: String
        prompt: String
        # Omit on create to put the question at the end of the quiz
        sequence: Int
        correctAnswer: JSON
        # New sign video for the question; omit to keep the current one
        video: Upload
        # True drops the question's current video
        removeMedia: Boolean
        # Replaces the question's options; omit to leave them unchanged
        options: [quizOptionInput!]
    }

    input quizOptionInput {
        # Omit for a new option
        id: ID
        label: String
        correctFlag: Boolean
        # New sign video for the option; omit to keep the current one
        video: Upload
    }

`;

export default quizTypeDefs;
