
# UGSL Learn

A modular GraphQL server using GraphQL Yoga, Prisma ORM, and MySQL/MariaDB.
Feature modules keep their type definitions and resolvers separate while the server
discovers and merges them automatically. The initial User API demonstrates persisted
CRUD operations and provides a clean pattern for adding future modules.

## Requirements

- Node.js 22.12 or newer; Node.js 24 LTS is recommended.
- npm.
- MySQL or MariaDB. Local development uses XAMPP and a database named `ugsl_learn`.
- A database account that can apply migrations. Creating development migrations
  also requires permission to create a Prisma shadow database.

All commands below run from the repository root.

## Project structure

```text
packages/server/
├── server.js           # HTTP listener, startup, and graceful shutdown
├── app.js              # GraphQL Yoga configuration
├── context.js          # Per-request services available to resolvers
├── config/
│   ├── config.js       # Environment loading and server settings
│   └── database.js     # Shared Prisma client and connection pool
├── prisma.config.ts    # Prisma CLI, migration, and seed configuration
├── prisma/
│   ├── schema.prisma   # Database models
│   ├── migrations/     # Committed migration history
│   └── seed.js         # Idempotent example data
├── schema/
│   ├── index.js        # Merge modules and build the executable schema
│   ├── loadModules.js  # Recursive typeDefs/resolvers discovery
│   ├── shared/         # Base GraphQL operation types
│   ├── response/       # Reusable response types
│   ├── health/         # Health query
│   └── user/           # User type definitions and resolvers
└── test/               # Schema and database integration tests
```

Generated Prisma code, installed dependencies, `.env`, logs, and local tool metadata
are ignored by Git.

## First local setup after cloning

1. Clone your GitHub repository and open its root directory.
2. Start MySQL in XAMPP.
3. Install dependencies and create local configuration:

   ```sh
   npm ci
   cp packages/server/.env.example packages/server/.env
   ```

4. Edit `packages/server/.env` with your connection details:

   ```dotenv
   HOST=127.0.0.1
   PORT=4000
   NODE_ENV=development
   DATABASE_URL="mysql://root:@127.0.0.1:3306/ugsl_learn"
   DB_CONNECTION_LIMIT=5
   ```

5. Generate the client, apply the committed migrations, and add example data:

   ```sh
   npm run db:generate
   npm run db:deploy
   npm run db:seed
   npm run db:status
   npm test
   npm run test:integration
   npm run dev
   ```

Prisma can create the database if it does not exist and the database account has
the required permission. Otherwise create `ugsl_learn` through your database
administrator first. The provided local account assumes XAMPP's empty root password.
Keep your real credentials in `.env` or your deployment platform's environment settings.

Open [GraphiQL](http://127.0.0.1:4000/graphql). Try:

```graphql
query {
  health { success message }
  users { id name email }
}
```

The seed creates `learner@example.com`. See the [server guide](packages/server/README.md)
for User mutations and instructions for adding feature modules.

## After changing a database model

Edit `packages/server/prisma/schema.prisma`, then run:

```sh
npm run db:migrate -- --name describe_your_change
npm run db:generate
npm test
npm run test:integration
```

`db:migrate` creates a versioned SQL migration and applies it to your development
database. `db:generate` updates the client used by the server; Prisma 7 requires
this separate step. Restart the server after regenerating the client.

Commit the model changes, generated migration folder, application changes, and any
updated `package-lock.json` together. Do not edit migrations already applied to a
shared database; create a new migration for the next change.

## After pulling project updates

```sh
npm ci
npm run db:generate
npm run db:deploy
npm run db:status
npm test
npm run dev
```

Use `db:deploy` to apply migrations committed by other developers. Run `db:seed`
again only if you want to restore the example user; it is safe to repeat.

## Deployment

Provision a MySQL/MariaDB database and configure these environment variables on
the deployment platform:

```dotenv
NODE_ENV=production
HOST=0.0.0.0
PORT=4000
DATABASE_URL="mysql://APP_USER:ENCODED_PASSWORD@DB_HOST:3306/ugsl_learn"
DB_CONNECTION_LIMIT=5
```

Use the platform-provided `PORT` when applicable. Percent-encode special characters
in credentials. Configure TLS in `config/database.js` if your database provider
requires it; the starter's connection configuration targets local XAMPP.

Run the following in the release/build environment using the target database URL:

```sh
# Include the Prisma CLI, even when NODE_ENV is production.
npm ci --include=dev
npm run db:generate

# Run once per release against the target database, before starting the new app.
npm run db:deploy
npm run db:status

# Runtime start command:
npm start
```

Keep the generated `packages/server/generated/prisma/` directory in the deployment
artifact. Node.js loads Prisma's generated TypeScript client directly, so the
application does not need a separate compilation step.

Use `db:deploy` in production. `db:migrate` is the interactive development command.
Seeding is optional and is not part of the production startup sequence. On later
deployments, repeat the release commands, then restart the running application
using your host's process manager or service controls.

GraphiQL is disabled in production. Verify the endpoint with:

```sh
curl http://127.0.0.1:4000/graphql \
  -H 'Content-Type: application/json' \
  --data '{"query":"{ health { success message } }"}'
```

The health query verifies API availability; the integration tests exercise actual
database reads and writes. This starter implements public User CRUD, not login or
authorization. Add access control before exposing user management publicly.

## Command reference

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the server with file watching |
| `npm start` | Start the server without file watching |
| `npm test` | Run checks that do not query the database |
| `npm run test:integration` | Run all checks, including database CRUD |
| `npm run db:generate` | Generate Prisma Client from the current models |
| `npm run db:migrate -- --name change_name` | Create and apply a development migration |
| `npm run db:deploy` | Apply committed migrations |
| `npm run db:status` | Check migration status |
| `npm run db:seed` | Create the example user if it is absent |
| `npm run db:studio` | Open Prisma Studio |

## Publishing to GitHub

Commit source files, both READMEs, `.env.example`, package manifests,
`package-lock.json`, and `prisma/migrations/`. Do not commit `.env`, `node_modules`,
generated Prisma files, logs, or editor/tool metadata. Review staged files before
pushing to ensure real credentials are not included.
