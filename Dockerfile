# syntax=docker/dockerfile:1.7

FROM oven/bun:1.3.5-alpine AS workspace
WORKDIR /app

COPY package.json bun.lock ./
COPY packages/server/package.json packages/server/package.json
COPY packages/client/package.json packages/client/package.json
COPY packages/client-admin/package.json packages/client-admin/package.json

FROM workspace AS api-dependencies
RUN bun install --frozen-lockfile --filter @ugsl/server

FROM api-dependencies AS api-build
COPY packages/server packages/server
RUN DATABASE_URL=mysql://build:build@127.0.0.1:3306/build \
    bun run --cwd packages/server db:generate

FROM oven/bun:1.3.5-alpine AS api
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4000

COPY --from=api-build --chown=bun:bun /app/package.json /app/bun.lock ./
COPY --from=api-build --chown=bun:bun /app/node_modules ./node_modules
COPY --from=api-build --chown=bun:bun /app/packages/server ./packages/server

USER bun
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD bun -e 'const r=await fetch("http://127.0.0.1:4000/graphql",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({query:"{ health { success } }"})});if(!r.ok)process.exit(1);const j=await r.json();if(j.data?.health?.success!==true)process.exit(1)'
CMD ["bun", "run", "--cwd", "packages/server", "start"]

FROM workspace AS web-dependencies
RUN bun install --frozen-lockfile --filter react-duolingo

FROM web-dependencies AS web-build
ARG NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql
ENV NEXT_PUBLIC_GRAPHQL_URL=${NEXT_PUBLIC_GRAPHQL_URL} \
    NEXT_TELEMETRY_DISABLED=1
COPY packages/client packages/client
RUN bun run --cwd packages/client build

FROM oven/bun:1.3.5-alpine AS web
WORKDIR /app
ARG NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    NEXT_PUBLIC_GRAPHQL_URL=${NEXT_PUBLIC_GRAPHQL_URL} \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=web-build --chown=bun:bun /app/package.json /app/bun.lock ./
COPY --from=web-build --chown=bun:bun /app/node_modules ./node_modules
COPY --from=web-build --chown=bun:bun /app/packages/client ./packages/client

USER bun
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD bun -e 'const r=await fetch("http://127.0.0.1:3000");if(!r.ok)process.exit(1)'
CMD ["bun", "run", "--cwd", "packages/client", "start"]

FROM workspace AS admin-dependencies
RUN bun install --frozen-lockfile --filter metronic-tailwind-react

FROM admin-dependencies AS admin-build
ARG VITE_API_BASE_URL=http://localhost:4000
ARG VITE_GRAPHQL_URL=http://localhost:4000/graphql
ARG VITE_APP_API_URL=http://localhost:4000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_GRAPHQL_URL=${VITE_GRAPHQL_URL} \
    VITE_APP_API_URL=${VITE_APP_API_URL} \
    VITE_APP_NAME=ugsl-learn-admin \
    VITE_APP_VERSION=1
COPY packages/client-admin packages/client-admin
RUN bun run --cwd packages/client-admin build

FROM nginxinc/nginx-unprivileged:1.29-alpine AS admin
COPY docker/admin.nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=admin-build /app/packages/client-admin/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
