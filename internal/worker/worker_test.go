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

func TestProcessorSyncsRepositorySnapshot(t *testing.T) {
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
	if _, err := os.Stat(filepath.Join(objectRoot, "repos", "alice", "demo.tar.gz")); err != nil {
		t.Fatal(err)
	}
}
