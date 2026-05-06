package storage

import (
	"context"
	"os"
	"path/filepath"
)

type ObjectStore interface {
	Put(context.Context, string, []byte) error
	Get(context.Context, string) ([]byte, error)
}

type LocalObjectStore struct {
	root string
}

func NewLocalObjectStore(root string) *LocalObjectStore {
	return &LocalObjectStore{root: root}
}

func (s *LocalObjectStore) Put(_ context.Context, key string, body []byte) error {
	path := filepath.Join(s.root, key)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, body, 0o644)
}

func (s *LocalObjectStore) Get(_ context.Context, key string) ([]byte, error) {
	return os.ReadFile(filepath.Join(s.root, key))
}
