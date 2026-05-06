# GitDaddy Architecture

GitDaddy is an open-source, cloud-native Git hosting platform. It is intentionally modular: Git protocol handling, REST APIs, persistence, queues, object storage, workers, and the web UI are separate units with explicit boundaries.

## System Components

- `go-backend`: HTTP API and Git smart HTTP entrypoint.
- `worker-service`: asynchronous Git object/ref artifact syncing to Cloudflare R2-compatible object storage.
- `postgres`: durable system of record for users, repositories, permissions, and optional sessions.
- `redis`: session cache, rate limits, job queue, and repository locks.
- `frontend-ui`: Next.js web UI that talks only to backend APIs.

## Current Capabilities

GitDaddy can currently:

- Register users and authenticate them with bearer sessions.
- Log users out by invalidating bearer sessions.
- Create personal access tokens for Git over HTTPS without using account passwords.
- Create repositories with `private` or `public` visibility.
- Update repository visibility after creation.
- Grant collaborators `read`, `write`, or `admin` repository roles.
- Delete repositories from metadata and local bare Git storage.
- Serve Git smart HTTP transport for normal `git clone`, `git fetch`, `git pull`, and `git push`.
- Authenticate Git command-line clients with HTTP Basic auth.
- Enqueue asynchronous repository sync jobs after push operations.
- Snapshot bare repositories for object storage backup.
- List repositories owned by the signed-in user.
- Resolve repository metadata by owner/name.
- List branches for a repository.
- List recent commits for a repository.
- Browse repository trees by ref and path.
- Preview text file contents with a 1MB response limit.
- View commit diffs with a 2MB response limit.
- Report per-repository stats: branches, commits, objects, size, and HEAD.
- Report signed-in user platform stats: repository count, pending jobs, storage mode, and Git transport.
- Run as a local development stack with Docker Compose.
- Provide a Next.js dashboard for auth, repo creation, branch browsing, commits, file browsing, and repository settings.

## Request Paths

### Push

1. A normal Git client connects to `/git/{owner}/{repo}.git`.
2. Backend requires HTTP Basic auth for receive-pack.
3. Backend authorizes the authenticated user as the repository owner.
4. Backend invokes Git receive-pack semantics against local ephemeral repository storage.
5. Backend responds after local Git operation succeeds.
6. Backend enqueues an R2 sync job.
7. Worker uploads repository snapshots or pack artifacts asynchronously.

R2 is never in the push request critical path.

### Clone and Pull

1. A normal Git client connects to `/git/{owner}/{repo}.git`.
2. Backend requires HTTP Basic auth for private repositories.
3. Public repositories can be cloned without credentials.
4. Backend checks local ephemeral repository cache.
5. If missing, backend asks storage to restore from R2 into temporary repo storage.
6. Backend serves Git upload-pack semantics.

R2 restore can be in the cold-cache read path, but object upload never blocks writes.

## Data Ownership

PostgreSQL owns:

- users
- repositories
- permissions
- optional durable sessions

Redis owns:

- bearer session cache
- API and Git rate-limit counters
- asynchronous jobs
- temporary repository locks

Ephemeral disk owns:

- bare Git repositories used for active Git protocol operations
- temporary restored repositories
- short-lived archives

R2 owns:

- Git object files under `repos/<owner>/<repo>/git/objects/**`
- Git refs under `repos/<owner>/<repo>/git/refs/**`
- `HEAD`, `config`, and `packed-refs` artifacts
- `.gitdaddy-manifest.json` for stale artifact cleanup
- disaster-recovery artifacts

## R2 Git Artifact Sync

GitDaddy syncs the bare Git database to R2 instead of uploading one full tar snapshot per push. Git already stores content as immutable, content-addressed objects and packfiles, so a push normally adds new object/pack artifacts and updates small ref files.

Example keys:

```text
repos/honour/gitdaddy/git/HEAD
repos/honour/gitdaddy/git/refs/heads/main
repos/honour/gitdaddy/git/objects/pack/pack-abc123.pack
repos/honour/gitdaddy/git/objects/ab/cdef...
repos/honour/gitdaddy/git/.gitdaddy-manifest.json
```

The worker compares existing object bytes before writing, skips unchanged artifacts, deletes artifacts that disappeared from the local bare repo based on the manifest, logs uploaded/skipped/deleted counts, and retries transient R2 failures through the storage layer.

## Module Boundaries

Backend modules:

- `internal/auth`: password hashing, login, bearer token sessions.
- `internal/repo`: repository lifecycle, visibility changes, deletion, permissions, and validation.
- `internal/git`: Git command adapter, smart HTTP, file browsing, diffs, stats, and repository filesystem operations.
- `internal/storage`: object storage interface and local/R2 implementations.
- `internal/queue`: asynchronous job queue interface.
- `internal/worker`: job processor for object storage sync.
- `internal/api`: REST and Git HTTP handlers.

Authorization model:

- Repository owners have implicit `admin`.
- `admin` can change settings, delete repositories, and manage collaborators.
- `write` can push through Git smart HTTP.
- `read` can clone/fetch private repositories and use repository read APIs.
- Public repositories can be cloned without credentials, but pushes still require `write`.

All external systems are represented as interfaces. Tests can use in-memory or local implementations.

## Scalability Model

Backend instances are stateless except for local ephemeral repository cache. Any instance can handle API requests. Repository locks are coordinated through Redis. Workers scale horizontally because queue jobs are idempotent and repository sync keys are deterministic.

## Development Runtime

`docker compose up` starts the backend, worker, Postgres, Redis, and frontend. Local repository data is mounted as a development volume. Environment variables are loaded from `.env` or Compose defaults.

## Security Defaults

- Passwords are hashed before persistence.
- Tokens are bearer-only and stored in Redis or the configured session store.
- Repository visibility and permissions are checked before Git operations.
- Git commands are executed with validated repository names and no shell interpolation.

## Open-Source Readiness

The repository includes a permissive license, documentation, Docker Compose, startup scripts, tests, and a dependency-light local development path. Production deployments can replace the in-memory development stores with Postgres, Redis, and R2 implementations behind the same interfaces.

## Verification

`./test.sh` runs the main local verification path:

- Go unit and integration tests.
- A real Git command-line push and clone integration test.
- Go binary builds.
- Docker Compose config validation.
- Next.js production build.
- Live R2 upload/download smoke test when R2 env vars are present.
