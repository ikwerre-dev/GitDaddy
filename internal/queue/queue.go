package queue

import (
	"context"
	"errors"
	"sync"
)

type Job struct {
	Type  string            `json:"type"`
	Attrs map[string]string `json:"attrs"`
}

type Queue interface {
	Enqueue(context.Context, Job) error
	Dequeue(context.Context) (Job, error)
}

type MemoryQueue struct {
	mu   sync.Mutex
	jobs []Job
}

func NewMemoryQueue() *MemoryQueue {
	return &MemoryQueue{jobs: []Job{}}
}

func (q *MemoryQueue) Enqueue(_ context.Context, job Job) error {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.jobs = append(q.jobs, job)
	return nil
}

func (q *MemoryQueue) Dequeue(_ context.Context) (Job, error) {
	q.mu.Lock()
	defer q.mu.Unlock()
	if len(q.jobs) == 0 {
		return Job{}, errors.New("queue empty")
	}
	job := q.jobs[0]
	q.jobs = q.jobs[1:]
	return job, nil
}

func (q *MemoryQueue) Len() int {
	q.mu.Lock()
	defer q.mu.Unlock()
	return len(q.jobs)
}
