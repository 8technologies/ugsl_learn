import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, after } from "node:test";
import { yoga } from "../app.js";
import { db } from "../config/database.js";
import { loadModules } from "../schema/loadModules.js";

after(() => db.$disconnect());

async function graphql(query, variables) {
  const response = await yoga.fetch("http://localhost/graphql", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  return response.json();
}

test("merges shared output types and feature query/mutation definitions", async () => {
  const result = await graphql('{ health { success } __type(name: "Mutation") { fields { name } } }');
  assert.equal(result.errors, undefined);
  assert.equal(result.data.health.success, true);
  const mutations = result.data.__type.fields.map((field) => field.name);
  for (const name of ["createUser", "updateUser", "deleteUser"]) {
    assert.ok(mutations.includes(name));
  }
});

test("rejects invalid user input before database writes", async () => {
  const result = await graphql('mutation { createUser(input: { email: "invalid", name: "Test" }) { id } }');
  assert.equal(result.errors[0].extensions.code, "BAD_USER_INPUT");
  const page = await graphql('{ users(limit: 101) { id } }');
  assert.equal(page.errors[0].extensions.code, "BAD_USER_INPUT");
});

test("discovers new nested modules and reports broken imports", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ugsl-schema-"));
  try {
    await writeFile(join(directory, "package.json"), '{"type":"module"}');
    const nested = join(directory, "feature", "nested");
    await mkdir(nested, { recursive: true });
    await writeFile(join(nested, "typeDefs.js"), 'export default "type Query { example: String }";');
    await writeFile(join(nested, "resolvers.js"), 'export default { Query: { example: () => "loaded" } };');
    const modules = await loadModules(directory);
    assert.equal(modules.typeDefs.length, 1);
    assert.equal(modules.resolvers[0].Query.example(), "loaded");
    await mkdir(join(directory, "broken"));
    await writeFile(join(directory, "broken", "resolvers.js"), 'throw new Error("broken module");');
    await assert.rejects(loadModules(directory), /Failed to load schema module/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("User CRUD persists through Prisma and handles conflicts", { skip: process.env.RUN_DB_TESTS !== "1" }, async () => {
  const email = `integration-${randomUUID()}@example.com`;
  let id;
  try {
    const created = await graphql('mutation($input: CreateUserInput!) { createUser(input: $input) { id email name createdAt } }', {
      input: { email: email.toUpperCase(), name: " Test Learner " },
    });
    assert.equal(created.errors, undefined, JSON.stringify(created));
    id = created.data.createUser.id;
    assert.equal(created.data.createUser.email, email);
    assert.equal(created.data.createUser.name, "Test Learner");
    assert.ok(!Number.isNaN(Date.parse(created.data.createUser.createdAt)));
    assert.equal((await db.user.findUnique({ where: { id } })).email, email);

    const duplicate = await graphql('mutation($input: CreateUserInput!) { createUser(input: $input) { id } }', {
      input: { email, name: "Duplicate" },
    });
    assert.equal(duplicate.errors[0].extensions.code, "CONFLICT");
    const read = await graphql('query($id: ID!) { user(id: $id) { email } }', { id });
    assert.equal(read.data.user.email, email);
    const updated = await graphql('mutation($id: ID!) { updateUser(id: $id, input: { name: "Updated" }) { name } }', { id });
    assert.equal(updated.data.updateUser.name, "Updated");
    const deleted = await graphql('mutation($id: ID!) { deleteUser(id: $id) { success } }', { id });
    assert.equal(deleted.data.deleteUser.success, true);
    const missing = await graphql('mutation($id: ID!) { deleteUser(id: $id) { success } }', { id });
    assert.equal(missing.errors[0].extensions.code, "NOT_FOUND");
    assert.equal(await db.user.findUnique({ where: { id } }), null);
  } finally {
    await db.user.deleteMany({ where: { email } });
  }
});
