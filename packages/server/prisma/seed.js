import { db } from "../config/database.js";

try {
  const user = await db.user.upsert({
    where: { email: "learner@example.com" },
    update: {},
    create: { email: "learner@example.com", name: "Example Learner" },
  });
  console.info(`Example user ready: ${user.email}`);
} finally {
  await db.$disconnect();
}
