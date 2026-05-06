package worker

import (
	"context"
	"errors"
	"fmt"

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

func NewProcessor(queue queue.Queue, git *git.Service, objects storage.ObjectStore) *Processor {
	return NewProcessorWithCompression(queue, git, objects, git.SnapshotCompressionGzip)
}

func NewProcessorWithCompression(queue queue.Queue, git *git.Service, objects storage.ObjectStore, compression git.SnapshotCompression) *Processor {
	if compression == "" {
		compression = git.SnapshotCompressionGzip
	}
	return &Processor{queue: queue, git: git, objects: objects, compression: compression}
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
	snapshot, err := p.git.SnapshotWithOptions(owner, name, git.SnapshotOptions{Compression: p.compression})
	if err != nil {
		return err
	}
	return p.objects.Put(ctx, fmt.Sprintf("repos/%s/%s%s", owner, name, p.compression.Extension()), snapshot)
}
