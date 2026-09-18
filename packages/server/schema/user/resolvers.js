import { GraphQLError } from "graphql";
import checkPasswordStrength from "../../helpers/password_strength.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PRIVATE_KEY } from "../../config/config.js";

function badInput(message) {
  return new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });
}

async function  userData(input) {
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
  if (input.username !== undefined) {
    if (typeof input.username !== "string") throw badInput("Username is required.");
    data.username = input.username.trim().toLowerCase();
    // if (data.email.length > 191 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    //   throw badInput("Enter a valid email address (up to 191 characters).");
    // }
  }
  if (input.roleId){
    data.roleId = input.roleId;
  }
  //hash password
  if (input.password !== undefined) {
    if (typeof input.password !== "string") throw badInput("Password is required.");

    // enforce password strength before hashing
        const { isValid, errors } = checkPasswordStrength(input.password);
        if (!isValid) {
          throw badInput(errors.join(", "));
        }

        // generate unique password for employee
        // data.password = await Bun.password.hash(input.password);
        const salt = await bcrypt.genSalt();
        const hashedPwd = await bcrypt.hash(input.password, salt);

        data.password = hashedPwd

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

async function loginUser ({ email, password, user_id, context }) {
  try {
    const identifier = String(email || "").trim().toLowerCase();

    const user = await context.db.user.findFirst({
      where: {
        deleted: false,
        ...(identifier ? { email: identifier } : {}),
        ...(user_id ? { id: user_id } : {}),
      },
      include: { role: true },
    });

    if (!user) throw new GraphQLError("Invalid email or password");

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) throw new GraphQLError("Invalid email or password");

    const tokenData = {
      id: user.id,
      email: user?.email || null,
      permissions: user.role?.permissions ?? null,
    };

    const token = jwt.sign(tokenData, PRIVATE_KEY, {
      expiresIn: "1d",
    });

    context.res.setHeader("x-auth-token", `Bearer ${token}`);

    return {
      success: true,
      message: "Login Successful",
      user: user,
      token,
    };
  } catch (error) {
    throw new GraphQLError(error.message);
  }
};

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
    createUser: (_parent, { input }, { db }) =>
      writeUser(async () => db.user.create({ data: await userData(input) })),

    //Login
    login: async (parent, args, context) => {
      const result = await loginUser({
        email: args.email,
        password: args.password,
        context,
      });

      return result;
    },


    updateUser: (_parent, { id, input }, { db }) =>
      writeUser(async () => db.user.update({ where: { id }, data: await userData(input) })),
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
