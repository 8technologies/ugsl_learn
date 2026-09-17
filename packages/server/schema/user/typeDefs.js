const userTypeDefs = `#graphql
  type User {
    id: ID!
    email: String!
    name: String!
    createdAt: String!
    updatedAt: String!
  }

  input CreateUserInput {
    email: String!
    name: String!
  }

  input UpdateUserInput {
    email: String
    name: String
  }

  extend type Query {
    users(limit: Int = 20, offset: Int = 0): [User!]!
    user(id: ID!): User
  }

  extend type Mutation {
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): ResponseMessage!
  }
`;

export default userTypeDefs;
