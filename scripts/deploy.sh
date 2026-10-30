#!/bin/sh
set -eu

: "${IMAGE_REPOSITORY:?IMAGE_REPOSITORY is required}"
: "${IMAGE_TAG:?IMAGE_TAG is required}"

compose() {
  docker compose --env-file .env.production -f docker-compose.prod.yml "$@"
}

compose pull
compose run --rm api bun run --cwd packages/server db:deploy
compose up -d --remove-orphans --wait --wait-timeout 180
compose ps
