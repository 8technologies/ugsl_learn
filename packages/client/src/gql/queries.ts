import { gql } from "@apollo/client";

export const LOAD_USERS = gql`
  query Users($limit: Int, $offset: Int, $search: String, $roleId: String) {
    users(limit: $limit, offset: $offset, search: $search, roleId: $roleId) {
      id
      username
      name
      email
      roleId
      role {
        id
        name
      }
      createdAt
    }
  }
`;

// `learner` with no args returns the signed-in user's profile (null if none)
export const MY_LEARNER_PROFILE = gql`
  query MyLearnerProfile($userId: ID!) {
    user(id: $userId) {
      id
      role {
        id
        name
      }
    }
    learner {
      id
      hearingStatus
      preferredLanguage
    }
  }
`;

export const MY_PROFILE = gql`
  query MyProfile($userId: ID!) {
    user(id: $userId) {
      id
      email
      username
      name
      createdAt
      role {
        id
        name
      }
    }
    learner {
      id
      hearingStatus
      preferredLanguage
      stats {
        totalXp
        currentStreak
        longestStreak
        hearts
      }
    }
  }
`;

export const ROLES = gql`
  query Roles {
    roles {
      id
      name
      description
      permissions
    }
  }
`;
