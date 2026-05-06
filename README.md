# GitDaddy

GitDaddy is an open-source distributed Git hosting platform built with Go, PostgreSQL, Redis, Cloudflare R2-compatible object storage, and a Next.js web UI.

## What It Can Do

- Register users, log in, log out, and resolve the current account with bearer tokens.
- Create private or public repositories.
- Change repository visibility.
- Delete repositories and their local bare Git data.
- Serve Git smart HTTP endpoints for `git clone`, `git fetch`, `git pull`, and `git push`.
- Authenticate normal Git clients with HTTP Basic auth.
- Queue asynchronous repository snapshot sync jobs after push operations.
- Browse repositories through REST APIs and the Next.js UI.
- List branches and recent commits.
- Browse repository trees and preview text file contents.
- View commit diffs with patch and stat output.
- Report repository stats including branch count, commit count, object count, size, and HEAD.
- Report platform stats for the signed-in user, including repository count and pending async jobs.
- Run locally with Docker Compose.

## Run Locally

```bash
./start.sh
```

Services:

- API: http://localhost:8080
- UI: http://localhost:3000

## Git Usage

```bash
git clone http://localhost:8080/git/<owner>/<repo>.git
cd <repo>
git pull
git push origin main
```

For private repositories and pushes, normal Git prompts for your GitDaddy username and password. You can also use standard Git credential helpers.

Additional API examples:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:8080/api/stats
curl -H "Authorization: Bearer <token>" http://localhost:8080/api/repos/<owner>/<repo>/branches
curl -H "Authorization: Bearer <token>" "http://localhost:8080/api/repos/<owner>/<repo>/file?ref=HEAD&path=README.md"
curl -H "Authorization: Bearer <token>" "http://localhost:8080/api/repos/<owner>/<repo>/diff?commit=HEAD"
```

## Development

```bash
go test ./...
cd web && npm run build
```

## Full Test Script

```bash
./test.sh
```

The script runs Go tests, the standard Git command-line integration test, Go builds, Docker Compose validation, the Next.js production build, and a live R2 round-trip smoke test when these variables are set:

```bash
R2_ENDPOINT=
R2_BUCKET=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_REGION=auto
```

The R2 smoke test uploads a temporary bare-repository snapshot to `smoke/gitdaddy-<timestamp>.tar.gz`, downloads it, and verifies the bytes match.
