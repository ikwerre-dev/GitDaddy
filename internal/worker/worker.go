package worker

import (
	"context"
	"errors"
	"fmt"
	"log"
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
	key := fmt.Sprintf("repos/%s/%s%s", owner, name, p.compression.Extension())
	started := time.Now()
	log.Printf("r2 sync started owner=%s repo=%s key=%s compression=%s", owner, name, key, p.compression)
	snapshot, err := p.git.SnapshotWithOptions(owner, name, git.SnapshotOptions{Compression: p.compression})
	if err != nil {
		log.Printf("r2 sync snapshot failed owner=%s repo=%s key=%s error=%v", owner, name, key, err)
		return err
	}
	if err := p.objects.Put(ctx, key, snapshot); err != nil {
		log.Printf("r2 sync upload failed owner=%s repo=%s key=%s bytes=%d duration=%s error=%v", owner, name, key, len(snapshot), time.Since(started).Round(time.Millisecond), err)
		return err
	}
	log.Printf("r2 sync uploaded owner=%s repo=%s key=%s bytes=%d duration=%s", owner, name, key, len(snapshot), time.Since(started).Round(time.Millisecond))
	return nil
}
