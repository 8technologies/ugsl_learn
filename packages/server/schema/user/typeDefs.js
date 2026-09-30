const userTypeDefs = `#graphql
  scalar Upload

  type User {
    id: ID!
    email: String!
    username: String!
    name: String!
    password: String!
    roleId: String
    role: Role
    createdAt: String!
    updatedAt: String!
  }

  input CreateUserInput {
    email: String!
    username: String!
    name: String!
    password: String!
    roleId: String!
    Image: Upload
  } 

  input RegisterInput {
    email: String!
    username: String!
    name: String!
    password: String!
  } 

  input UpdateUserInput {
    email: String
    name: String
    username: String
    roleId: String
    password: String
  }

  extend type Query {
    users(limit: Int = 20, offset: Int = 0, search: String, roleId: String): [User!]!
    user(id: ID!): User
  }

  type Mutation {
        login(email: String!, password: String!) :UserLoginResponse!
        changeMyPassword(newPassword: String!): UserLoginResponse!
        createUser(input: CreateUserInput!): User!
        register(payload: RegisterInput!): UserResponse!
        updateUser(id: ID!, input: UpdateUserInput!): User!
        deleteUser(id: ID!): ResponseMessage!
        toggleUserStatus(id: ID!): UserResponse!
        requestPasswordResetLink(email: String!): UserResponse!
        resetPassword(id: String!, newPassword: String!): UserResponse!
        resetPasswordWithToken(token: String!, newPassword: String!): UserResponse!
        
        deleteAccount(password: String!): UserResponse!
    }
`;

export default userTypeDefs;
