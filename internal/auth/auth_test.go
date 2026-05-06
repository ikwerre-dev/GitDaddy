package auth

import (
	"context"
	"testing"
	"time"
)

func TestRegisterLoginAndCurrentUser(t *testing.T) {
	ctx := context.Background()
	service := NewService(NewMemoryUserStore(), NewMemorySessionStore())

	created, err := service.Register(ctx, "Alice", "alice@example.com", "secret")
	if err != nil {
		t.Fatal(err)
	}
	if created.Username != "alice" {
		t.Fatalf("expected normalized username, got %q", created.Username)
	}

	token, user, err := service.Login(ctx, "alice", "secret")
	if err != nil {
		t.Fatal(err)
	}
	if token == "" || user.ID != created.ID {
		t.Fatalf("unexpected login result token=%q user=%+v", token, user)
	}

	current, err := service.CurrentUser(ctx, token)
	if err != nil {
		t.Fatal(err)
	}
	if current.Username != "alice" {
		t.Fatalf("expected alice, got %q", current.Username)
	}

	tokenMeta, secret, err := service.CreateToken(ctx, created.ID, "laptop", 24*time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	if tokenMeta.Prefix == "" || secret == "" {
		t.Fatalf("expected token prefix and secret")
	}
	gitUser, err := service.AuthenticateGit(ctx, "alice", secret)
	if err != nil {
		t.Fatal(err)
	}
	if gitUser.ID != created.ID {
		t.Fatalf("expected git auth user %d, got %d", created.ID, gitUser.ID)
	}
}
