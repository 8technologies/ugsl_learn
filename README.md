


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

