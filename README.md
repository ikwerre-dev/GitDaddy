# GitDaddy

GitDaddy is an open-source, self-hostable GitHub alternative built with Go, PostgreSQL, Redis, Cloudflare R2-compatible object storage, and a Next.js web UI.

Built by [Robinson Honour](https://robinsonhonour.me).

## Technical Capabilities

GitDaddy speaks normal Git over HTTP. You do not need a custom CLI.

Supported Git operations:

```bash
git clone http://localhost:8080/git/<owner>/<repo>.git
git remote add origin http://localhost:8080/git/<owner>/<repo>.git
git fetch origin
git pull origin main
git push origin main
git push origin <branch>
git ls-remote http://localhost:8080/git/<owner>/<repo>.git
```

Repository and auth features:

- Smart HTTP transport through `git http-backend`.
- Public repositories can be cloned/fetched without credentials.
- Private repositories require GitDaddy credentials or a personal access token.
- Pushes require `write` or `admin` access.
- Repository owners have implicit `admin`.
- Collaborator roles: `read`, `write`, `admin`.
- Personal access tokens use the `gtd_...` prefix and work with normal Git credential prompts.
- REST APIs expose repository creation, visibility changes, deletion, collaborators, branches, commits, file previews, diffs, stats, and token management.

Storage and worker behavior:

- Push requests finish after local Git receive-pack succeeds.
- R2 upload is queued asynchronously, so object storage is not in the push critical path.
- R2 stores Git database artifacts instead of one full repository blob.
- Object keys use the prefix `repos/<owner>/<repo>/git/`, including `objects/**`, `refs/**`, `packed-refs`, `HEAD`, and `config`.
- Git objects are content-addressed, so new commits add new object/pack files while refs move independently.
- R2 upload/download smoke testing is included in `./test.sh`.

Security-relevant defaults:

- Bcrypt password hashing.
- Personal access tokens for Git over HTTPS.
- JSON body size limit and unknown-field rejection.
- Restricted CORS through `GITDADDY_ALLOWED_ORIGINS`.
- Security headers on API responses.
- Login/register/Git auth rate limiting.
- Git path traversal checks before invoking `git http-backend`.
- `/metrics` is private unless `GITDADDY_PUBLIC_METRICS=true`.

## Run Locally

```bash
./start.sh
```

Services:

- API: http://localhost:8080
- UI: http://localhost:3000

## Git Usage

Create or log into a GitDaddy account from the web UI, create a repository, then use the normal Git CLI:

```bash
git clone http://localhost:8080/git/<owner>/<repo>.git
cd <repo>
git pull
git push origin main
```

For private repositories and pushes, Git prompts for a username and password. Use either your account password or a personal access token. Personal access tokens are recommended.

Example with a personal access token:

```bash
git clone http://localhost:8080/git/robinson/demo.git
# Username: robinson
# Password: gtd_<token>
```

Add a new local project to GitDaddy:

```bash
git init -b main
git add .
git commit -m "initial commit"
git remote add origin http://localhost:8080/git/<owner>/<repo>.git
git push -u origin main
```

Work with branches:

```bash
git checkout -b feature/api
git push -u origin feature/api
git fetch origin
git pull origin main
```

Inspect a remote:

```bash
git ls-remote http://localhost:8080/git/<owner>/<repo>.git
git remote -v
```

Standard Git credential helpers work:

```bash
git config --global credential.helper store
git config --global credential.helper cache
```

## REST API Examples

Register and log in:

```bash
curl -X POST http://localhost:8080/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"robinson","email":"me@example.com","password":"secret"}'

curl -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"robinson","password":"secret"}'
```

Create a repository:

```bash
curl -X POST http://localhost:8080/api/repos \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"demo","visibility":"private"}'
```

Create a personal access token:

```bash
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"name":"laptop"}' http://localhost:8080/api/tokens
```

Grant collaborator access:

```bash
curl -X PUT -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"role":"write"}' http://localhost:8080/api/repos/<owner>/<repo>/collaborators/<username>
```

Browse repository data:

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

Common shortcuts:

```bash
make test
make build
make web-build
make full-test
make dev
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

The R2 smoke test still performs a simple upload/download round trip to verify credentials and bucket access.

## R2 Git Artifacts

Repository sync jobs store the bare Git repository database under:

```text
repos/<owner>/<repo>/git/
```

Examples:

```text
repos/honour/gitdaddy/git/HEAD
repos/honour/gitdaddy/git/refs/heads/main
repos/honour/gitdaddy/git/objects/pack/pack-abc123.pack
repos/honour/gitdaddy/git/objects/ab/cdef...
```

This keeps R2 aligned with Git's version-control model instead of uploading a single snapshot for every push.
