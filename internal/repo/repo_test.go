package repo

import (
	"context"
	"testing"
)

func TestCreateAndListRepositories(t *testing.T) {
	service := NewService(NewMemoryStore())
	created, err := service.Create(context.Background(), 42, "demo.repo", "public")
	if err != nil {
		t.Fatal(err)
	}
	if created.Visibility != "public" {
		t.Fatalf("expected public visibility, got %q", created.Visibility)
	}

	repos, err := service.ListByOwner(context.Background(), 42)
	if err != nil {
		t.Fatal(err)
	}
	if len(repos) != 1 || repos[0].Name != "demo.repo" {
		t.Fatalf("unexpected repos: %+v", repos)
	}

	updated, err := service.UpdateVisibility(context.Background(), 42, "demo.repo", "private")
	if err != nil {
		t.Fatal(err)
	}
	if updated.Visibility != "private" {
		t.Fatalf("expected private visibility, got %q", updated.Visibility)
	}

	count, err := service.CountByOwner(context.Background(), 42)
	if err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("expected one repo, got %d", count)
	}

	if err := service.Delete(context.Background(), 42, "demo.repo"); err != nil {
		t.Fatal(err)
	}
	count, err = service.CountByOwner(context.Background(), 42)
	if err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatalf("expected no repos, got %d", count)
	}
}

func TestRejectsUnsafeRepositoryNames(t *testing.T) {
	service := NewService(NewMemoryStore())
	if _, err := service.Create(context.Background(), 1, "../demo", "private"); err == nil {
		t.Fatal("expected invalid repository name error")
	}
}
