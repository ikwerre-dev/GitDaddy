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
	objects, objectMode, err := storage.NewFromEnv(storage.EnvConfig{
		ObjectRoot:    objectRoot,
		R2Endpoint:    os.Getenv("R2_ENDPOINT"),
		R2Bucket:      os.Getenv("R2_BUCKET"),
		R2AccessKeyID: os.Getenv("R2_ACCESS_KEY_ID"),
		R2SecretKey:   os.Getenv("R2_SECRET_ACCESS_KEY"),
		R2Region:      env("R2_REGION", "auto"),
	})
	if err != nil {
		log.Fatal(err)
	}

	jobs := queue.NewMemoryQueue()
	processor := worker.NewProcessor(jobs, git.NewService(repoRoot), objects)

	log.Printf("gitdaddy worker started with %s object storage", objectMode)
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
