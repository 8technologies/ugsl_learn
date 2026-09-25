const quizTypeDefs = `#graphql
     type Quiz {
        id: ID!
        name: String!,
        description: String,
        permissions: JSON
    }


`;

export default quizTypeDefs;