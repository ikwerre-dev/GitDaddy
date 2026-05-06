package api

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gitdaddy/gitdaddy/internal/auth"
	"github.com/gitdaddy/gitdaddy/internal/git"
	"github.com/gitdaddy/gitdaddy/internal/queue"
	"github.com/gitdaddy/gitdaddy/internal/repo"
	"github.com/gitdaddy/gitdaddy/internal/storage"
)

func TestAPIRegisterLoginRepoAndPushFlow(t *testing.T) {
	authSvc := auth.NewService(auth.NewMemoryUserStore(), auth.NewMemorySessionStore())
	repoSvc := repo.NewService(repo.NewMemoryStore())
	jobs := queue.NewMemoryQueue()
	server := NewServer(authSvc, repoSvc, git.NewService(t.TempDir()), storage.NewLocalObjectStore(t.TempDir()), jobs)
	ts := httptest.NewServer(server.Routes())
	defer ts.Close()

	post(t, ts.URL+"/api/register", "", map[string]string{"username": "alice", "email": "a@example.com", "password": "secret"}, http.StatusCreated)
	login := post(t, ts.URL+"/api/login", "", map[string]string{"username": "alice", "password": "secret"}, http.StatusOK)
	token := login["token"].(string)
	post(t, ts.URL+"/api/repos", token, map[string]string{"name": "demo", "visibility": "private"}, http.StatusCreated)
	raw(t, http.MethodGet, ts.URL+"/git/alice/demo.git/info/refs?service=git-upload-pack", "", "", http.StatusUnauthorized)
	raw(t, http.MethodGet, ts.URL+"/git/alice/demo.git/info/refs?service=git-upload-pack", "alice", "secret", http.StatusOK)
	raw(t, http.MethodGet, ts.URL+"/git/alice/demo.git/info/refs?service=git-receive-pack", "", "", http.StatusUnauthorized)
	raw(t, http.MethodGet, ts.URL+"/git/alice/demo.git/info/refs?service=git-receive-pack", "alice", "secret", http.StatusOK)
	patch(t, ts.URL+"/api/repos/alice/demo", token, map[string]string{"visibility": "public"}, http.StatusOK)
	raw(t, http.MethodGet, ts.URL+"/git/alice/demo.git/info/refs?service=git-upload-pack", "", "", http.StatusOK)
	get(t, ts.URL+"/api/repos/alice/demo/stats", token, http.StatusOK)
	stats := get(t, ts.URL+"/api/stats", token, http.StatusOK)
	if stats["repositories"].(float64) != 1 {
		t.Fatalf("expected one repository, got %+v", stats)
	}
	if jobs.Len() != 0 {
		t.Fatalf("expected no sync jobs before a git receive-pack POST, got %d", jobs.Len())
	}
	del(t, ts.URL+"/api/repos/alice/demo", token, http.StatusOK)
	post(t, ts.URL+"/api/logout", token, map[string]string{}, http.StatusOK)
	get(t, ts.URL+"/api/whoami", token, http.StatusUnauthorized)
}

func post(t *testing.T, url, token string, body any, status int) map[string]any {
	t.Helper()
	return requestJSON(t, http.MethodPost, url, token, body, status)
}

func patch(t *testing.T, url, token string, body any, status int) map[string]any {
	t.Helper()
	return requestJSON(t, http.MethodPatch, url, token, body, status)
}

func del(t *testing.T, url, token string, status int) map[string]any {
	t.Helper()
	return requestJSON(t, http.MethodDelete, url, token, nil, status)
}

func get(t *testing.T, url, token string, status int) map[string]any {
	t.Helper()
	return requestJSON(t, http.MethodGet, url, token, nil, status)
}

func requestJSON(t *testing.T, method, url, token string, body any, status int) map[string]any {
	t.Helper()
	payload, err := json.Marshal(body)
	if err != nil {
		t.Fatal(err)
	}
	var reader io.Reader
	if body != nil {
		reader = bytes.NewReader(payload)
	}
	req, err := http.NewRequest(method, url, reader)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var decoded map[string]any
	if err := json.NewDecoder(res.Body).Decode(&decoded); err != nil {
		t.Fatal(err)
	}
	if res.StatusCode != status {
		t.Fatalf("expected %d got %d: %+v", status, res.StatusCode, decoded)
	}
	return decoded
}

func raw(t *testing.T, method, url, username, password string, status int) {
	t.Helper()
	req, err := http.NewRequest(method, url, nil)
	if err != nil {
		t.Fatal(err)
	}
	if username != "" {
		req.SetBasicAuth(username, password)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != status {
		body, _ := io.ReadAll(res.Body)
		t.Fatalf("expected %d got %d: %s", status, res.StatusCode, body)
	}
}
