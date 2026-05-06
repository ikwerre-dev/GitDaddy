package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/gitdaddy/gitdaddy/internal/git"
	"github.com/gitdaddy/gitdaddy/internal/queue"
	"github.com/gitdaddy/gitdaddy/internal/storage"
	"github.com/gitdaddy/gitdaddy/internal/worker"
)

func main() {
	repoRoot := env("GITDADDY_REPO_ROOT", "/var/lib/gitdaddy/repos")
	objectRoot := env("GITDADDY_OBJECT_ROOT", "/var/lib/gitdaddy/objects")

	jobs := queue.NewMemoryQueue()
	processor := worker.NewProcessor(jobs, git.NewService(repoRoot), storage.NewLocalObjectStore(objectRoot))

	log.Println("gitdaddy worker started")
	for {
		if err := processor.ProcessOne(context.Background()); err != nil {
			log.Printf("worker idle/error: %v", err)
			time.Sleep(2 * time.Second)
		}
	}
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
