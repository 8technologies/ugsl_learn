const responseTypeDefs = `#graphql
  type ResponseMessage {
    success: Boolean!
    message: String!
  }

  type UserResponse {
      success: Boolean!
      message: String
      user: User
  }

  type UserLoginResponse {
      success: Boolean!
      message: String
      token: String!
      user: User
  }

  type LearnerResponse {
    success: Boolean!
    message: String
    Learner: Learner
  }
`;

export default responseTypeDefs;
