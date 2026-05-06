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
	compression := git.ParseSnapshotCompression(env("GITDADDY_SNAPSHOT_COMPRESSION", "lz4"))

	jobs := queue.Queue(queue.NewMemoryQueue())
	if redisURL := os.Getenv("REDIS_URL"); redisURL != "" {
		redisQueue, err := queue.NewRedisQueue(redisURL, queue.DefaultRedisQueueKey)
		if err != nil {
			log.Fatal(err)
		}
		jobs = redisQueue
		log.Printf("gitdaddy worker using redis queue key=%s", queue.DefaultRedisQueueKey)
	} else {
		log.Printf("gitdaddy worker using in-memory queue; backend jobs will not arrive across processes")
	}
	processor := worker.NewProcessorWithCompression(jobs, git.NewService(repoRoot), objects, compression)

	log.Printf("gitdaddy worker started with %s object storage and %s snapshots", objectMode, compression)
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
