package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/gitdaddy/gitdaddy/internal/auth"
	"github.com/gitdaddy/gitdaddy/internal/git"
	"github.com/gitdaddy/gitdaddy/internal/queue"
	"github.com/gitdaddy/gitdaddy/internal/repo"
	"github.com/gitdaddy/gitdaddy/internal/storage"
)

type Server struct {
	auth    *auth.Service
	repos   *repo.Service
	git     *git.Service
	objects storage.ObjectStore
	queue   queue.Queue
}

func NewServer(auth *auth.Service, repos *repo.Service, git *git.Service, objects storage.ObjectStore, queue queue.Queue) *Server {
	return &Server{auth: auth, repos: repos, git: git, objects: objects, queue: queue}
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("POST /api/register", s.register)
	mux.HandleFunc("POST /api/login", s.login)
	mux.HandleFunc("POST /api/logout", s.logout)
	mux.HandleFunc("GET /api/whoami", s.whoami)
	mux.HandleFunc("GET /api/stats", s.platformStats)
	mux.HandleFunc("POST /api/repos", s.createRepo)
	mux.HandleFunc("GET /api/repos", s.listRepos)
	mux.HandleFunc("GET /api/repos/{owner}/{repo}", s.getRepo)
	mux.HandleFunc("PATCH /api/repos/{owner}/{repo}", s.updateRepo)
	mux.HandleFunc("DELETE /api/repos/{owner}/{repo}", s.deleteRepo)
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/branches", s.repoBranches)
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/commits", s.repoCommits)
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/tree", s.repoTree)
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/file", s.repoFile)
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/diff", s.repoDiff)
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/stats", s.repoStats)
	mux.HandleFunc("/git/", s.gitHTTP)
	return cors(mux)
}

func (s *Server) register(w http.ResponseWriter, r *http.Request) {
	var req struct{ Username, Email, Password string }
	if !decode(w, r, &req) {
		return
	}
	user, err := s.auth.Register(r.Context(), req.Username, req.Email, req.Password)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusCreated, user)
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	var req struct{ Username, Password string }
	if !decode(w, r, &req) {
		return
	}
	token, user, err := s.auth.Login(r.Context(), req.Username, req.Password)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"token": token, "user": user})
}

func (s *Server) logout(w http.ResponseWriter, r *http.Request) {
	token, ok := bearerToken(w, r)
	if !ok {
		return
	}
	if err := s.auth.Logout(r.Context(), token); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "logged out"})
}

func (s *Server) whoami(w http.ResponseWriter, r *http.Request) {
	user, ok := s.currentUser(w, r)
	if !ok {
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (s *Server) platformStats(w http.ResponseWriter, r *http.Request) {
	user, ok := s.currentUser(w, r)
	if !ok {
		return
	}
	repoCount, err := s.repos.CountByOwner(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	pendingJobs := 0
	if sized, ok := s.queue.(interface{ Len() int }); ok {
		pendingJobs = sized.Len()
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"repositories":  repoCount,
		"pending_jobs":  pendingJobs,
		"storage":       "async",
		"git_transport": "smart-http",
	})
}

func (s *Server) createRepo(w http.ResponseWriter, r *http.Request) {
	user, ok := s.currentUser(w, r)
	if !ok {
		return
	}
	var req struct{ Name, Visibility string }
	if !decode(w, r, &req) {
		return
	}
	repository, err := s.repos.Create(r.Context(), user.ID, req.Name, req.Visibility)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if err := s.git.InitBare(r.Context(), user.Username, repository.Name); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusCreated, repository)
}

func (s *Server) listRepos(w http.ResponseWriter, r *http.Request) {
	user, ok := s.currentUser(w, r)
	if !ok {
		return
	}
	repos, err := s.repos.ListByOwner(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, repos)
}

func (s *Server) getRepo(w http.ResponseWriter, r *http.Request) {
	user, repository, ok := s.resolveRepo(w, r)
	if !ok {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"owner": user, "repository": repository})
}

func (s *Server) updateRepo(w http.ResponseWriter, r *http.Request) {
	owner, repository, ok := s.resolveRepo(w, r)
	if !ok || !s.requireOwner(w, r, owner.ID) {
		return
	}
	var req struct{ Visibility string }
	if !decode(w, r, &req) {
		return
	}
	updated, err := s.repos.UpdateVisibility(r.Context(), owner.ID, repository.Name, req.Visibility)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (s *Server) deleteRepo(w http.ResponseWriter, r *http.Request) {
	owner, repository, ok := s.resolveRepo(w, r)
	if !ok || !s.requireOwner(w, r, owner.ID) {
		return
	}
	if err := s.repos.Delete(r.Context(), owner.ID, repository.Name); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	if err := s.git.Delete(owner.Username, repository.Name); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (s *Server) repoBranches(w http.ResponseWriter, r *http.Request) {
	owner, repository, ok := s.resolveRepo(w, r)
	if !ok {
		return
	}
	branches, err := s.git.Branches(r.Context(), owner.Username, repository.Name)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, branches)
}

func (s *Server) repoCommits(w http.ResponseWriter, r *http.Request) {
	owner, repository, ok := s.resolveRepo(w, r)
	if !ok {
		return
	}
	commits, err := s.git.Commits(r.Context(), owner.Username, repository.Name, r.URL.Query().Get("ref"), 30)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, commits)
}

func (s *Server) repoTree(w http.ResponseWriter, r *http.Request) {
	owner, repository, ok := s.resolveRepo(w, r)
	if !ok {
		return
	}
	entries, err := s.git.Tree(r.Context(), owner.Username, repository.Name, r.URL.Query().Get("ref"), r.URL.Query().Get("path"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusOK, entries)
}

func (s *Server) repoFile(w http.ResponseWriter, r *http.Request) {
	owner, repository, ok := s.resolveRepo(w, r)
	if !ok {
		return
	}
	content, err := s.git.File(r.Context(), owner.Username, repository.Name, r.URL.Query().Get("ref"), r.URL.Query().Get("path"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"content": content})
}

func (s *Server) repoDiff(w http.ResponseWriter, r *http.Request) {
	owner, repository, ok := s.resolveRepo(w, r)
	if !ok {
		return
	}
	diff, err := s.git.Diff(r.Context(), owner.Username, repository.Name, r.URL.Query().Get("commit"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"diff": diff})
}

func (s *Server) repoStats(w http.ResponseWriter, r *http.Request) {
	owner, repository, ok := s.resolveRepo(w, r)
	if !ok {
		return
	}
	stats, err := s.git.Stats(r.Context(), owner.Username, repository.Name)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, stats)
}

func (s *Server) gitHTTP(w http.ResponseWriter, r *http.Request) {
	ownerName, repoName, ok := gitPathParts(r.URL.Path)
	if !ok {
		http.NotFound(w, r)
		return
	}
	owner, err := s.auth.FindByUsername(r.Context(), ownerName)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	repository, err := s.repos.FindByOwnerAndName(r.Context(), owner.ID, repoName)
	if err != nil {
		http.NotFound(w, r)
		return
	}

	receivePack := isReceivePack(r)
	if receivePack || repository.Visibility == "private" {
		user, ok := s.basicUser(w, r)
		if !ok {
			return
		}
		if user.ID != owner.ID {
			http.Error(w, "repository owner required", http.StatusForbidden)
			return
		}
	}

	recorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
	s.git.ServeHTTP(recorder, r)
	if r.Method != http.MethodPost || recorder.status >= 400 || !receivePack {
		return
	}
	_ = s.queue.Enqueue(r.Context(), queue.Job{Type: "repo.sync", Attrs: map[string]string{"owner": owner.Username, "repo": repository.Name}})
}

func (s *Server) resolveRepo(w http.ResponseWriter, r *http.Request) (auth.User, repo.Repository, bool) {
	owner, err := s.auth.FindByUsername(r.Context(), r.PathValue("owner"))
	if err != nil {
		writeError(w, http.StatusNotFound, err)
		return auth.User{}, repo.Repository{}, false
	}
	repository, err := s.repos.FindByOwnerAndName(r.Context(), owner.ID, strings.TrimSuffix(r.PathValue("repo"), ".git"))
	if err != nil {
		writeError(w, http.StatusNotFound, err)
		return auth.User{}, repo.Repository{}, false
	}
	if repository.Visibility == "private" {
		if _, ok := s.currentUser(w, r); !ok {
			return auth.User{}, repo.Repository{}, false
		}
	}
	return owner, repository, true
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func (s *Server) currentUser(w http.ResponseWriter, r *http.Request) (auth.User, bool) {
	token, ok := bearerToken(w, r)
	if !ok {
		return auth.User{}, false
	}
	user, err := s.auth.CurrentUser(r.Context(), token)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err)
		return auth.User{}, false
	}
	return user, true
}

func (s *Server) basicUser(w http.ResponseWriter, r *http.Request) (auth.User, bool) {
	username, password, ok := r.BasicAuth()
	if !ok {
		w.Header().Set("WWW-Authenticate", `Basic realm="GitDaddy Git"`)
		http.Error(w, "authentication required", http.StatusUnauthorized)
		return auth.User{}, false
	}
	user, err := s.auth.AuthenticatePassword(r.Context(), username, password)
	if err != nil {
		w.Header().Set("WWW-Authenticate", `Basic realm="GitDaddy Git"`)
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return auth.User{}, false
	}
	return user, true
}

func (s *Server) requireOwner(w http.ResponseWriter, r *http.Request, ownerID int64) bool {
	user, ok := s.currentUser(w, r)
	if !ok {
		return false
	}
	if user.ID != ownerID {
		writeError(w, http.StatusForbidden, errString("repository owner required"))
		return false
	}
	return true
}

func bearerToken(w http.ResponseWriter, r *http.Request) (string, bool) {
	header := r.Header.Get("Authorization")
	token := strings.TrimPrefix(header, "Bearer ")
	if token == "" || token == header {
		writeError(w, http.StatusUnauthorized, errString("missing bearer token"))
		return "", false
	}
	return token, true
}

func gitPathParts(path string) (string, string, bool) {
	parts := strings.Split(strings.TrimPrefix(path, "/git/"), "/")
	if len(parts) < 2 {
		return "", "", false
	}
	repoName := strings.TrimSuffix(parts[1], ".git")
	if parts[0] == "" || repoName == "" || strings.Contains(parts[0], "..") || strings.Contains(repoName, "..") {
		return "", "", false
	}
	return parts[0], repoName, true
}

func isReceivePack(r *http.Request) bool {
	return strings.Contains(r.URL.RawQuery, "git-receive-pack") || strings.HasSuffix(r.URL.Path, "/git-receive-pack")
}

type errString string

func (e errString) Error() string { return string(e) }

func decode(w http.ResponseWriter, r *http.Request, v any) bool {
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return false
	}
	return true
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, err error) {
	writeJSON(w, status, map[string]string{"error": err.Error()})
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
