// import { existsSync } from "node:fs";
// import { fileURLToPath } from "node:url";


// const envFile = fileURLToPath(new URL("../.env", import.meta.url));
// if (existsSync(envFile)) process.loadEnvFile(envFile);

export const host = process.env.HOST || "127.0.0.1";

export const PRIVATE_KEY = "Ugsl_learn@2026";

export const port = Number(process.env.PORT || 4000);

// Where the web app runs; used to build links in emails
export const CLIENT_URL = (process.env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "");

export const isProduction = process.env.NODE_ENV === "production";

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}