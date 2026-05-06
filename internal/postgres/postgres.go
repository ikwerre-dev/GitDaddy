package postgres

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/gitdaddy/gitdaddy/internal/auth"
	"github.com/gitdaddy/gitdaddy/internal/repo"
	_ "github.com/lib/pq"
)

type Store struct {
	db *sql.DB
}

type UserStore struct{ store *Store }
type SessionStore struct{ store *Store }
type TokenStore struct{ store *Store }
type RepoStore struct{ store *Store }
type PermissionStore struct{ store *Store }
type PullRequestStore struct{ store *Store }

func (s *Store) Users() *UserStore               { return &UserStore{store: s} }
func (s *Store) Sessions() *SessionStore         { return &SessionStore{store: s} }
func (s *Store) Tokens() *TokenStore             { return &TokenStore{store: s} }
func (s *Store) Repos() *RepoStore               { return &RepoStore{store: s} }
func (s *Store) Permissions() *PermissionStore   { return &PermissionStore{store: s} }
func (s *Store) PullRequests() *PullRequestStore { return &PullRequestStore{store: s} }

func Open(ctx context.Context, url string) (*Store, error) {
	db, err := sql.Open("postgres", url)
	if err != nil {
		return nil, err
	}
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}
	store := &Store{db: db}
	if err := store.migrate(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}
	return store, nil
}

func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) migrate(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expiry TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS personal_access_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  secret_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS repositories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visibility TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS repositories_owner_lower_name_idx ON repositories(owner_id, lower(name));
CREATE TABLE IF NOT EXISTS permissions (
  repo_id BIGINT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  PRIMARY KEY(repo_id, user_id)
);
CREATE TABLE IF NOT EXISTS pull_requests (
  id BIGSERIAL PRIMARY KEY,
  repo_id BIGINT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL,
  target TEXT NOT NULL,
  status TEXT NOT NULL,
  author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL
);
`)
	return err
}

func (s *Store) CreateUser(ctx context.Context, user auth.User) (auth.User, error) {
	err := s.db.QueryRowContext(ctx, `
INSERT INTO users (username, email, password_hash, created_at)
VALUES ($1, $2, $3, $4)
RETURNING id`, user.Username, user.Email, user.PasswordHash, user.CreatedAt).Scan(&user.ID)
	if err != nil {
		return auth.User{}, err
	}
	return user, nil
}

func (s *Store) FindByUsername(ctx context.Context, username string) (auth.User, error) {
	var user auth.User
	err := s.db.QueryRowContext(ctx, `SELECT id, username, email, password_hash, created_at FROM users WHERE lower(username) = lower($1)`, username).
		Scan(&user.ID, &user.Username, &user.Email, &user.PasswordHash, &user.CreatedAt)
	if err != nil {
		return auth.User{}, err
	}
	return user, nil
}

func (s *Store) FindByID(ctx context.Context, id int64) (auth.User, error) {
	var user auth.User
	err := s.db.QueryRowContext(ctx, `SELECT id, username, email, password_hash, created_at FROM users WHERE id = $1`, id).
		Scan(&user.ID, &user.Username, &user.Email, &user.PasswordHash, &user.CreatedAt)
	if err != nil {
		return auth.User{}, err
	}
	return user, nil
}

func (s *Store) Save(ctx context.Context, token string, userID int64, expiry time.Time) error {
	_, err := s.db.ExecContext(ctx, `
INSERT INTO sessions (token, user_id, expiry) VALUES ($1, $2, $3)
ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, expiry = EXCLUDED.expiry`, token, userID, expiry)
	return err
}

func (s *Store) Resolve(ctx context.Context, token string) (int64, error) {
	var userID int64
	var expiry time.Time
	err := s.db.QueryRowContext(ctx, `SELECT user_id, expiry FROM sessions WHERE token = $1`, token).Scan(&userID, &expiry)
	if err != nil || time.Now().After(expiry) {
		return 0, errors.New("invalid session")
	}
	return userID, nil
}

func (s *Store) Delete(ctx context.Context, token string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM sessions WHERE token = $1`, token)
	return err
}

func (s *Store) Create(ctx context.Context, token auth.PersonalAccessToken, hash string) (auth.PersonalAccessToken, error) {
	err := s.db.QueryRowContext(ctx, `
INSERT INTO personal_access_tokens (user_id, name, prefix, secret_hash, created_at, expires_at)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id`, token.UserID, token.Name, token.Prefix, hash, token.CreatedAt, token.ExpiresAt).Scan(&token.ID)
	if err != nil {
		return auth.PersonalAccessToken{}, err
	}
	return token, nil
}

func (s *Store) ListByUser(ctx context.Context, userID int64) ([]auth.PersonalAccessToken, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, user_id, name, prefix, created_at, expires_at FROM personal_access_tokens WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var tokens []auth.PersonalAccessToken
	for rows.Next() {
		var token auth.PersonalAccessToken
		if err := rows.Scan(&token.ID, &token.UserID, &token.Name, &token.Prefix, &token.CreatedAt, &token.ExpiresAt); err != nil {
			return nil, err
		}
		tokens = append(tokens, token)
	}
	return tokens, rows.Err()
}

func (s *Store) FindByPlaintext(ctx context.Context, plaintext string) (auth.PersonalAccessToken, error) {
	var token auth.PersonalAccessToken
	err := s.db.QueryRowContext(ctx, `SELECT id, user_id, name, prefix, created_at, expires_at FROM personal_access_tokens WHERE secret_hash = $1`, auth.HashSecret(plaintext)).
		Scan(&token.ID, &token.UserID, &token.Name, &token.Prefix, &token.CreatedAt, &token.ExpiresAt)
	if err != nil {
		return auth.PersonalAccessToken{}, err
	}
	return token, nil
}

func (s *Store) DeleteToken(ctx context.Context, userID, tokenID int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM personal_access_tokens WHERE user_id = $1 AND id = $2`, userID, tokenID)
	return err
}

func (s *Store) DeleteTokenCompat(ctx context.Context, userID, tokenID int64) error {
	return s.DeleteToken(ctx, userID, tokenID)
}

func (s *Store) CreateRepo(ctx context.Context, repository repo.Repository) (repo.Repository, error) {
	err := s.db.QueryRowContext(ctx, `
INSERT INTO repositories (name, owner_id, visibility, created_at)
VALUES ($1, $2, $3, $4)
RETURNING id`, repository.Name, repository.OwnerID, repository.Visibility, repository.CreatedAt).Scan(&repository.ID)
	if err != nil {
		return repo.Repository{}, err
	}
	return repository, nil
}

func (s *Store) ListByOwner(ctx context.Context, ownerID int64) ([]repo.Repository, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, name, owner_id, visibility, created_at FROM repositories WHERE owner_id = $1 ORDER BY created_at DESC`, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var repos []repo.Repository
	for rows.Next() {
		var repository repo.Repository
		if err := rows.Scan(&repository.ID, &repository.Name, &repository.OwnerID, &repository.Visibility, &repository.CreatedAt); err != nil {
			return nil, err
		}
		repos = append(repos, repository)
	}
	return repos, rows.Err()
}

func (s *Store) FindByOwnerAndName(ctx context.Context, ownerID int64, name string) (repo.Repository, error) {
	var repository repo.Repository
	err := s.db.QueryRowContext(ctx, `SELECT id, name, owner_id, visibility, created_at FROM repositories WHERE owner_id = $1 AND lower(name) = lower($2)`, ownerID, name).
		Scan(&repository.ID, &repository.Name, &repository.OwnerID, &repository.Visibility, &repository.CreatedAt)
	if err != nil {
		return repo.Repository{}, err
	}
	return repository, nil
}

func (s *Store) UpdateVisibility(ctx context.Context, ownerID int64, name, visibility string) (repo.Repository, error) {
	var repository repo.Repository
	err := s.db.QueryRowContext(ctx, `
UPDATE repositories SET visibility = $3 WHERE owner_id = $1 AND lower(name) = lower($2)
RETURNING id, name, owner_id, visibility, created_at`, ownerID, name, visibility).
		Scan(&repository.ID, &repository.Name, &repository.OwnerID, &repository.Visibility, &repository.CreatedAt)
	if err != nil {
		return repo.Repository{}, err
	}
	return repository, nil
}

func (s *Store) DeleteRepo(ctx context.Context, ownerID int64, name string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM repositories WHERE owner_id = $1 AND lower(name) = lower($2)`, ownerID, name)
	return err
}

func (s *Store) CountByOwner(ctx context.Context, ownerID int64) (int, error) {
	var count int
	err := s.db.QueryRowContext(ctx, `SELECT count(*) FROM repositories WHERE owner_id = $1`, ownerID).Scan(&count)
	return count, err
}

func (s *Store) Grant(ctx context.Context, permission repo.Permission) error {
	_, err := s.db.ExecContext(ctx, `
INSERT INTO permissions (repo_id, user_id, role) VALUES ($1, $2, $3)
ON CONFLICT (repo_id, user_id) DO UPDATE SET role = EXCLUDED.role`, permission.RepoID, permission.UserID, permission.Role)
	return err
}

func (s *Store) Revoke(ctx context.Context, repoID, userID int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM permissions WHERE repo_id = $1 AND user_id = $2`, repoID, userID)
	return err
}

func (s *Store) ListByRepo(ctx context.Context, repoID int64) ([]repo.Permission, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT user_id, repo_id, role FROM permissions WHERE repo_id = $1`, repoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var permissions []repo.Permission
	for rows.Next() {
		var permission repo.Permission
		if err := rows.Scan(&permission.UserID, &permission.RepoID, &permission.Role); err != nil {
			return nil, err
		}
		permissions = append(permissions, permission)
	}
	return permissions, rows.Err()
}

func (s *Store) Find(ctx context.Context, repoID, userID int64) (repo.Permission, error) {
	var permission repo.Permission
	err := s.db.QueryRowContext(ctx, `SELECT user_id, repo_id, role FROM permissions WHERE repo_id = $1 AND user_id = $2`, repoID, userID).
		Scan(&permission.UserID, &permission.RepoID, &permission.Role)
	if err != nil {
		return repo.Permission{}, err
	}
	return permission, nil
}

func (s *Store) CreatePullRequest(ctx context.Context, pull repo.PullRequest) (repo.PullRequest, error) {
	err := s.db.QueryRowContext(ctx, `
INSERT INTO pull_requests (repo_id, title, body, source, target, status, author_id, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id`, pull.RepoID, pull.Title, pull.Body, pull.Source, pull.Target, pull.Status, pull.AuthorID, pull.CreatedAt).Scan(&pull.ID)
	if err != nil {
		return repo.PullRequest{}, err
	}
	return pull, nil
}

func (s *Store) ListPullRequests(ctx context.Context, repoID int64) ([]repo.PullRequest, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, repo_id, title, body, source, target, status, author_id, created_at FROM pull_requests WHERE repo_id = $1 ORDER BY created_at DESC`, repoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var pulls []repo.PullRequest
	for rows.Next() {
		var pull repo.PullRequest
		if err := rows.Scan(&pull.ID, &pull.RepoID, &pull.Title, &pull.Body, &pull.Source, &pull.Target, &pull.Status, &pull.AuthorID, &pull.CreatedAt); err != nil {
			return nil, err
		}
		pulls = append(pulls, pull)
	}
	return pulls, rows.Err()
}

func (s *UserStore) CreateUser(ctx context.Context, user auth.User) (auth.User, error) {
	return s.store.CreateUser(ctx, user)
}

func (s *UserStore) FindByUsername(ctx context.Context, username string) (auth.User, error) {
	return s.store.FindByUsername(ctx, username)
}

func (s *UserStore) FindByID(ctx context.Context, id int64) (auth.User, error) {
	return s.store.FindByID(ctx, id)
}

func (s *SessionStore) Save(ctx context.Context, token string, userID int64, expiry time.Time) error {
	return s.store.Save(ctx, token, userID, expiry)
}

func (s *SessionStore) Resolve(ctx context.Context, token string) (int64, error) {
	return s.store.Resolve(ctx, token)
}

func (s *SessionStore) Delete(ctx context.Context, token string) error {
	return s.store.Delete(ctx, token)
}

func (s *TokenStore) Create(ctx context.Context, token auth.PersonalAccessToken, hash string) (auth.PersonalAccessToken, error) {
	return s.store.Create(ctx, token, hash)
}

func (s *TokenStore) ListByUser(ctx context.Context, userID int64) ([]auth.PersonalAccessToken, error) {
	return s.store.ListByUser(ctx, userID)
}

func (s *TokenStore) FindByPlaintext(ctx context.Context, plaintext string) (auth.PersonalAccessToken, error) {
	return s.store.FindByPlaintext(ctx, plaintext)
}

func (s *TokenStore) Delete(ctx context.Context, userID, tokenID int64) error {
	return s.store.DeleteToken(ctx, userID, tokenID)
}

func (s *RepoStore) Create(ctx context.Context, repository repo.Repository) (repo.Repository, error) {
	return s.store.CreateRepo(ctx, repository)
}

func (s *RepoStore) ListByOwner(ctx context.Context, ownerID int64) ([]repo.Repository, error) {
	return s.store.ListByOwner(ctx, ownerID)
}

func (s *RepoStore) FindByOwnerAndName(ctx context.Context, ownerID int64, name string) (repo.Repository, error) {
	return s.store.FindByOwnerAndName(ctx, ownerID, name)
}

func (s *RepoStore) UpdateVisibility(ctx context.Context, ownerID int64, name, visibility string) (repo.Repository, error) {
	return s.store.UpdateVisibility(ctx, ownerID, name, visibility)
}

func (s *RepoStore) Delete(ctx context.Context, ownerID int64, name string) error {
	return s.store.DeleteRepo(ctx, ownerID, name)
}

func (s *RepoStore) CountByOwner(ctx context.Context, ownerID int64) (int, error) {
	return s.store.CountByOwner(ctx, ownerID)
}

func (s *PermissionStore) Grant(ctx context.Context, permission repo.Permission) error {
	return s.store.Grant(ctx, permission)
}

func (s *PermissionStore) Revoke(ctx context.Context, repoID, userID int64) error {
	return s.store.Revoke(ctx, repoID, userID)
}

func (s *PermissionStore) ListByRepo(ctx context.Context, repoID int64) ([]repo.Permission, error) {
	return s.store.ListByRepo(ctx, repoID)
}

func (s *PermissionStore) Find(ctx context.Context, repoID, userID int64) (repo.Permission, error) {
	return s.store.Find(ctx, repoID, userID)
}

func (s *PullRequestStore) CreatePullRequest(ctx context.Context, pull repo.PullRequest) (repo.PullRequest, error) {
	return s.store.CreatePullRequest(ctx, pull)
}

func (s *PullRequestStore) ListPullRequests(ctx context.Context, repoID int64) ([]repo.PullRequest, error) {
	return s.store.ListPullRequests(ctx, repoID)
}
