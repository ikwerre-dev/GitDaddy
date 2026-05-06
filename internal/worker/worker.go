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
	queue   queue.Queue
	git     *git.Service
	objects storage.ObjectStore
}

func NewProcessor(queue queue.Queue, git *git.Service, objects storage.ObjectStore) *Processor {
	return &Processor{queue: queue, git: git, objects: objects}
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
	snapshot, err := p.git.Snapshot(owner, name)
	if err != nil {
		return err
	}
	return p.objects.Put(ctx, fmt.Sprintf("repos/%s/%s.tar.gz", owner, name), snapshot)
}
