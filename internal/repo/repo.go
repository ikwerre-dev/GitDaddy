package repo

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"sync"
	"time"
)

var validRepoName = regexp.MustCompile(`^[a-zA-Z0-9._-]+$`)

type Repository struct {
	ID         int64     `json:"id"`
	Name       string    `json:"name"`
	OwnerID    int64     `json:"owner_id"`
	Visibility string    `json:"visibility"`
	CreatedAt  time.Time `json:"created_at"`
}

type Store interface {
	Create(context.Context, Repository) (Repository, error)
	ListByOwner(context.Context, int64) ([]Repository, error)
	FindByOwnerAndName(context.Context, int64, string) (Repository, error)
	UpdateVisibility(context.Context, int64, string, string) (Repository, error)
	Delete(context.Context, int64, string) error
	CountByOwner(context.Context, int64) (int, error)
}

type Role string

const (
	RoleRead  Role = "read"
	RoleWrite Role = "write"
	RoleAdmin Role = "admin"
)

type Permission struct {
	UserID int64 `json:"user_id"`
	RepoID int64 `json:"repo_id"`
	Role   Role  `json:"role"`
}

type PullRequest struct {
	ID        int64     `json:"id"`
	RepoID    int64     `json:"repo_id"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	Source    string    `json:"source"`
	Target    string    `json:"target"`
	Status    string    `json:"status"`
	AuthorID  int64     `json:"author_id"`
	CreatedAt time.Time `json:"created_at"`
}

type PermissionStore interface {
	Grant(context.Context, Permission) error
	Revoke(context.Context, int64, int64) error
	ListByRepo(context.Context, int64) ([]Permission, error)
	Find(context.Context, int64, int64) (Permission, error)
}

type PullRequestStore interface {
	CreatePullRequest(context.Context, PullRequest) (PullRequest, error)
	ListPullRequests(context.Context, int64) ([]PullRequest, error)
}

type Service struct {
	store       Store
	permissions PermissionStore
	pulls       PullRequestStore
}

func NewService(store Store) *Service {
	return &Service{store: store, permissions: NewMemoryPermissionStore(), pulls: NewMemoryPullRequestStore()}
}

func NewServiceWithPermissions(store Store, permissions PermissionStore) *Service {
	return &Service{store: store, permissions: permissions, pulls: NewMemoryPullRequestStore()}
}

func NewServiceWithStores(store Store, permissions PermissionStore, pulls PullRequestStore) *Service {
	return &Service{store: store, permissions: permissions, pulls: pulls}
}

func (s *Service) Create(ctx context.Context, ownerID int64, name, visibility string) (Repository, error) {
	name = strings.TrimSpace(name)
	if !validRepoName.MatchString(name) {
		return Repository{}, errors.New("repository name may contain only letters, numbers, dot, underscore, and dash")
	}
	if visibility == "" {
		visibility = "private"
	}
	if visibility != "private" && visibility != "public" {
		return Repository{}, errors.New("visibility must be private or public")
	}
	return s.store.Create(ctx, Repository{
		Name:       name,
		OwnerID:    ownerID,
		Visibility: visibility,
		CreatedAt:  time.Now().UTC(),
	})
}

func (s *Service) ListByOwner(ctx context.Context, ownerID int64) ([]Repository, error) {
	return s.store.ListByOwner(ctx, ownerID)
}

func (s *Service) FindByOwnerAndName(ctx context.Context, ownerID int64, name string) (Repository, error) {
	return s.store.FindByOwnerAndName(ctx, ownerID, name)
}

func (s *Service) UpdateVisibility(ctx context.Context, ownerID int64, name, visibility string) (Repository, error) {
	if visibility != "private" && visibility != "public" {
		return Repository{}, errors.New("visibility must be private or public")
	}
	return s.store.UpdateVisibility(ctx, ownerID, name, visibility)
}

func (s *Service) Delete(ctx context.Context, ownerID int64, name string) error {
	return s.store.Delete(ctx, ownerID, name)
}

func (s *Service) CountByOwner(ctx context.Context, ownerID int64) (int, error) {
	return s.store.CountByOwner(ctx, ownerID)
}

func (s *Service) Grant(ctx context.Context, repoID, userID int64, role Role) error {
	if !validRole(role) {
		return errors.New("role must be read, write, or admin")
	}
	return s.permissions.Grant(ctx, Permission{RepoID: repoID, UserID: userID, Role: role})
}

func (s *Service) Revoke(ctx context.Context, repoID, userID int64) error {
	return s.permissions.Revoke(ctx, repoID, userID)
}

func (s *Service) ListPermissions(ctx context.Context, repoID int64) ([]Permission, error) {
	return s.permissions.ListByRepo(ctx, repoID)
}

func (s *Service) CreatePullRequest(ctx context.Context, repoID, authorID int64, title, body, source, target string) (PullRequest, error) {
	title = strings.TrimSpace(title)
	source = strings.TrimSpace(source)
	target = strings.TrimSpace(target)
	if title == "" {
		return PullRequest{}, errors.New("pull request title is required")
	}
	if source == "" || target == "" {
		return PullRequest{}, errors.New("source and target branches are required")
	}
	if source == target {
		return PullRequest{}, errors.New("source and target branches must differ")
	}
	return s.pulls.CreatePullRequest(ctx, PullRequest{
		RepoID:    repoID,
		Title:     title,
		Body:      strings.TrimSpace(body),
		Source:    source,
		Target:    target,
		Status:    "open",
		AuthorID:  authorID,
		CreatedAt: time.Now().UTC(),
	})
}

func (s *Service) ListPullRequests(ctx context.Context, repoID int64) ([]PullRequest, error) {
	return s.pulls.ListPullRequests(ctx, repoID)
}

func (s *Service) CanRead(ctx context.Context, repository Repository, userID int64) bool {
	if repository.Visibility == "public" || repository.OwnerID == userID {
		return true
	}
	perm, err := s.permissions.Find(ctx, repository.ID, userID)
	return err == nil && roleAtLeast(perm.Role, RoleRead)
}

func (s *Service) CanWrite(ctx context.Context, repository Repository, userID int64) bool {
	if repository.OwnerID == userID {
		return true
	}
	perm, err := s.permissions.Find(ctx, repository.ID, userID)
	return err == nil && roleAtLeast(perm.Role, RoleWrite)
}

func (s *Service) CanAdmin(ctx context.Context, repository Repository, userID int64) bool {
	if repository.OwnerID == userID {
		return true
	}
	perm, err := s.permissions.Find(ctx, repository.ID, userID)
	return err == nil && roleAtLeast(perm.Role, RoleAdmin)
}

func validRole(role Role) bool {
	return role == RoleRead || role == RoleWrite || role == RoleAdmin
}

func roleAtLeast(actual, required Role) bool {
	order := map[Role]int{RoleRead: 1, RoleWrite: 2, RoleAdmin: 3}
	return order[actual] >= order[required]
}

type MemoryStore struct {
	mu     sync.RWMutex
	nextID int64
	repos  map[int64]Repository
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{nextID: 1, repos: map[int64]Repository{}}
}

func (s *MemoryStore) Create(_ context.Context, repo Repository) (Repository, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, existing := range s.repos {
		if existing.OwnerID == repo.OwnerID && strings.EqualFold(existing.Name, repo.Name) {
			return Repository{}, errors.New("repository already exists")
		}
	}
	repo.ID = s.nextID
	s.nextID++
	s.repos[repo.ID] = repo
	return repo, nil
}

func (s *MemoryStore) ListByOwner(_ context.Context, ownerID int64) ([]Repository, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	repos := []Repository{}
	for _, repo := range s.repos {
		if repo.OwnerID == ownerID {
			repos = append(repos, repo)
		}
	}
	return repos, nil
}

func (s *MemoryStore) FindByOwnerAndName(_ context.Context, ownerID int64, name string) (Repository, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, repo := range s.repos {
		if repo.OwnerID == ownerID && strings.EqualFold(repo.Name, name) {
			return repo, nil
		}
	}
	return Repository{}, errors.New("repository not found")
}

func (s *MemoryStore) UpdateVisibility(_ context.Context, ownerID int64, name, visibility string) (Repository, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for id, repository := range s.repos {
		if repository.OwnerID == ownerID && strings.EqualFold(repository.Name, name) {
			repository.Visibility = visibility
			s.repos[id] = repository
			return repository, nil
		}
	}
	return Repository{}, errors.New("repository not found")
}

func (s *MemoryStore) Delete(_ context.Context, ownerID int64, name string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for id, repository := range s.repos {
		if repository.OwnerID == ownerID && strings.EqualFold(repository.Name, name) {
			delete(s.repos, id)
			return nil
		}
	}
	return errors.New("repository not found")
}

func (s *MemoryStore) CountByOwner(_ context.Context, ownerID int64) (int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	count := 0
	for _, repository := range s.repos {
		if repository.OwnerID == ownerID {
			count++
		}
	}
	return count, nil
}

type MemoryPermissionStore struct {
	mu          sync.RWMutex
	permissions map[int64]map[int64]Permission
}

func NewMemoryPermissionStore() *MemoryPermissionStore {
	return &MemoryPermissionStore{permissions: map[int64]map[int64]Permission{}}
}

func (s *MemoryPermissionStore) Grant(_ context.Context, permission Permission) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.permissions[permission.RepoID] == nil {
		s.permissions[permission.RepoID] = map[int64]Permission{}
	}
	s.permissions[permission.RepoID][permission.UserID] = permission
	return nil
}

func (s *MemoryPermissionStore) Revoke(_ context.Context, repoID, userID int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.permissions[repoID] != nil {
		delete(s.permissions[repoID], userID)
	}
	return nil
}

func (s *MemoryPermissionStore) ListByRepo(_ context.Context, repoID int64) ([]Permission, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	list := []Permission{}
	for _, permission := range s.permissions[repoID] {
		list = append(list, permission)
	}
	return list, nil
}

func (s *MemoryPermissionStore) Find(_ context.Context, repoID, userID int64) (Permission, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if permission, ok := s.permissions[repoID][userID]; ok {
		return permission, nil
	}
	return Permission{}, errors.New("permission not found")
}

type MemoryPullRequestStore struct {
	mu    sync.RWMutex
	next  int64
	pulls map[int64][]PullRequest
}

func NewMemoryPullRequestStore() *MemoryPullRequestStore {
	return &MemoryPullRequestStore{next: 1, pulls: map[int64][]PullRequest{}}
}

func (s *MemoryPullRequestStore) CreatePullRequest(_ context.Context, pull PullRequest) (PullRequest, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	pull.ID = s.next
	s.next++
	s.pulls[pull.RepoID] = append([]PullRequest{pull}, s.pulls[pull.RepoID]...)
	return pull, nil
}

func (s *MemoryPullRequestStore) ListPullRequests(_ context.Context, repoID int64) ([]PullRequest, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	pulls := append([]PullRequest(nil), s.pulls[repoID]...)
	return pulls, nil
}
