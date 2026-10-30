# UgSL Learn

UgSL Learn contains three deployable services:

- packages/server: Bun, Express, GraphQL Yoga, Prisma, and MariaDB API
- packages/client: Next.js learner application
- packages/client-admin: Vite administration application

The repository uses Bun 1.3.5 and its root lockfile as the reproducible package
manager for local validation, containers, and CI.

## Local validation

~~~sh
bun install --frozen-lockfile
cp packages/server/.env.example packages/server/.env
bun run --cwd packages/server db:generate
bun run check
~~~

The API tests do not require a live database unless RUN_DB_TESTS=1 is set.

## Deployment model

The production baseline is Docker Compose on a Linux host:

- MariaDB data is stored in the database-data volume.
- API uploads are stored in the uploaded-media volume.
- learner, admin, and API ports bind to loopback so a host-level reverse proxy
  can provide domains and TLS.
- database migrations run as a one-off task before updated services start.
- images use the Git commit SHA, so a previous release can be restored by
  changing IMAGE_TAG.

Copy the production environment template on the server:

~~~sh
mkdir -p /opt/ugsl-learn
cd /opt/ugsl-learn
cp .env.production.example .env.production
~~~

Fill every secret and replace the example domains. If the GitHub Container
Registry packages are private, log the deployment server into GHCR with a
read-packages token:

~~~sh
docker login ghcr.io
~~~

For a manual deployment from a checkout:

~~~sh
IMAGE_REPOSITORY=ghcr.io/8technologies/ugsl_learn \
IMAGE_TAG=<git-commit-sha> \
sh scripts/deploy.sh
~~~

The host needs Docker Engine with the Compose plugin. Put a reverse proxy in
front of:

- 127.0.0.1:3000 for the learner domain
- 127.0.0.1:8080 for the admin domain
- 127.0.0.1:4000 for the API domain

## GitHub Actions CI/CD

The .github/workflows/ci-cd.yml workflow runs API tests and production builds on
pull requests to main. A push to main also publishes three images to
GHCR. Staging deployment is enabled only when the repository variable
DEPLOY_ENABLED equals true.

Configure these GitHub repository variables:

| Variable | Example |
| --- | --- |
| PRODUCTION_API_URL | https://api.staging.8jobspot.com |
| PRODUCTION_GRAPHQL_URL | https://api.staging.8jobspot.com/graphql |
| DEPLOY_PATH | /opt/ugsl-learn |
| DEPLOY_ENABLED | true after the server is prepared |

Configure these secrets in the protected staging environment:

| Secret | Purpose |
| --- | --- |
| DEPLOY_HOST | Deployment server hostname or IP |
| DEPLOY_USER | SSH user allowed to run Docker |
| DEPLOY_SSH_KEY | Private deployment key |
| DEPLOY_KNOWN_HOSTS | Verified ssh-keyscan output for that server |

Keep .env.production only on the server. GitHub does not upload or replace it.
Use required reviewers on the staging environment if deployments should
pause for approval after images are built.

The admin application currently bundles successfully but has inherited
TypeScript errors, so its standalone typecheck is not yet a CI gate. Track that
cleanup separately and add the typecheck command to CI once the existing errors
are resolved.
