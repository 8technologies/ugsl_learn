import { createServer } from "node:http";
import { yoga } from "./app.js";
import { host, port } from "./config/config.js";
import { db } from "./config/database.js";

await db.$connect();

const server = createServer(yoga);

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
