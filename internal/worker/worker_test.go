package worker

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/gitdaddy/gitdaddy/internal/git"
	"github.com/gitdaddy/gitdaddy/internal/queue"
	"github.com/gitdaddy/gitdaddy/internal/storage"
)

func TestProcessorSyncsGitDatabaseArtifacts(t *testing.T) {
	repoRoot := t.TempDir()
	objectRoot := t.TempDir()
	repoPath := filepath.Join(repoRoot, "alice", "demo.git")
	if err := os.MkdirAll(repoPath, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(repoPath, "HEAD"), []byte("ref: refs/heads/main\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	jobs := queue.NewMemoryQueue()
	if err := jobs.Enqueue(context.Background(), queue.Job{Type: "repo.sync", Attrs: map[string]string{"owner": "alice", "repo": "demo"}}); err != nil {
		t.Fatal(err)
	}

	processor := NewProcessor(jobs, git.NewService(repoRoot), storage.NewLocalObjectStore(objectRoot))
	if err := processor.ProcessOne(context.Background()); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(objectRoot, "repos", "alice", "demo", "git", "HEAD")); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(objectRoot, "repos", "alice", "demo", "git", "objects")); err == nil {
		t.Fatal("object sync should write files, not mirror directories as objects")
	}
}

func TestProcessorSkipsUnchangedGitArtifacts(t *testing.T) {
	repoRoot := t.TempDir()
	objectRoot := t.TempDir()
	repoPath := filepath.Join(repoRoot, "alice", "demo.git")
	if err := os.MkdirAll(repoPath, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(repoPath, "HEAD"), []byte("ref: refs/heads/main\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	jobs := queue.NewMemoryQueue()
	processor := NewProcessor(jobs, git.NewService(repoRoot), storage.NewLocalObjectStore(objectRoot))
	for i := 0; i < 2; i++ {
		if err := jobs.Enqueue(context.Background(), queue.Job{Type: "repo.sync", Attrs: map[string]string{"owner": "alice", "repo": "demo"}}); err != nil {
			t.Fatal(err)
		}
		if err := processor.ProcessOne(context.Background()); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := os.Stat(filepath.Join(objectRoot, "repos", "alice", "demo", "git", "HEAD")); err != nil {
		t.Fatal(err)
	}
}
