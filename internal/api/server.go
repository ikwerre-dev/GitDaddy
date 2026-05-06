package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

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
	metrics metrics
	limits  *rateLimiter
}

func NewServer(auth *auth.Service, repos *repo.Service, git *git.Service, objects storage.ObjectStore, queue queue.Queue) *Server {
	return &Server{auth: auth, repos: repos, git: git, objects: objects, queue: queue, limits: newRateLimiter()}
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
	mux.HandleFunc("POST /api/tokens", s.createToken)
	mux.HandleFunc("GET /api/tokens", s.listTokens)
	mux.HandleFunc("DELETE /api/tokens/{id}", s.deleteToken)
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
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/collaborators", s.listCollaborators)
	mux.HandleFunc("PUT /api/repos/{owner}/{repo}/collaborators/{username}", s.grantCollaborator)
	mux.HandleFunc("DELETE /api/repos/{owner}/{repo}/collaborators/{username}", s.revokeCollaborator)
	mux.HandleFunc("GET /metrics", s.metricsHandler)
	mux.HandleFunc("/git/", s.gitHTTP)
	return s.observe(securityHeaders(cors(mux)))
}

func (s *Server) register(w http.ResponseWriter, r *http.Request) {
	if !s.allowAuthAttempt(w, r, "register", 10, time.Minute) {
		return
	}
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
	if !s.allowAuthAttempt(w, r, "login", 12, time.Minute) {
		return
	}
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

func (s *Server) createToken(w http.ResponseWriter, r *http.Request) {
	user, ok := s.currentUser(w, r)
	if !ok {
		return
	}
	var req struct {
		Name    string `json:"name"`
		Expires int64  `json:"expires_in_days"`
	}
	if !decode(w, r, &req) {
		return
	}
	days := req.Expires
	if days <= 0 {
		days = 90
	}
	token, plaintext, err := s.auth.CreateToken(r.Context(), user.ID, req.Name, time.Duration(days)*24*time.Hour)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"token": token, "secret": plaintext})
}

func (s *Server) listTokens(w http.ResponseWriter, r *http.Request) {
	user, ok := s.currentUser(w, r)
	if !ok {
		return
	}
	tokens, err := s.auth.ListTokens(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, tokens)
}

func (s *Server) deleteToken(w http.ResponseWriter, r *http.Request) {
	user, ok := s.currentUser(w, r)
	if !ok {
		return
	}
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if err := s.auth.DeleteToken(r.Context(), user.ID, id); err != nil {
		writeError(w, http.StatusNotFound, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
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
	if !ok || !s.requireRepoRole(w, r, repository, repo.RoleAdmin) {
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
	if !ok || !s.requireRepoRole(w, r, repository, repo.RoleAdmin) {
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

func (s *Server) listCollaborators(w http.ResponseWriter, r *http.Request) {
	_, repository, ok := s.resolveRepo(w, r)
	if !ok || !s.requireRepoRole(w, r, repository, repo.RoleAdmin) {
		return
	}
	permissions, err := s.repos.ListPermissions(r.Context(), repository.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, permissions)
}

func (s *Server) grantCollaborator(w http.ResponseWriter, r *http.Request) {
	_, repository, ok := s.resolveRepo(w, r)
	if !ok || !s.requireRepoRole(w, r, repository, repo.RoleAdmin) {
		return
	}
	collaborator, err := s.auth.FindByUsername(r.Context(), r.PathValue("username"))
	if err != nil {
		writeError(w, http.StatusNotFound, err)
		return
	}
	var req struct{ Role repo.Role }
	if !decode(w, r, &req) {
		return
	}
	if err := s.repos.Grant(r.Context(), repository.ID, collaborator.ID, req.Role); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "granted"})
}

func (s *Server) revokeCollaborator(w http.ResponseWriter, r *http.Request) {
	_, repository, ok := s.resolveRepo(w, r)
	if !ok || !s.requireRepoRole(w, r, repository, repo.RoleAdmin) {
		return
	}
	collaborator, err := s.auth.FindByUsername(r.Context(), r.PathValue("username"))
	if err != nil {
		writeError(w, http.StatusNotFound, err)
		return
	}
	if err := s.repos.Revoke(r.Context(), repository.ID, collaborator.ID); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "revoked"})
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
		if receivePack && !s.repos.CanWrite(r.Context(), repository, user.ID) {
			http.Error(w, "write permission required", http.StatusForbidden)
			return
		}
		if !receivePack && !s.repos.CanRead(r.Context(), repository, user.ID) {
			http.Error(w, "read permission required", http.StatusForbidden)
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
		user, ok := s.currentUser(w, r)
		if !ok {
			return auth.User{}, repo.Repository{}, false
		}
		if !s.repos.CanRead(r.Context(), repository, user.ID) {
			writeError(w, http.StatusForbidden, errString("read permission required"))
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
	if !s.allowAuthAttempt(w, r, "git-basic", 120, time.Minute) {
		return auth.User{}, false
	}
	username, password, ok := r.BasicAuth()
	if !ok {
		w.Header().Set("WWW-Authenticate", `Basic realm="GitDaddy Git"`)
		http.Error(w, "authentication required", http.StatusUnauthorized)
		return auth.User{}, false
	}
	user, err := s.auth.AuthenticateGit(r.Context(), username, password)
	if err != nil {
		w.Header().Set("WWW-Authenticate", `Basic realm="GitDaddy Git"`)
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return auth.User{}, false
	}
	return user, true
}

func (s *Server) requireRepoRole(w http.ResponseWriter, r *http.Request, repository repo.Repository, role repo.Role) bool {
	user, ok := s.currentUser(w, r)
	if !ok {
		return false
	}
	allowed := false
	switch role {
	case repo.RoleRead:
		allowed = s.repos.CanRead(r.Context(), repository, user.ID)
	case repo.RoleWrite:
		allowed = s.repos.CanWrite(r.Context(), repository, user.ID)
	case repo.RoleAdmin:
		allowed = s.repos.CanAdmin(r.Context(), repository, user.ID)
	}
	if !allowed {
		writeError(w, http.StatusForbidden, errString(fmt.Sprintf("%s permission required", role)))
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
	if strings.Contains(path, "\\") || strings.Contains(path, "\x00") {
		return "", "", false
	}
	for _, part := range strings.Split(path, "/") {
		if part == ".." {
			return "", "", false
		}
	}
	parts := strings.Split(strings.TrimPrefix(path, "/git/"), "/")
	if len(parts) < 2 {
		return "", "", false
	}
	if !strings.HasSuffix(parts[1], ".git") {
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
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(v); err != nil {
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

type metrics struct {
	requests    uint64
	errors      uint64
	gitRequests uint64
}

func (s *Server) observe(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddUint64(&s.metrics.requests, 1)
		if strings.HasPrefix(r.URL.Path, "/git/") {
			atomic.AddUint64(&s.metrics.gitRequests, 1)
		}
		recorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(recorder, r)
		if recorder.status >= 500 {
			atomic.AddUint64(&s.metrics.errors, 1)
		}
	})
}

func (s *Server) metricsHandler(w http.ResponseWriter, _ *http.Request) {
	if os.Getenv("GITDADDY_PUBLIC_METRICS") != "true" {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "text/plain; version=0.0.4")
	fmt.Fprintf(w, "gitdaddy_http_requests_total %d\n", atomic.LoadUint64(&s.metrics.requests))
	fmt.Fprintf(w, "gitdaddy_http_errors_total %d\n", atomic.LoadUint64(&s.metrics.errors))
	fmt.Fprintf(w, "gitdaddy_git_requests_total %d\n", atomic.LoadUint64(&s.metrics.gitRequests))
	if sized, ok := s.queue.(interface{ Len() int }); ok {
		fmt.Fprintf(w, "gitdaddy_queue_depth %d\n", sized.Len())
	}
}

func writeError(w http.ResponseWriter, status int, err error) {
	writeJSON(w, status, map[string]string{"error": err.Error()})
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && allowedOrigin(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}
		w.Header().Set("Vary", "Origin")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'; base-uri 'self'")
		if r.TLS != nil {
			w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		next.ServeHTTP(w, r)
	})
}

func allowedOrigin(origin string) bool {
	configured := strings.TrimSpace(os.Getenv("GITDADDY_ALLOWED_ORIGINS"))
	if configured == "" {
		configured = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3002,http://127.0.0.1:3002"
	}
	for _, allowed := range strings.Split(configured, ",") {
		if strings.TrimSpace(allowed) == origin {
			return true
		}
	}
	return false
}

func (s *Server) allowAuthAttempt(w http.ResponseWriter, r *http.Request, scope string, limit int, window time.Duration) bool {
	key := scope + ":" + clientIP(r)
	if s.limits.allow(key, limit, window) {
		return true
	}
	writeError(w, http.StatusTooManyRequests, errString("too many attempts"))
	return false
}

func clientIP(r *http.Request) string {
	if os.Getenv("GITDADDY_TRUST_PROXY_HEADERS") == "true" {
		if forwarded := strings.TrimSpace(strings.Split(r.Header.Get("X-Forwarded-For"), ",")[0]); forwarded != "" {
			return forwarded
		}
	}
	if realIP := strings.TrimSpace(r.Header.Get("X-Real-IP")); os.Getenv("GITDADDY_TRUST_PROXY_HEADERS") == "true" && realIP != "" {
		return realIP
	}
	host := r.RemoteAddr
	if idx := strings.LastIndex(host, ":"); idx > -1 {
		return host[:idx]
	}
	return host
}

type rateLimiter struct {
	mu       sync.Mutex
	attempts map[string]rateState
}

type rateState struct {
	windowStart time.Time
	count       int
}

func newRateLimiter() *rateLimiter {
	return &rateLimiter{attempts: map[string]rateState{}}
}

func (l *rateLimiter) allow(key string, limit int, window time.Duration) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := time.Now()
	state := l.attempts[key]
	if state.windowStart.IsZero() || now.Sub(state.windowStart) > window {
		l.attempts[key] = rateState{windowStart: now, count: 1}
		return true
	}
	if state.count >= limit {
		return false
	}
	state.count++
	l.attempts[key] = state
	return true
}
