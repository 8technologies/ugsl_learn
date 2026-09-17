import { GraphQLError } from "graphql";

function badInput(message) {
  return new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });
}

function userData(input) {
  const data = {};
  if (input.name !== undefined) {
    if (typeof input.name !== "string" || !input.name.trim() || input.name.trim().length > 100) {
      throw badInput("Name must contain 1 to 100 characters.");
    }
    data.name = input.name.trim();
  }
  if (input.email !== undefined) {
    if (typeof input.email !== "string") throw badInput("Email is required.");
    data.email = input.email.trim().toLowerCase();
    if (data.email.length > 191 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw badInput("Enter a valid email address (up to 191 characters).");
    }
  }
  if (!Object.keys(data).length) throw badInput("Provide a name or email to update.");
  return data;
}

async function writeUser(operation) {
  try {
    return await operation();
  } catch (error) {
    if (error.code === "P2002") {
      throw new GraphQLError("A user with this email already exists.", { extensions: { code: "CONFLICT" } });
    }
    if (error.code === "P2025") {
      throw new GraphQLError("User not found.", { extensions: { code: "NOT_FOUND" } });
    }
    throw error;
  }
}

const userResolvers = {
  Query: {
    users: (_parent, { limit, offset }, { db }) => {
      if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0) {
        throw badInput("Limit must be 1–100 and offset must be zero or greater.");
      }
      return db.user.findMany({ take: limit, skip: offset, orderBy: [{ createdAt: "desc" }, { id: "asc" }] });
    },
    user: (_parent, { id }, { db }) => db.user.findUnique({ where: { id } }),
  },
  Mutation: {
    createUser: (_parent, { input }, { db }) => writeUser(() => db.user.create({ data: userData(input) })),
    updateUser: (_parent, { id, input }, { db }) => writeUser(() => db.user.update({ where: { id }, data: userData(input) })),
    deleteUser: (_parent, { id }, { db }) => writeUser(async () => {
      await db.user.delete({ where: { id } });
      return { success: true, message: "User deleted." };
    }),
  },
  User: {
    createdAt: (user) => user.createdAt.toISOString(),
    updatedAt: (user) => user.updatedAt.toISOString(),
  },
};

export default userResolvers;
