package queue

import (
	"context"
	"testing"
)

func TestMemoryQueueFIFO(t *testing.T) {
	q := NewMemoryQueue()
	if err := q.Enqueue(context.Background(), Job{Type: "first"}); err != nil {
		t.Fatal(err)
	}
	if err := q.Enqueue(context.Background(), Job{Type: "second"}); err != nil {
		t.Fatal(err)
	}
	if q.Len() != 2 {
		t.Fatalf("expected 2 jobs, got %d", q.Len())
	}
	job, err := q.Dequeue(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if job.Type != "first" {
		t.Fatalf("expected first job, got %q", job.Type)
	}
}
