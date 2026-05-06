package worker

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/gitdaddy/gitdaddy/internal/git"
	"github.com/gitdaddy/gitdaddy/internal/queue"
	"github.com/gitdaddy/gitdaddy/internal/storage"
)

type Processor struct {
	queue       queue.Queue
	git         *git.Service
	objects     storage.ObjectStore
	compression git.SnapshotCompression
}

func NewProcessor(queue queue.Queue, gitService *git.Service, objects storage.ObjectStore) *Processor {
	return NewProcessorWithCompression(queue, gitService, objects, git.SnapshotCompressionGzip)
}

func NewProcessorWithCompression(queue queue.Queue, gitService *git.Service, objects storage.ObjectStore, compression git.SnapshotCompression) *Processor {
	if compression == "" {
		compression = git.SnapshotCompressionGzip
	}
	return &Processor{queue: queue, git: gitService, objects: objects, compression: compression}
}

func (p *Processor) ProcessOne(ctx context.Context) error {
	job, err := p.queue.Dequeue(ctx)
	if err != nil {
		return err
	}
	if job.Type != "repo.sync" {
		return errors.New("unknown job type")
	}
	owner := job.Attrs["owner"]
	name := job.Attrs["repo"]
	started := time.Now()
	prefix := fmt.Sprintf("repos/%s/%s/git", owner, name)
	log.Printf("r2 git sync started owner=%s repo=%s prefix=%s", owner, name, prefix)
	result, err := p.syncGitDatabase(ctx, owner, name, prefix)
	if err != nil {
		log.Printf("r2 git sync failed owner=%s repo=%s prefix=%s duration=%s error=%v", owner, name, prefix, time.Since(started).Round(time.Millisecond), err)
		return err
	}
	log.Printf("r2 git sync complete owner=%s repo=%s prefix=%s uploaded=%d skipped=%d deleted=%d bytes=%d duration=%s", owner, name, prefix, result.Uploaded, result.Skipped, result.Deleted, result.Bytes, time.Since(started).Round(time.Millisecond))
	return nil
}

type syncResult struct {
	Uploaded int
	Skipped  int
	Deleted  int
	Bytes    int64
}

func (p *Processor) syncGitDatabase(ctx context.Context, owner, name, prefix string) (syncResult, error) {
	repoPath, err := p.git.RepoPath(owner, name)
	if err != nil {
		return syncResult{}, err
	}
	var result syncResult
	current := map[string]struct{}{}
	err = filepath.WalkDir(repoPath, func(path string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		rel, err := filepath.Rel(repoPath, path)
		if err != nil {
			return err
		}
		if rel == "." {
			return nil
		}
		rel = filepath.ToSlash(rel)
		if entry.IsDir() {
			if skipGitDir(rel) {
				return filepath.SkipDir
			}
			return nil
		}
		if skipGitFile(rel) {
			return nil
		}
		body, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		key := prefix + "/" + rel
		current[key] = struct{}{}
		changed, err := p.putIfChanged(ctx, key, body)
		if err != nil {
			return err
		}
		if changed {
			result.Uploaded++
			result.Bytes += int64(len(body))
			log.Printf("r2 git object uploaded key=%s bytes=%d", key, len(body))
		} else {
			result.Skipped++
		}
		return nil
	})
	if err != nil {
		return result, err
	}
	deleted, err := p.deleteStaleArtifacts(ctx, prefix, current)
	if err != nil {
		return result, err
	}
	result.Deleted = deleted
	if err := p.writeManifest(ctx, prefix, current); err != nil {
		return result, err
	}
	return result, nil
}

func (p *Processor) putIfChanged(ctx context.Context, key string, body []byte) (bool, error) {
	current, err := p.objects.Get(ctx, key)
	if err == nil && bytes.Equal(current, body) {
		return false, nil
	}
	if err := p.objects.Put(ctx, key, body); err != nil {
		return false, err
	}
	return true, nil
}

func skipGitDir(path string) bool {
	return path == "hooks" || path == "logs" || path == "rr-cache" || strings.HasPrefix(path, "objects/tmp")
}

func skipGitFile(path string) bool {
	return strings.HasSuffix(path, ".lock") || strings.Contains(path, "/tmp_")
}

func (p *Processor) deleteStaleArtifacts(ctx context.Context, prefix string, current map[string]struct{}) (int, error) {
	previous, err := p.readManifest(ctx, prefix)
	if err != nil {
		return 0, nil
	}
	deleted := 0
	for _, key := range previous {
		if _, ok := current[key]; ok || key == manifestKey(prefix) {
			continue
		}
		if err := p.objects.Delete(ctx, key); err != nil {
			return deleted, err
		}
		deleted++
		log.Printf("r2 git artifact deleted key=%s", key)
	}
	return deleted, nil
}

func (p *Processor) readManifest(ctx context.Context, prefix string) ([]string, error) {
	body, err := p.objects.Get(ctx, manifestKey(prefix))
	if err != nil {
		return nil, err
	}
	var keys []string
	if err := json.Unmarshal(body, &keys); err != nil {
		return nil, err
	}
	return keys, nil
}

func (p *Processor) writeManifest(ctx context.Context, prefix string, current map[string]struct{}) error {
	keys := make([]string, 0, len(current))
	for key := range current {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	body, err := json.MarshalIndent(keys, "", "  ")
	if err != nil {
		return err
	}
	return p.objects.Put(ctx, manifestKey(prefix), body)
}

func manifestKey(prefix string) string {
	return prefix + "/.gitdaddy-manifest.json"
}
