# Yoga server

This new server preserves the reference project's JavaScript ESM module layout:

```text
server.js → app.js → schema/index.js
                         ├── shared/typeDefs.js
                         ├── response/typeDefs.js
                         ├── health/{typeDefs,resolvers}.js
                         └── user/{typeDefs,resolvers}.js
context.js → config/database.js → Prisma → MySQL
```

`schema/index.js` recursively discovers default exports in every `typeDefs.js` and
`resolvers.js` under `schema/`, merges them with GraphQL Tools, and builds Yoga's
executable schema. It exports `typeDefs`, `resolvers`, and `schema`, just like the
reference. Imports run once, in sorted order; broken imports fail startup with the
filename instead of silently omitting a feature. No manual module registration is needed.

## Configuration

The ignored `packages/server/.env` holds local settings; `.env.example` is the
shareable template. Environment variables set by the shell take precedence.

| Variable | Purpose |
| --- | --- |
| `HOST` | Bind address; defaults to `127.0.0.1` |
| `PORT` | HTTP port; defaults to `4000` |
| `NODE_ENV` | `production` disables GraphiQL |
| `DATABASE_URL` | `mysql://USER:PASSWORD@HOST:PORT/DATABASE` |
| `DB_CONNECTION_LIMIT` | Prisma adapter pool size; defaults to `5` |

Percent-encode special characters in database usernames/passwords. The supplied
local configuration uses XAMPP's root account with an empty password. Use a
dedicated database account for deployment. This local URL configuration supports
host, port, user, password, and database; configure adapter TLS options explicitly
in `config/database.js` when connecting to a remote database requiring TLS.

Prisma uses its MySQL provider for XAMPP MariaDB. Both the CLI and runtime read the
same `.env`. Prisma 7 uses `prisma.config.ts` for CLI configuration and the MariaDB
driver adapter at runtime. Node.js loads the generated TypeScript client directly
while feature modules remain JavaScript. Generated client files are ignored and
recreated by `db:generate`.

## Database workflow

Run these commands from the project root:

```sh
# Install and generate after cloning:
npm install
npm run db:generate

# Apply committed migrations on a fresh database (also the deployment command):
npm run db:deploy
npm run db:seed

# After editing prisma/schema.prisma, create and apply a development migration:
npm run db:migrate -- --name describe_your_change
npm run db:generate

npm run db:status
npm run db:studio
```

Commit `schema.prisma`, the migration SQL folders, and the lockfile together.
Development migrations require permission to create a shadow database. Use
`db:deploy` for existing committed migrations; it does not require a shadow database.
Seeding is explicit and idempotently creates `learner@example.com`.

## Try the User API

```graphql
mutation {
  createUser(input: { name: "Alex", email: "alex@example.com" }) {
    id
    name
    email
    createdAt
  }
}
```

```graphql
query {
  health { success message }
  users(limit: 20, offset: 0) { id name email createdAt updatedAt }
}
```

Use the returned ID with `user(id: ...)`, `updateUser(id: ..., input: ...)`, and
`deleteUser(id: ...)`. Names are trimmed, emails are normalized to lowercase, and
duplicate email writes return `CONFLICT`. Missing update/delete targets return
`NOT_FOUND`; a missing single-user query returns null. Lists support bounded
pagination. Dates are ISO strings.

This User model is an example CRUD resource, not an authentication system. It has
no passwords, login, or authorization. The local starter's operations are public.

## Add the next feature

1. Add a model or relation in `prisma/schema.prisma`, migrate, and regenerate.
2. Create `schema/your_feature/typeDefs.js` with a default-exported GraphQL string.
   Use `extend type Query` and `extend type Mutation` to add operations.
3. Create `schema/your_feature/resolvers.js` with a default-exported resolver map.
   Access Prisma as the third argument, e.g. `(_parent, args, { db })`.
4. Restart the server after adding new files so discovery runs again.

Nested feature folders work too. Shared output types belong in `schema/shared` or
`schema/response`. Resolver context exposes `db`, Fetch `request`, and Node `req`/`res`.
When adding authentication, verify credentials in the context/middleware before
exposing a user identity to resolvers.

Keep feature-specific helpers alongside that feature's resolvers. Extract services
when business logic grows; keep transport setup out of feature modules. `config/`
owns infrastructure, `prisma/` owns persistence models and migration history, and
`test/` owns automated checks. GraphQL type definitions describe the public API;
Prisma models describe database tables.

## Verification

```sh
npm test
npm run test:integration
```

The default suite checks schema discovery, merged operations, and input validation
without database queries. The integration suite exercises User CRUD against the
configured database, using a unique example email and cleaning up its own row.

The reference application's business modules, uploads, jobs, authentication, and
WebSocket subscriptions were not copied into this starter.

References: [Yoga setup](https://the-guild.dev/graphql/yoga-server/docs),
[Prisma documentation](https://www.prisma.io/docs/orm).
