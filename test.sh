#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$ROOT_DIR"

export GOCACHE="${GOCACHE:-$ROOT_DIR/.cache/go-build}"
mkdir -p "$GOCACHE"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing dependency: $1"
    exit 1
  }
}

need go
need git
need docker
need npm

echo "==> Go unit + integration tests"
go test ./...

echo "==> Go build"
go build ./cmd/backend ./cmd/worker ./cmd/r2-smoke

echo "==> Docker Compose validation"
docker compose config >/dev/null

echo "==> Next.js production build"
if [ ! -d web/node_modules ]; then
  echo "web/node_modules missing; running npm install in web/"
  (cd web && npm install)
fi
(cd web && npm run build)

echo "==> R2 live smoke test"
if [ -n "${R2_ENDPOINT:-}" ] && [ -n "${R2_BUCKET:-}" ] && [ -n "${R2_ACCESS_KEY_ID:-}" ] && [ -n "${R2_SECRET_ACCESS_KEY:-}" ]; then
  go run ./cmd/r2-smoke
else
  echo "skipping R2 smoke test; set R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY"
fi

cat <<INFO

All requested checks completed.

Normal Git remote format:
  http://localhost:${API_PORT:-8080}/git/<owner>/<repo>.git

Example:
  git clone http://localhost:${API_PORT:-8080}/git/<owner>/<repo>.git
  git push origin main
INFO
