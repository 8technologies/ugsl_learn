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
