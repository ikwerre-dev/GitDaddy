#!/usr/bin/env sh
set -eu

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing dependency: $1"
    exit 1
  }
}

need docker

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

docker compose up -d --build

echo "waiting for API..."
i=0
until curl -fsS http://localhost:${API_PORT:-8080}/healthz >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -gt 60 ]; then
    echo "API did not become ready"
    exit 1
  fi
  sleep 1
done

cat <<INFO
GitDaddy is running.

API: http://localhost:${API_PORT:-8080}
UI:  http://localhost:${UI_PORT:-3000}

Git usage:
  git clone http://localhost:${API_PORT:-8080}/git/<owner>/<repo>.git
  git push origin main
INFO
