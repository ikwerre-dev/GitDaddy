package main

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/gitdaddy/gitdaddy/internal/git"
	"github.com/gitdaddy/gitdaddy/internal/storage"
)

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	store, mode, err := storage.NewFromEnv(storage.EnvConfig{
		ObjectRoot:      os.Getenv("GITDADDY_OBJECT_ROOT"),
		R2Endpoint:      os.Getenv("R2_ENDPOINT"),
		R2Bucket:        os.Getenv("R2_BUCKET"),
		R2AccessKeyID:   os.Getenv("R2_ACCESS_KEY_ID"),
		R2SecretKey:     os.Getenv("R2_SECRET_ACCESS_KEY"),
		R2Region:        env("R2_REGION", "auto"),
		ForceLocalStore: false,
	})
	if err != nil {
		log.Fatal(err)
	}
	if mode != "r2" {
		log.Fatal("R2 env is incomplete; set R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY")
	}

	root, err := os.MkdirTemp("", "gitdaddy-r2-smoke-*")
	if err != nil {
		log.Fatal(err)
	}
	defer os.RemoveAll(root)

	service := git.NewService(root)
	if err := service.InitBare(ctx, "smoke", "repo"); err != nil {
		log.Fatal(err)
	}
	repoPath, err := service.RepoPath("smoke", "repo")
	if err != nil {
		log.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(repoPath, "gitdaddy-smoke.txt"), []byte(time.Now().UTC().Format(time.RFC3339Nano)), 0o644); err != nil {
		log.Fatal(err)
	}
	if err := exec.CommandContext(ctx, "git", "--git-dir", repoPath, "update-server-info").Run(); err != nil {
		log.Fatal(err)
	}

	snapshot, err := service.Snapshot("smoke", "repo")
	if err != nil {
		log.Fatal(err)
	}
	key := fmt.Sprintf("smoke/gitdaddy-%d.tar.gz", time.Now().UnixNano())
	if err := store.Put(ctx, key, snapshot); err != nil {
		log.Fatal(err)
	}
	downloaded, err := store.Get(ctx, key)
	if err != nil {
		log.Fatal(err)
	}
	if !bytes.Equal(snapshot, downloaded) {
		log.Fatalf("R2 round trip mismatch: uploaded %d bytes, downloaded %d bytes", len(snapshot), len(downloaded))
	}
	fmt.Printf("R2 smoke test passed: key=%s bytes=%d\n", key, len(downloaded))
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
