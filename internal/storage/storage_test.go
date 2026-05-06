package storage

import (
	"context"
	"testing"
)

func TestLocalObjectStorePutGet(t *testing.T) {
	store := NewLocalObjectStore(t.TempDir())
	if err := store.Put(context.Background(), "repos/alice/demo.tar.gz", []byte("snapshot")); err != nil {
		t.Fatal(err)
	}
	body, err := store.Get(context.Background(), "repos/alice/demo.tar.gz")
	if err != nil {
		t.Fatal(err)
	}
	if string(body) != "snapshot" {
		t.Fatalf("unexpected body %q", body)
	}
}
