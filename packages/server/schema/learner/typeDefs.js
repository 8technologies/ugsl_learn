const learnerTypeDefs = `#graphql
  
 type Learner {
        id: ID!
        name: String!,
        description: String,
        permissions: JSON
    }

`;

export default learnerTypeDefs;