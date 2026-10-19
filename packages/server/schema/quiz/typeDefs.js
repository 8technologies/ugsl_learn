const quizTypeDefs = `#graphql
     type Quiz {
        id: ID!
        name: String!,
        description: String,
        permissions: JSON
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


`;

export default quizTypeDefs;