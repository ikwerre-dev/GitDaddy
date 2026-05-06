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

type Service struct {
	store Store
}

func NewService(store Store) *Service {
	return &Service{store: store}
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
