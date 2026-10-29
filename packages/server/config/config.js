import "dotenv/config";

export const host = process.env.HOST || "127.0.0.1";

export const PRIVATE_KEY = process.env.JWT_SECRET;

export const port = Number(process.env.PORT || 4000);

// Where the web app runs; used to build links in emails
export const CLIENT_URL = (process.env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "");

export const isProduction = process.env.NODE_ENV === "production";

export const corsOrigins = (process.env.CORS_ORIGINS || CLIENT_URL)
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

if (!PRIVATE_KEY) {
  throw new Error("JWT_SECRET is required.");
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}
