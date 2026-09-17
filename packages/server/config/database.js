import "./config.js";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client.ts";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required in packages/server/.env");
const url = new URL(process.env.DATABASE_URL);
if (url.protocol !== "mysql:") throw new Error("DATABASE_URL must use mysql://");
const connectionLimit = Number(process.env.DB_CONNECTION_LIMIT || 5);
if (!Number.isInteger(connectionLimit) || connectionLimit < 1) {
  throw new Error("DB_CONNECTION_LIMIT must be a positive integer.");
}

const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: decodeURIComponent(url.pathname.slice(1)),
  connectionLimit,
  connectTimeout: 5000,
});

export const db = new PrismaClient({ adapter });
