package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
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
	notes   notificationStore
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
	mux.HandleFunc("GET /api/notifications", s.notifications)
	mux.HandleFunc("GET /api/search/repos", s.searchRepos)
	mux.HandleFunc("GET /api/users/{username}/repos", s.publicUserRepos)
	mux.HandleFunc("POST /api/tokens", s.createToken)
	mux.HandleFunc("GET /api/tokens", s.listTokens)
	mux.HandleFunc("DELETE /api/tokens/{id}", s.deleteToken)
	mux.HandleFunc("POST /api/repos", s.createRepo)
	mux.HandleFunc("GET /api/repos", s.listRepos)
	mux.HandleFunc("GET /api/repos/{owner}/{repo}", s.getRepo)
	mux.HandleFunc("PATCH /api/repos/{owner}/{repo}", s.updateRepo)
	mux.HandleFunc("DELETE /api/repos/{owner}/{repo}", s.deleteRepo)
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/branches", s.repoBranches)
	mux.HandleFunc("POST /api/repos/{owner}/{repo}/branches", s.createBranch)
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/pulls", s.listPullRequests)
	mux.HandleFunc("POST /api/repos/{owner}/{repo}/pulls", s.createPullRequest)
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/pulls/{id}/review", s.reviewPullRequest)
	mux.HandleFunc("POST /api/repos/{owner}/{repo}/pulls/{id}/merge", s.mergePullRequest)
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/commits", s.repoCommits)
	mux.HandleFunc("POST /api/repos/{owner}/{repo}/commits/{commit}/rollback", s.rollbackCommit)
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/tree", s.repoTree)
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/file", s.repoFile)
	mux.HandleFunc("PUT /api/repos/{owner}/{repo}/file", s.commitFile)
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/diff", s.repoDiff)
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/stats", s.repoStats)
	mux.HandleFunc("POST /api/repos/{owner}/{repo}/sync", s.syncRepo)
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
	repositories, _ := s.repos.ListByOwner(r.Context(), user.ID)
	totalBranches := 0
	totalCommits := 0
	for _, repository := range repositories {
		stats, err := s.git.Stats(r.Context(), user.Username, repository.Name)
		if err != nil {
			continue
		}
		totalBranches += stats.Branches
		totalCommits += stats.Commits
	}
	pendingJobs := 0
	if sized, ok := s.queue.(interface{ Len() int }); ok {
		pendingJobs = sized.Len()
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"repositories":   repoCount,
		"total_branches": totalBranches,
		"total_commits":  totalCommits,
		"pending_jobs":   pendingJobs,
		"storage":        "async",
		"git_transport":  "smart-http",
	})
}

func (s *Server) notifications(w http.ResponseWriter, r *http.Request) {
	user, ok := s.currentUser(w, r)
	if !ok {
		return
	}
	writeJSON(w, http.StatusOK, s.notes.list(user.ID, 20))
}

func (s *Server) publicUserRepos(w http.ResponseWriter, r *http.Request) {
	user, err := s.auth.FindByUsername(r.Context(), r.PathValue("username"))
	if err != nil {
		writeError(w, http.StatusNotFound, err)
		return
	}
	repositories, err := s.repos.ListByOwner(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	publicRepos := []repo.Repository{}
	for _, repository := range repositories {
		if repository.Visibility == "public" {
			publicRepos = append(publicRepos, repository)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"user":         user,
		"repositories": publicRepos,
	})
}

func (s *Server) searchRepos(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	repositories, err := s.repos.SearchPublic(r.Context(), query, 20)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	results := []map[string]any{}
	for _, repository := range repositories {
		owner, err := s.auth.FindByID(r.Context(), repository.OwnerID)
		if err != nil {
			continue
		}
		results = append(results, map[string]any{
			"owner":      owner.Username,
			"repository": repository,
			"scope":      "public",
		})
	}
	writeJSON(w, http.StatusOK, results)
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
	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Visibility  string `json:"visibility"`
		AddReadme   bool   `json:"add_readme"`
	}
	if !decode(w, r, &req) {
		return
	}
	repository, err := s.repos.CreateWithDescription(r.Context(), user.ID, req.Name, req.Visibility, req.Description)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if err := s.git.InitBare(r.Context(), user.Username, repository.Name); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	if req.AddReadme {
		readme := "# " + repository.Name + "\n\n"
		if repository.Description != "" {
			readme += repository.Description + "\n"
		}
		if _, err := s.git.CommitFile(r.Context(), user.Username, repository.Name, "main", "README.md", readme, "Initial README", user.Username, user.Email); err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
	}
	s.addNotification(user.ID, repository.ID, user.Username, repository.Name, "Repository created", fmt.Sprintf("%s created %s", user.Username, repository.Name))
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
	if repos == nil {
		repos = []repo.Repository{}
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

func (s *Server) createBranch(w http.ResponseWriter, r *http.Request) {
	owner, repository, ok := s.resolveRepo(w, r)
	if !ok || !s.requireRepoRole(w, r, repository, repo.RoleWrite) {
		return
	}
	var req struct {
		Name string `json:"name"`
		From string `json:"from"`
	}
	if !decode(w, r, &req) {
		return
	}
	branch, err := s.git.CreateBranch(r.Context(), owner.Username, repository.Name, req.Name, req.From)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusCreated, branch)
}

func (s *Server) listPullRequests(w http.ResponseWriter, r *http.Request) {
	owner, repository, ok := s.resolveRepo(w, r)
	if !ok {
		return
	}
	pulls, err := s.repos.ListPullRequests(r.Context(), repository.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	if pulls == nil {
		pulls = []repo.PullRequest{}
	}
	response := make([]map[string]any, 0, len(pulls))
	for _, pull := range pulls {
		response = append(response, s.pullResponse(r.Context(), owner.Username, repository.Name, pull))
	}
	writeJSON(w, http.StatusOK, response)
}

func (s *Server) createPullRequest(w http.ResponseWriter, r *http.Request) {
	_, repository, ok := s.resolveRepo(w, r)
	if !ok || !s.requireRepoRole(w, r, repository, repo.RoleWrite) {
		return
	}
	user, ok := s.currentUser(w, r)
	if !ok {
		return
	}
	var req struct {
		Title  string `json:"title"`
		Body   string `json:"body"`
		Source string `json:"source"`
		Target string `json:"target"`
	}
	if !decode(w, r, &req) {
		return
	}
	pull, err := s.repos.CreatePullRequest(r.Context(), repository.ID, user.ID, req.Title, req.Body, req.Source, req.Target)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusCreated, pull)
}

func (s *Server) reviewPullRequest(w http.ResponseWriter, r *http.Request) {
	owner, repository, pull, ok := s.resolvePullRequest(w, r)
	if !ok {
		return
	}
	writeJSON(w, http.StatusOK, s.pullResponse(r.Context(), owner.Username, repository.Name, pull))
}

func (s *Server) mergePullRequest(w http.ResponseWriter, r *http.Request) {
	owner, repository, pull, ok := s.resolvePullRequest(w, r)
	if !ok || !s.requireRepoRole(w, r, repository, repo.RoleWrite) {
		return
	}
	user, ok := s.currentUser(w, r)
	if !ok {
		return
	}
	if pull.Status != "open" {
		writeError(w, http.StatusBadRequest, errString("only open pull requests can be merged"))
		return
	}
	check, err := s.git.CheckMerge(r.Context(), owner.Username, repository.Name, pull.Source, pull.Target)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if check.Merged {
		updated, err := s.repos.UpdatePullRequestStatus(r.Context(), repository.ID, pull.ID, "merged")
		if err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"pull": s.pullResponse(r.Context(), owner.Username, repository.Name, updated), "merge_check": check})
		return
	}
	if !check.Mergeable {
		writeError(w, http.StatusConflict, errString("pull request has conflicts"))
		return
	}
	commit, err := s.git.MergeBranches(r.Context(), owner.Username, repository.Name, pull.Source, pull.Target, fmt.Sprintf("Merge pull request #%d: %s", pull.ID, pull.Title), user.Username, user.Email)
	if err != nil {
		writeError(w, http.StatusConflict, err)
		return
	}
	updated, err := s.repos.UpdatePullRequestStatus(r.Context(), repository.ID, pull.ID, "merged")
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	_ = s.enqueueRepoSync(r.Context(), owner.Username, repository.Name)
	s.addNotification(owner.ID, repository.ID, owner.Username, repository.Name, "Pull request merged", fmt.Sprintf("#%d merged into %s", pull.ID, pull.Target))
	writeJSON(w, http.StatusOK, map[string]any{"pull": s.pullResponse(r.Context(), owner.Username, repository.Name, updated), "commit": commit})
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

func (s *Server) rollbackCommit(w http.ResponseWriter, r *http.Request) {
	owner, repository, ok := s.resolveRepo(w, r)
	if !ok || !s.requireRepoRole(w, r, repository, repo.RoleWrite) {
		return
	}
	user, ok := s.currentUser(w, r)
	if !ok {
		return
	}
	var req struct {
		Branch    string `json:"branch"`
		NewBranch string `json:"new_branch"`
	}
	if !decode(w, r, &req) {
		return
	}
	commit, err := s.git.RollbackCommit(r.Context(), owner.Username, repository.Name, r.PathValue("commit"), req.Branch, req.NewBranch, user.Username, user.Email)
	if err != nil {
		writeError(w, http.StatusConflict, err)
		return
	}
	if err := s.enqueueRepoSync(r.Context(), owner.Username, repository.Name); err != nil {
		s.addNotification(owner.ID, repository.ID, owner.Username, repository.Name, "R2 sync failed to queue", err.Error())
	}
	s.addNotification(owner.ID, repository.ID, owner.Username, repository.Name, "Commit rolled back", fmt.Sprintf("%s rolled back %s", user.Username, r.PathValue("commit")))
	writeJSON(w, http.StatusCreated, commit)
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

func (s *Server) commitFile(w http.ResponseWriter, r *http.Request) {
	owner, repository, ok := s.resolveRepo(w, r)
	if !ok || !s.requireRepoRole(w, r, repository, repo.RoleWrite) {
		return
	}
	user, ok := s.currentUser(w, r)
	if !ok {
		return
	}
	var req struct {
		Path    string `json:"path"`
		Content string `json:"content"`
		Message string `json:"message"`
		Branch  string `json:"branch"`
	}
	if !decode(w, r, &req) {
		return
	}
	if req.Branch == "" {
		req.Branch = r.URL.Query().Get("ref")
	}
	commit, err := s.git.CommitFile(r.Context(), owner.Username, repository.Name, req.Branch, req.Path, req.Content, req.Message, user.Username, user.Email)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	s.addNotification(owner.ID, repository.ID, owner.Username, repository.Name, "File committed", fmt.Sprintf("%s committed %s", user.Username, req.Path))
	writeJSON(w, http.StatusOK, commit)
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

func (s *Server) syncRepo(w http.ResponseWriter, r *http.Request) {
	owner, repository, ok := s.resolveRepo(w, r)
	if !ok || !s.requireRepoRole(w, r, repository, repo.RoleAdmin) {
		return
	}
	if err := s.enqueueRepoSync(r.Context(), owner.Username, repository.Name); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	s.addNotification(owner.ID, repository.ID, owner.Username, repository.Name, "R2 sync queued", fmt.Sprintf("%s will be uploaded to object storage", repository.Name))
	writeJSON(w, http.StatusAccepted, map[string]string{
		"status": "queued",
		"prefix": fmt.Sprintf("repos/%s/%s/git", owner.Username, repository.Name),
	})
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
	collaborators := make([]map[string]any, 0, len(permissions))
	for _, permission := range permissions {
		user, err := s.auth.FindByID(r.Context(), permission.UserID)
		if err != nil {
			continue
		}
		collaborators = append(collaborators, map[string]any{
			"user_id":    permission.UserID,
			"username":   user.Username,
			"email":      user.Email,
			"repo_id":    permission.RepoID,
			"role":       permission.Role,
			"created_at": user.CreatedAt,
		})
	}
	writeJSON(w, http.StatusOK, collaborators)
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
	if req.Role == "" {
		req.Role = repo.RoleWrite
	}
	if collaborator.ID == repository.OwnerID {
		writeError(w, http.StatusBadRequest, errors.New("repository owner is already an admin"))
		return
	}
	if err := s.repos.Grant(r.Context(), repository.ID, collaborator.ID, req.Role); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"status":   "granted",
		"user_id":  collaborator.ID,
		"username": collaborator.Username,
		"email":    collaborator.Email,
		"repo_id":  repository.ID,
		"role":     req.Role,
	})
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
	if err := s.enqueueRepoSync(r.Context(), owner.Username, repository.Name); err != nil {
		s.addNotification(owner.ID, repository.ID, owner.Username, repository.Name, "R2 sync failed to queue", err.Error())
		return
	}
	s.addNotification(owner.ID, repository.ID, owner.Username, repository.Name, "Git push received", fmt.Sprintf("New Git updates pushed to %s", repository.Name))
}

func (s *Server) enqueueRepoSync(ctx context.Context, owner, name string) error {
	prefix := fmt.Sprintf("repos/%s/%s/git", owner, name)
	if err := s.queue.Enqueue(ctx, queue.Job{Type: "repo.sync", Attrs: map[string]string{"owner": owner, "repo": name}}); err != nil {
		log.Printf("r2 git sync queue failed owner=%s repo=%s prefix=%s error=%v", owner, name, prefix, err)
		return err
	}
	log.Printf("r2 git sync queued owner=%s repo=%s prefix=%s pending_jobs=%d", owner, name, prefix, queueLen(s.queue))
	return nil
}

func (s *Server) resolvePullRequest(w http.ResponseWriter, r *http.Request) (auth.User, repo.Repository, repo.PullRequest, bool) {
	owner, repository, ok := s.resolveRepo(w, r)
	if !ok {
		return auth.User{}, repo.Repository{}, repo.PullRequest{}, false
	}
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return auth.User{}, repo.Repository{}, repo.PullRequest{}, false
	}
	pull, err := s.repos.FindPullRequest(r.Context(), repository.ID, id)
	if err != nil {
		writeError(w, http.StatusNotFound, err)
		return auth.User{}, repo.Repository{}, repo.PullRequest{}, false
	}
	return owner, repository, pull, true
}

func (s *Server) pullResponse(ctx context.Context, owner, name string, pull repo.PullRequest) map[string]any {
	response := map[string]any{
		"id":         pull.ID,
		"repo_id":    pull.RepoID,
		"title":      pull.Title,
		"body":       pull.Body,
		"source":     pull.Source,
		"target":     pull.Target,
		"status":     pull.Status,
		"author_id":  pull.AuthorID,
		"created_at": pull.CreatedAt,
	}
	if pull.Status == "open" {
		check, err := s.git.CheckMerge(ctx, owner, name, pull.Source, pull.Target)
		if err == nil {
			response["merge_check"] = check
		} else {
			response["merge_check"] = git.MergeCheck{Mergeable: false, Conflict: true, Message: err.Error()}
		}
	}
	return response
}

func queueLen(q queue.Queue) int {
	if sized, ok := q.(interface{ Len() int }); ok {
		return sized.Len()
	}
	return -1
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
	if len(parts) > 2 && !strings.HasSuffix(parts[1], ".git") {
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
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
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
		configured = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3002,http://127.0.0.1:3002,http://localhost:3001,http://127.0.0.1:3001"
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

type notification struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	RepoID    int64     `json:"repo_id"`
	Owner     string    `json:"owner"`
	Repo      string    `json:"repo"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	CreatedAt time.Time `json:"created_at"`
}

type notificationStore struct {
	mu     sync.Mutex
	nextID int64
	items  []notification
}

func (s *Server) addNotification(userID, repoID int64, owner, repoName, title, body string) {
	s.notes.mu.Lock()
	defer s.notes.mu.Unlock()
	s.notes.nextID++
	s.notes.items = append([]notification{{
		ID:        s.notes.nextID,
		UserID:    userID,
		RepoID:    repoID,
		Owner:     owner,
		Repo:      repoName,
		Title:     title,
		Body:      body,
		CreatedAt: time.Now().UTC(),
	}}, s.notes.items...)
	if len(s.notes.items) > 200 {
		s.notes.items = s.notes.items[:200]
	}
}

func (n *notificationStore) list(userID int64, limit int) []notification {
	n.mu.Lock()
	defer n.mu.Unlock()
	if limit <= 0 {
		limit = 20
	}
	out := []notification{}
	for _, item := range n.items {
		if item.UserID != userID {
			continue
		}
		out = append(out, item)
		if len(out) >= limit {
			break
		}
	}
	return out
}

func getenv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
