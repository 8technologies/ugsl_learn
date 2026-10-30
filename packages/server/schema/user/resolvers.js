import { GraphQLError } from "graphql";
import checkPasswordStrength from "../../helpers/password_strength.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PRIVATE_KEY } from "../../config/config.js";
import { db } from "../../config/database.js";
import { getRoles } from "../role/resolvers.js";
import { readVerificationToken, sendVerificationEmail } from "../../utils/emails/emailVerification.js";

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
    // if ( !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    //   throw badInput("Enter a valid email address (up to 191 characters).");
    // }
  }
  if (input.username !== undefined) {
    if (typeof input.username !== "string") throw badInput("Username is required.");
    data.username = input.username.trim().toLowerCase();
    
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

    // Checked after the password so this doesn't reveal which emails are registered
    if (!user.emailVerified) {
      throw new GraphQLError("Please verify your email before logging in. Check your inbox for the link.", {
        extensions: { code: "EMAIL_NOT_VERIFIED" },
      });
    }

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
    // Keep error codes (e.g. EMAIL_NOT_VERIFIED) so the client can react to them
    if (error instanceof GraphQLError) throw error;
    throw new GraphQLError(error.message);
  }
};

export const getUsers = async ({
  limit = 10,
  offset = 0,
  email,
  id,
  username,
  role_id,
  role_name,
  search,
}) => {
  try {
    const where = { deleted: false };

    if (email) where.email = email;
    if (id) where.id = id;
    if (username) where.username = username;
    if (role_id) where.roleId = role_id;
    if (role_name) where.role = { name: role_name };
    if (search) {
      where.OR = [
        { username: { contains: search } },
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    return await db.user.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    });
  } catch (error) {
    throw new GraphQLError(error.message);
  }
};


const userResolvers = {
  Query: {
    users: (_parent, { limit, offset, search, roleId }) => {
      if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0) {
        throw badInput("Limit must be 1–100 and offset must be zero or greater.");
      }
      return getUsers({ limit, offset, search, role_id: roleId });
    },
    user: (_parent, { id }, { db }) => db.user.findUnique({ where: { id } }),
    me: (_parent, _args, context) => {
      const userId = context.req?.user?.id;
      if (!userId) {
        throw new GraphQLError("Please sign in to continue.", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }
      return context.db.user.findFirst({ where: { id: userId, deleted: false } });
    },
  },
  Mutation: {
    // Accounts made by an admin are trusted, so they skip email verification
    createUser: (_parent, { input }, { db }) =>
      writeUser(async () =>
        db.user.create({
          data: { ...(await userData(input)), emailVerified: true, emailVerifiedAt: new Date() },
        }),
      ),

    //Login
    login: async (parent, args, context) => {
      const result = await loginUser({
        email: args.email,
        password: args.password,
        context,
      });

      return result;
    },

    //learner signup
    register: async (_parent, args) => {
      try {
        const { email, username, name, password } = args.payload;

        const normalizedEmail = String(email || "").trim().toLowerCase();
        const [existingByEmail] = await getUsers({ email: normalizedEmail, limit: 1 });
        if (existingByEmail) {
          throw new GraphQLError("A user with this email already exists.", {
            extensions: { code: "CONFLICT" },
          });
        }

        const normalizedUsername = String(username || "").trim().toLowerCase();
        const [existingByUsername] = await getUsers({ username: normalizedUsername, limit: 1 });
        if (existingByUsername) {
          throw new GraphQLError("This username is already taken.", {
            extensions: { code: "CONFLICT" },
          });
        }

        const [learnerRole] = await getRoles({ role_name: "Learner" });
        if (!learnerRole) {
          throw new GraphQLError("The default learner role is not configured yet.");
        }

        const data = await userData({ email, username, name, password });
        data.roleId = learnerRole.id;

        const user = await writeUser(() => db.user.create({ data }));

        // The account exists either way; if the email fails the user can ask for it again
        let emailSent = true;
        try {
          await sendVerificationEmail(user);
        } catch (error) {
          emailSent = false;
          console.error("Failed to send verification email", { userId: user.id, error: error?.message });
        }

        return {
          success: true,
          message: emailSent
            ? "Account created. We've sent a verification link to your email."
            : "Account created, but we couldn't send the verification email. Please request a new one.",
          user,
        };
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError(error.message);
      }
    },


    verifyEmail: async (_parent, { token }) => {
      const payload = readVerificationToken(token);
      if (!payload) {
        throw new GraphQLError("This verification link is invalid or has expired. Request a new one.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const user = await db.user.findUnique({ where: { id: payload.id } });
      // A changed email makes old links useless
      if (!user || user.deleted || user.email !== payload.email) {
        throw new GraphQLError("This verification link is no longer valid.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      if (!user.emailVerified) {
        await db.user.update({
          where: { id: user.id },
          data: { emailVerified: true, emailVerifiedAt: new Date() },
        });
      }

      return { success: true, message: "Your email is verified. You can now log in." };
    },

    resendVerificationEmail: async (_parent, { email }) => {
      const normalizedEmail = String(email || "").trim().toLowerCase();
      const [user] = normalizedEmail ? await getUsers({ email: normalizedEmail, limit: 1 }) : [];

      if (user && !user.emailVerified) {
        try {
          await sendVerificationEmail(user);
        } catch (error) {
          console.error("Failed to resend verification email", { userId: user.id, error: error?.message });
        }
      }

      // Same answer whether or not the account exists, so emails can't be probed
      return {
        success: true,
        message: "If that account exists and isn't verified yet, a new link is on its way.",
      };
    },

    updateMe: async (_parent, { input }, context) => {
      const userId = context.req?.user?.id;
      if (!userId) {
        throw new GraphQLError("Please sign in to continue.", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      // Only name and username are passed on, so role/email/password can't be changed here
      const data = await userData({ name: input.name ?? undefined, username: input.username ?? undefined });

      if (data.username) {
        const [taken] = await getUsers({ username: data.username, limit: 1 });
        if (taken && taken.id !== userId) {
          throw new GraphQLError("This username is already taken.", {
            extensions: { code: "CONFLICT" },
          });
        }
      }

      const user = await writeUser(() => db.user.update({ where: { id: userId }, data }));
      return { success: true, message: "Profile updated successfully.", user };
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
    role: (user) => (user.roleId ? db.role.findUnique({ where: { id: user.roleId } }) : null),
  },
};

export default userResolvers;
