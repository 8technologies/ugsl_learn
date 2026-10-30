import { gql } from "@apollo/client";

// User management against the UGSL server's user schema

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

export const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      email
      username
      name
      roleId
    }
  }
`;

export const UPDATE_USER = gql`
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      email
      username
      name
      roleId
    }
  }
`;

export const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id) {
      success
      message
    }
  }
`;
