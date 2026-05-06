package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gitdaddy/gitdaddy/internal/api"
	"github.com/gitdaddy/gitdaddy/internal/auth"
	"github.com/gitdaddy/gitdaddy/internal/git"
	"github.com/gitdaddy/gitdaddy/internal/queue"
	"github.com/gitdaddy/gitdaddy/internal/repo"
	"github.com/gitdaddy/gitdaddy/internal/storage"
)

func main() {
	addr := env("GITDADDY_ADDR", ":8080")
	repoRoot := env("GITDADDY_REPO_ROOT", "/var/lib/gitdaddy/repos")
	objectRoot := env("GITDADDY_OBJECT_ROOT", "/var/lib/gitdaddy/objects")

	users := auth.NewMemoryUserStore()
	sessions := auth.NewMemorySessionStore()
	authn := auth.NewService(users, sessions)
	repos := repo.NewService(repo.NewMemoryStore())
	gitSvc := git.NewService(repoRoot)
	objects := storage.NewLocalObjectStore(objectRoot)
	jobs := queue.NewMemoryQueue()

	handler := api.NewServer(authn, repos, gitSvc, objects, jobs)
	log.Printf("gitdaddy backend listening on %s", addr)
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
