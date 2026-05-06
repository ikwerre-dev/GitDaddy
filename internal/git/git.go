package git

import (
	"archive/tar"
	"bufio"
	"bytes"
	"compress/gzip"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/textproto"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
)

type Service struct {
	root string
}

type Branch struct {
	Name    string `json:"name"`
	Current bool   `json:"current"`
}

type Commit struct {
	Hash    string `json:"hash"`
	Author  string `json:"author"`
	Email   string `json:"email"`
	Date    string `json:"date"`
	Subject string `json:"subject"`
}

type TreeEntry struct {
	Name string `json:"name"`
	Path string `json:"path"`
	Type string `json:"type"`
	Mode string `json:"mode"`
	Hash string `json:"hash"`
}

type RepositoryStats struct {
	Branches int    `json:"branches"`
	Commits  int    `json:"commits"`
	Objects  int    `json:"objects"`
	Size     int64  `json:"size"`
	Head     string `json:"head"`
}

func NewService(root string) *Service {
	return &Service{root: root}
}

func (s *Service) InitBare(ctx context.Context, owner, name string) error {
	path, err := s.repoPath(owner, name)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	if err := exec.CommandContext(ctx, "git", "init", "--bare", path).Run(); err != nil {
		return err
	}
	return exec.CommandContext(ctx, "git", "--git-dir", path, "config", "http.receivepack", "true").Run()
}

func (s *Service) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	cmd := exec.CommandContext(r.Context(), "git", "http-backend")
	cmd.Env = append(os.Environ(),
		"GIT_PROJECT_ROOT="+s.root,
		"GIT_HTTP_EXPORT_ALL=1",
		"REQUEST_METHOD="+r.Method,
		"PATH_INFO="+strings.TrimPrefix(r.URL.Path, "/git"),
		"QUERY_STRING="+r.URL.RawQuery,
		"CONTENT_TYPE="+r.Header.Get("Content-Type"),
	)
	cmd.Stdin = r.Body
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		http.Error(w, stderr.String(), http.StatusInternalServerError)
		return
	}
	reader := textproto.NewReader(bufio.NewReader(&stdout))
	headers, err := reader.ReadMIMEHeader()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	for key, values := range headers {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}
	if status := headers.Get("Status"); status != "" && strings.HasPrefix(status, "403") {
		w.WriteHeader(http.StatusForbidden)
	}
	_, _ = io.Copy(w, reader.R)
}

func (s *Service) Snapshot(owner, name string) ([]byte, error) {
	path, err := s.repoPath(owner, name)
	if err != nil {
		return nil, err
	}
	var out bytes.Buffer
	gz := gzip.NewWriter(&out)
	tw := tar.NewWriter(gz)
	err = filepath.WalkDir(path, func(file string, entry os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if entry.IsDir() {
			return nil
		}
		rel, err := filepath.Rel(path, file)
		if err != nil {
			return err
		}
		info, err := entry.Info()
		if err != nil {
			return err
		}
		header, err := tar.FileInfoHeader(info, "")
		if err != nil {
			return err
		}
		header.Name = rel
		if err := tw.WriteHeader(header); err != nil {
			return err
		}
		f, err := os.Open(file)
		if err != nil {
			return err
		}
		defer f.Close()
		_, err = io.Copy(tw, f)
		return err
	})
	if err != nil {
		return nil, err
	}
	if err := tw.Close(); err != nil {
		return nil, err
	}
	if err := gz.Close(); err != nil {
		return nil, err
	}
	return out.Bytes(), nil
}

func (s *Service) RepoPath(owner, name string) (string, error) {
	return s.repoPath(owner, name)
}

func (s *Service) Delete(owner, name string) error {
	path, err := s.repoPath(owner, name)
	if err != nil {
		return err
	}
	return os.RemoveAll(path)
}

func (s *Service) Branches(ctx context.Context, owner, name string) ([]Branch, error) {
	path, err := s.repoPath(owner, name)
	if err != nil {
		return nil, err
	}
	out, err := exec.CommandContext(ctx, "git", "--git-dir", path, "branch", "--format=%(HEAD)%00%(refname:short)").Output()
	if err != nil {
		return nil, err
	}
	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	branches := []Branch{}
	for _, line := range lines {
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, "\x00", 2)
		if len(parts) != 2 {
			continue
		}
		branches = append(branches, Branch{Name: parts[1], Current: strings.TrimSpace(parts[0]) == "*"})
	}
	return branches, nil
}

func (s *Service) Commits(ctx context.Context, owner, name, ref string, limit int) ([]Commit, error) {
	path, err := s.repoPath(owner, name)
	if err != nil {
		return nil, err
	}
	if ref == "" {
		ref = "HEAD"
	}
	if limit <= 0 || limit > 100 {
		limit = 30
	}
	format := "%H%x00%an%x00%ae%x00%aI%x00%s"
	out, err := exec.CommandContext(ctx, "git", "--git-dir", path, "log", fmt.Sprintf("-%d", limit), "--format="+format, ref).Output()
	if err != nil {
		return []Commit{}, nil
	}
	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	commits := []Commit{}
	for _, line := range lines {
		parts := strings.SplitN(line, "\x00", 5)
		if len(parts) != 5 {
			continue
		}
		commits = append(commits, Commit{Hash: parts[0], Author: parts[1], Email: parts[2], Date: parts[3], Subject: parts[4]})
	}
	return commits, nil
}

func (s *Service) Tree(ctx context.Context, owner, name, ref, treePath string) ([]TreeEntry, error) {
	repoPath, err := s.repoPath(owner, name)
	if err != nil {
		return nil, err
	}
	if ref == "" {
		ref = "HEAD"
	}
	spec := ref
	if treePath != "" {
		if unsafeTreePath(treePath) {
			return nil, errors.New("invalid tree path")
		}
		spec = ref + ":" + strings.Trim(treePath, "/")
	}
	out, err := exec.CommandContext(ctx, "git", "--git-dir", repoPath, "ls-tree", spec).Output()
	if err != nil {
		return []TreeEntry{}, nil
	}
	entries := []TreeEntry{}
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		if line == "" {
			continue
		}
		metaAndName := strings.SplitN(line, "\t", 2)
		if len(metaAndName) != 2 {
			continue
		}
		meta := strings.Fields(metaAndName[0])
		if len(meta) != 3 {
			continue
		}
		childPath := strings.Trim(strings.Trim(treePath, "/")+"/"+metaAndName[1], "/")
		entries = append(entries, TreeEntry{Name: metaAndName[1], Path: childPath, Type: meta[1], Mode: meta[0], Hash: meta[2]})
	}
	sort.Slice(entries, func(i, j int) bool {
		if entries[i].Type != entries[j].Type {
			return entries[i].Type == "tree"
		}
		return strings.ToLower(entries[i].Name) < strings.ToLower(entries[j].Name)
	})
	return entries, nil
}

func (s *Service) File(ctx context.Context, owner, name, ref, filePath string) (string, error) {
	repoPath, err := s.repoPath(owner, name)
	if err != nil {
		return "", err
	}
	if ref == "" {
		ref = "HEAD"
	}
	if filePath == "" || unsafeTreePath(filePath) {
		return "", errors.New("invalid file path")
	}
	out, err := exec.CommandContext(ctx, "git", "--git-dir", repoPath, "show", ref+":"+strings.Trim(filePath, "/")).Output()
	if err != nil {
		return "", err
	}
	if len(out) > 1024*1024 {
		return "", errors.New("file is larger than 1MB preview limit")
	}
	return string(out), nil
}

func (s *Service) Diff(ctx context.Context, owner, name, commit string) (string, error) {
	repoPath, err := s.repoPath(owner, name)
	if err != nil {
		return "", err
	}
	if commit == "" {
		commit = "HEAD"
	}
	if unsafeRevision(commit) {
		return "", errors.New("invalid commit revision")
	}
	out, err := exec.CommandContext(ctx, "git", "--git-dir", repoPath, "show", "--format=fuller", "--patch", "--stat", commit).Output()
	if err != nil {
		return "", err
	}
	if len(out) > 2*1024*1024 {
		return "", errors.New("diff is larger than 2MB preview limit")
	}
	return string(out), nil
}

func (s *Service) Stats(ctx context.Context, owner, name string) (RepositoryStats, error) {
	repoPath, err := s.repoPath(owner, name)
	if err != nil {
		return RepositoryStats{}, err
	}
	branches, _ := s.Branches(ctx, owner, name)
	commitsOut, _ := exec.CommandContext(ctx, "git", "--git-dir", repoPath, "rev-list", "--count", "--all").Output()
	objectsOut, _ := exec.CommandContext(ctx, "git", "--git-dir", repoPath, "count-objects", "-v").Output()
	headOut, _ := exec.CommandContext(ctx, "git", "--git-dir", repoPath, "rev-parse", "--abbrev-ref", "HEAD").Output()
	stats := RepositoryStats{Branches: len(branches), Head: strings.TrimSpace(string(headOut))}
	fmt.Sscanf(strings.TrimSpace(string(commitsOut)), "%d", &stats.Commits)
	for _, line := range strings.Split(string(objectsOut), "\n") {
		var key string
		var value int64
		if _, err := fmt.Sscanf(line, "%s %d", &key, &value); err != nil {
			continue
		}
		key = strings.TrimSuffix(key, ":")
		switch key {
		case "count", "in-pack":
			stats.Objects += int(value)
		case "size", "size-pack":
			stats.Size += value * 1024
		}
	}
	return stats, nil
}

func (s *Service) repoPath(owner, name string) (string, error) {
	if unsafePath(owner) || unsafePath(name) {
		return "", errors.New("invalid repository path")
	}
	return filepath.Join(s.root, owner, name+".git"), nil
}

func unsafePath(value string) bool {
	return value == "" || strings.Contains(value, "..") || strings.ContainsAny(value, `/\`)
}

func unsafeTreePath(value string) bool {
	return strings.Contains(value, "..") || strings.HasPrefix(value, "/") || strings.Contains(value, "\\")
}

func unsafeRevision(value string) bool {
	return strings.ContainsAny(value, " \t\n\r:~^?*[\\") || strings.Contains(value, "..")
}
