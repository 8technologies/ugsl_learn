const roleTypeDefs = `#graphql
    scalar Date
    scalar JSON
    type Role {
        id: ID!
        name: String!,
        description: String,
        permissions: JSON
    }

    extend type Query {
        roles: [Role!]!
    }

    extend type Mutation {
        saveRole(payload: RoleInput!): RoleResponseMessage
        deleteRole(role_id: ID!): ResponseMessage
        updateRolePermissions(payload: RolePermissionInput!): ResponseMessage 
    }

    input RoleInput {
        id: ID
        role_name: String!
        description: String
    }

    input RolePermissionInput {
        role_id: ID!
        permissions: JSON!
    }


    type RoleResponseMessage {
        success: Boolean
        message: String
        data: Role
    }

`;

export default roleTypeDefs;
