package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gitdaddy/gitdaddy/internal/api"
	"github.com/gitdaddy/gitdaddy/internal/auth"
	"github.com/gitdaddy/gitdaddy/internal/git"
	"github.com/gitdaddy/gitdaddy/internal/postgres"
	"github.com/gitdaddy/gitdaddy/internal/queue"
	"github.com/gitdaddy/gitdaddy/internal/repo"
	"github.com/gitdaddy/gitdaddy/internal/storage"
)

func main() {
	addr := env("GITDADDY_ADDR", ":8080")
	repoRoot := env("GITDADDY_REPO_ROOT", "/var/lib/gitdaddy/repos")
	objectRoot := env("GITDADDY_OBJECT_ROOT", "/var/lib/gitdaddy/objects")

	authn := auth.NewService(auth.NewMemoryUserStore(), auth.NewMemorySessionStore())
	repos := repo.NewService(repo.NewMemoryStore())
	if databaseURL := os.Getenv("DATABASE_URL"); databaseURL != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		pg, err := postgres.Open(ctx, databaseURL)
		if err != nil {
			log.Fatal(err)
		}
		defer pg.Close()
		authn = auth.NewServiceWithTokens(pg.Users(), pg.Sessions(), pg.Tokens())
		repos = repo.NewServiceWithStores(pg.Repos(), pg.Permissions(), pg.PullRequests())
	}
	gitSvc := git.NewService(repoRoot)
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
	jobs := queue.Queue(queue.NewMemoryQueue())
	if redisURL := os.Getenv("REDIS_URL"); redisURL != "" {
		redisQueue, err := queue.NewRedisQueue(redisURL, queue.DefaultRedisQueueKey)
		if err != nil {
			log.Fatal(err)
		}
		jobs = redisQueue
		log.Printf("gitdaddy backend using redis queue key=%s", queue.DefaultRedisQueueKey)
	} else {
		log.Printf("gitdaddy backend using in-memory queue; worker-service will not receive jobs across processes")
	}

	handler := api.NewServer(authn, repos, gitSvc, objects, jobs)
	log.Printf("gitdaddy backend listening on %s with %s object storage", addr, objectMode)
	if err := http.ListenAndServe(addr, handler.Routes()); err != nil {
		log.Fatal(err)
	}
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
