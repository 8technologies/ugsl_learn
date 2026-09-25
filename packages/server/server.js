import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { yoga } from "./app.js";
import { host, port } from "./config/config.js";
import { db } from "./config/database.js";
import express from "express"
import cors from "cors";
import rateLimit from "express-rate-limit";
import graphqlUploadExpress from "graphql-upload/graphqlUploadExpress.mjs";


await db.$connect();

// Required logic for integrating with Express
const app = express();

app.use((req, res, next) => {
  const incomingRequestId = req.headers["x-request-id"];
  req.requestId =
    typeof incomingRequestId === "string" &&
    /^[a-zA-Z0-9._:-]{1,128}$/.test(incomingRequestId)
      ? incomingRequestId
      : randomUUID();
  res.setHeader("x-request-id", req.requestId);
  next();
});

app.use(express.static("public"));
app.use(cors({ origin: "*", exposedHeaders: ["x-request-id"] }));
app.use(express.json());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, 
  standardHeaders: true,
  legacyHeaders: false,
  // skipSuccessfulRequests: true,
  skip: (req) => {
    const body = req.body ?? {};
    const operationName = body?.operationName || req.query?.operationName;
    const query =
      typeof body?.query === "string"
        ? body.query
        : typeof req.query?.query === "string"
          ? req.query.query
          : "";
    const isLoginOperation =
      operationName === "Login" || /\blogin\s*\(/i.test(query);

      console.log("[loginLimiter]", { operationName, isLoginOperation, willCount: isLoginOperation });
  
    return !isLoginOperation; 
  },
  handler: (_req, res) => {
    res.status(200).json({
      errors: [
        {
          message: "Too many login attempts. Please try again in 15 minutes.",
        },
      ],
    });
  },
});

app.use(
  yoga.graphqlEndpoint,
  cors({ origin: "*", exposedHeaders: ["x-request-id"] }),
  express.json(),
  loginLimiter,
  graphqlUploadExpress(),
  yoga
);

const server = createServer(app);

server.on("error", async (error) => {
  console.error("Server failed:", error);
  await db.$disconnect();
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.info(`GraphQL Yoga is running at http://${host}:${port}${yoga.graphqlEndpoint}`);
});

let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  const timeout = setTimeout(() => process.exit(1), 10_000);
  timeout.unref();
  server.close(async (error) => {
    try {
      await db.$disconnect();
      if (error) throw error;
      process.exitCode = 0;
    } catch (shutdownError) {
      console.error(shutdownError);
      process.exitCode = 1;
    } finally {
      clearTimeout(timeout);
    }
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
