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
	"time"

	"github.com/pierrec/lz4/v4"
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

type MergeCheck struct {
	Mergeable bool   `json:"mergeable"`
	Conflict  bool   `json:"conflict"`
	Merged    bool   `json:"merged"`
	Message   string `json:"message"`
	Tree      string `json:"tree,omitempty"`
}

type SnapshotCompression string

const (
	SnapshotCompressionGzip SnapshotCompression = "gzip"
	SnapshotCompressionLZ4  SnapshotCompression = "lz4"
	SnapshotCompressionNone SnapshotCompression = "none"
)

type SnapshotOptions struct {
	Compression SnapshotCompression
}

func ParseSnapshotCompression(value string) SnapshotCompression {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "lz4":
		return SnapshotCompressionLZ4
	case "none", "tar":
		return SnapshotCompressionNone
	default:
		return SnapshotCompressionGzip
	}
}

func (c SnapshotCompression) Extension() string {
	switch c {
	case SnapshotCompressionLZ4:
		return ".tar.lz4"
	case SnapshotCompressionNone:
		return ".tar"
	default:
		return ".tar.gz"
	}
}

func (c SnapshotCompression) ContentEncoding() string {
	switch c {
	case SnapshotCompressionLZ4:
		return "lz4"
	case SnapshotCompressionGzip:
		return "gzip"
	default:
		return ""
	}
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

func (s *Service) CommitFile(ctx context.Context, owner, name, branch, filePath, content, message, authorName, authorEmail string) (Commit, error) {
	repoPath, err := s.repoPath(owner, name)
	if err != nil {
		return Commit{}, err
	}
	branch = strings.TrimSpace(branch)
	if branch == "" || branch == "HEAD" {
		branch = "main"
	}
	filePath = strings.Trim(filePath, "/")
	if filePath == "" || unsafeTreePath(filePath) {
		return Commit{}, errors.New("invalid file path")
	}
	if err := exec.CommandContext(ctx, "git", "check-ref-format", "--branch", branch).Run(); err != nil {
		return Commit{}, errors.New("invalid branch name")
	}
	message = strings.TrimSpace(message)
	if message == "" {
		message = "Update " + filePath
	}
	if authorName = strings.TrimSpace(authorName); authorName == "" {
		authorName = owner
	}
	if authorEmail = strings.TrimSpace(authorEmail); authorEmail == "" {
		authorEmail = owner + "@gitdaddy.local"
	}

	indexFile, err := os.CreateTemp("", "gitdaddy-index-*")
	if err != nil {
		return Commit{}, err
	}
	indexPath := indexFile.Name()
	_ = indexFile.Close()
	_ = os.Remove(indexPath)
	defer os.Remove(indexPath)

	refName := "refs/heads/" + branch
	parent := strings.TrimSpace(commandOutput(ctx, repoPath, nil, "rev-parse", "--verify", refName))
	env := append(os.Environ(), "GIT_INDEX_FILE="+indexPath)
	if parent != "" {
		if err := gitCmd(ctx, repoPath, env, nil, "read-tree", parent); err != nil {
			return Commit{}, err
		}
	}

	blobHash, err := gitCmdOutput(ctx, repoPath, env, strings.NewReader(content), "hash-object", "-w", "--stdin")
	if err != nil {
		return Commit{}, err
	}
	blobHash = strings.TrimSpace(blobHash)
	if err := gitCmd(ctx, repoPath, env, nil, "update-index", "--add", "--cacheinfo", "100644,"+blobHash+","+filePath); err != nil {
		return Commit{}, err
	}
	treeHash, err := gitCmdOutput(ctx, repoPath, env, nil, "write-tree")
	if err != nil {
		return Commit{}, err
	}
	args := []string{"commit-tree", strings.TrimSpace(treeHash)}
	if parent != "" {
		args = append(args, "-p", parent)
	}
	args = append(args, "-m", message)
	commitEnv := append(env,
		"GIT_AUTHOR_NAME="+authorName,
		"GIT_AUTHOR_EMAIL="+authorEmail,
		"GIT_COMMITTER_NAME="+authorName,
		"GIT_COMMITTER_EMAIL="+authorEmail,
	)
	commitHash, err := gitCmdOutput(ctx, repoPath, commitEnv, nil, args...)
	if err != nil {
		return Commit{}, err
	}
	commitHash = strings.TrimSpace(commitHash)
	if err := gitCmd(ctx, repoPath, env, nil, "update-ref", refName, commitHash); err != nil {
		return Commit{}, err
	}
	commits, err := s.Commits(ctx, owner, name, commitHash, 1)
	if err != nil || len(commits) == 0 {
		return Commit{Hash: commitHash, Author: authorName, Email: authorEmail, Subject: message}, nil
	}
	return commits[0], nil
}

func (s *Service) RollbackCommit(ctx context.Context, owner, name, commit, branch, newBranch, authorName, authorEmail string) (Commit, error) {
	repoPath, err := s.repoPath(owner, name)
	if err != nil {
		return Commit{}, err
	}
	commit = strings.TrimSpace(commit)
	branch = strings.TrimSpace(branch)
	newBranch = strings.TrimSpace(newBranch)
	if commit == "" || unsafeRevision(commit) {
		return Commit{}, errors.New("invalid commit")
	}
	if branch == "" || branch == "HEAD" {
		branch = "main"
	}
	if unsafeRevision(branch) {
		return Commit{}, errors.New("invalid target branch")
	}
	rollbackBranch := branch
	if newBranch != "" {
		if unsafeRevision(newBranch) {
			return Commit{}, errors.New("invalid rollback branch")
		}
		if err := exec.CommandContext(ctx, "git", "check-ref-format", "--branch", newBranch).Run(); err != nil {
			return Commit{}, errors.New("invalid rollback branch")
		}
		rollbackBranch = newBranch
	}
	if authorName = strings.TrimSpace(authorName); authorName == "" {
		authorName = owner
	}
	if authorEmail = strings.TrimSpace(authorEmail); authorEmail == "" {
		authorEmail = owner + "@gitdaddy.local"
	}
	workdir, err := os.MkdirTemp("", "gitdaddy-rollback-*")
	if err != nil {
		return Commit{}, err
	}
	defer os.RemoveAll(workdir)

	if err := exec.CommandContext(ctx, "git", "clone", repoPath, workdir).Run(); err != nil {
		return Commit{}, err
	}
	if err := runWorktreeGit(ctx, workdir, "config", "user.name", authorName); err != nil {
		return Commit{}, err
	}
	if err := runWorktreeGit(ctx, workdir, "config", "user.email", authorEmail); err != nil {
		return Commit{}, err
	}
	if newBranch != "" {
		if err := runWorktreeGit(ctx, workdir, "checkout", "-B", rollbackBranch, "origin/"+branch); err != nil {
			return Commit{}, err
		}
	} else if err := runWorktreeGit(ctx, workdir, "checkout", branch); err != nil {
		return Commit{}, err
	}
	if err := runWorktreeGit(ctx, workdir, "revert", "--no-edit", commit); err != nil {
		_ = runWorktreeGit(ctx, workdir, "revert", "--abort")
		return Commit{}, fmt.Errorf("rollback has conflicts: %w", err)
	}
	if err := runWorktreeGit(ctx, workdir, "push", "origin", "HEAD:refs/heads/"+rollbackBranch); err != nil {
		return Commit{}, err
	}
	commits, err := s.Commits(ctx, owner, name, rollbackBranch, 1)
	if err != nil || len(commits) == 0 {
		hash, _ := worktreeGitOutput(ctx, workdir, "rev-parse", "HEAD")
		return Commit{Hash: strings.TrimSpace(hash), Author: authorName, Email: authorEmail, Subject: "Rollback " + commit}, nil
	}
	return commits[0], nil
}

func (s *Service) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Minute)
	defer cancel()
	cmd := exec.CommandContext(ctx, "git", "http-backend")
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
	return s.SnapshotWithOptions(owner, name, SnapshotOptions{Compression: SnapshotCompressionGzip})
}

func (s *Service) SnapshotWithOptions(owner, name string, options SnapshotOptions) ([]byte, error) {
	path, err := s.repoPath(owner, name)
	if err != nil {
		return nil, err
	}
	compression := options.Compression
	if compression == "" {
		compression = SnapshotCompressionGzip
	}
	var out bytes.Buffer
	writer, closeCompressor, err := compressedWriter(&out, compression)
	if err != nil {
		return nil, err
	}
	tw := tar.NewWriter(writer)
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
	if err := closeCompressor(); err != nil {
		return nil, err
	}
	return out.Bytes(), nil
}

func compressedWriter(out io.Writer, compression SnapshotCompression) (io.Writer, func() error, error) {
	switch compression {
	case SnapshotCompressionGzip:
		gz := gzip.NewWriter(out)
		return gz, gz.Close, nil
	case SnapshotCompressionLZ4:
		writer := lz4.NewWriter(out)
		if err := writer.Apply(lz4.CompressionLevelOption(lz4.Fast)); err != nil {
			return nil, nil, err
		}
		return writer, writer.Close, nil
	case SnapshotCompressionNone:
		return out, func() error { return nil }, nil
	default:
		return nil, nil, fmt.Errorf("unsupported snapshot compression %q", compression)
	}
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

func (s *Service) CreateBranch(ctx context.Context, owner, name, branch, from string) (Branch, error) {
	path, err := s.repoPath(owner, name)
	if err != nil {
		return Branch{}, err
	}
	branch = strings.TrimSpace(branch)
	if branch == "" {
		return Branch{}, errors.New("branch name is required")
	}
	if from == "" {
		from = "HEAD"
	}
	if unsafeRevision(from) {
		return Branch{}, errors.New("invalid source revision")
	}
	if err := exec.CommandContext(ctx, "git", "check-ref-format", "--branch", branch).Run(); err != nil {
		return Branch{}, errors.New("invalid branch name")
	}
	if err := exec.CommandContext(ctx, "git", "--git-dir", path, "show-ref", "--verify", "--quiet", "refs/heads/"+branch).Run(); err == nil {
		return Branch{}, errors.New("branch already exists")
	}
	if err := exec.CommandContext(ctx, "git", "--git-dir", path, "branch", branch, from).Run(); err != nil {
		return Branch{}, err
	}
	return Branch{Name: branch}, nil
}

func (s *Service) CheckMerge(ctx context.Context, owner, name, source, target string) (MergeCheck, error) {
	path, err := s.repoPath(owner, name)
	if err != nil {
		return MergeCheck{}, err
	}
	sourceRef, targetRef, err := mergeRefs(source, target)
	if err != nil {
		return MergeCheck{}, err
	}
	if err := verifyBranch(ctx, path, sourceRef); err != nil {
		return MergeCheck{}, fmt.Errorf("source branch not found")
	}
	if err := verifyBranch(ctx, path, targetRef); err != nil {
		return MergeCheck{}, fmt.Errorf("target branch not found")
	}
	if err := exec.CommandContext(ctx, "git", "--git-dir", path, "merge-base", "--is-ancestor", sourceRef, targetRef).Run(); err == nil {
		return MergeCheck{Mergeable: false, Merged: true, Message: "Source branch is already merged."}, nil
	}
	out, err := exec.CommandContext(ctx, "git", "--git-dir", path, "merge-tree", "--write-tree", targetRef, sourceRef).CombinedOutput()
	if err != nil {
		return MergeCheck{Mergeable: false, Conflict: true, Message: strings.TrimSpace(string(out))}, nil
	}
	tree := strings.TrimSpace(string(out))
	return MergeCheck{Mergeable: true, Message: "This pull request can be merged cleanly.", Tree: tree}, nil
}

func (s *Service) MergeBranches(ctx context.Context, owner, name, source, target, message, authorName, authorEmail string) (Commit, error) {
	path, err := s.repoPath(owner, name)
	if err != nil {
		return Commit{}, err
	}
	sourceRef, targetRef, err := mergeRefs(source, target)
	if err != nil {
		return Commit{}, err
	}
	check, err := s.CheckMerge(ctx, owner, name, source, target)
	if err != nil {
		return Commit{}, err
	}
	if check.Merged {
		return Commit{}, errors.New("source branch is already merged")
	}
	if !check.Mergeable {
		if check.Message == "" {
			check.Message = "merge has conflicts"
		}
		return Commit{}, errors.New(check.Message)
	}
	if strings.TrimSpace(message) == "" {
		message = fmt.Sprintf("Merge branch '%s' into %s", source, target)
	}
	if strings.TrimSpace(authorName) == "" {
		authorName = owner
	}
	if strings.TrimSpace(authorEmail) == "" {
		authorEmail = owner + "@gitdaddy.local"
	}
	targetHash, err := gitCmdOutput(ctx, path, nil, nil, "rev-parse", targetRef)
	if err != nil {
		return Commit{}, err
	}
	sourceHash, err := gitCmdOutput(ctx, path, nil, nil, "rev-parse", sourceRef)
	if err != nil {
		return Commit{}, err
	}
	env := append(os.Environ(),
		"GIT_AUTHOR_NAME="+authorName,
		"GIT_AUTHOR_EMAIL="+authorEmail,
		"GIT_COMMITTER_NAME="+authorName,
		"GIT_COMMITTER_EMAIL="+authorEmail,
	)
	commitHash, err := gitCmdOutput(ctx, path, env, nil, "commit-tree", check.Tree, "-p", strings.TrimSpace(targetHash), "-p", strings.TrimSpace(sourceHash), "-m", message)
	if err != nil {
		return Commit{}, err
	}
	commitHash = strings.TrimSpace(commitHash)
	if err := gitCmd(ctx, path, nil, nil, "update-ref", targetRef, commitHash); err != nil {
		return Commit{}, err
	}
	commits, err := s.Commits(ctx, owner, name, commitHash, 1)
	if err != nil || len(commits) == 0 {
		return Commit{Hash: commitHash, Author: authorName, Email: authorEmail, Subject: message}, nil
	}
	return commits[0], nil
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

func mergeRefs(source, target string) (string, string, error) {
	source = strings.TrimSpace(source)
	target = strings.TrimSpace(target)
	if source == "" || target == "" {
		return "", "", errors.New("source and target branches are required")
	}
	if unsafeRevision(source) || unsafeRevision(target) {
		return "", "", errors.New("invalid source or target branch")
	}
	return "refs/heads/" + source, "refs/heads/" + target, nil
}

func verifyBranch(ctx context.Context, repoPath, ref string) error {
	return exec.CommandContext(ctx, "git", "--git-dir", repoPath, "show-ref", "--verify", "--quiet", ref).Run()
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

func gitCmd(ctx context.Context, gitDir string, env []string, stdin io.Reader, args ...string) error {
	_, err := gitCmdOutput(ctx, gitDir, env, stdin, args...)
	return err
}

func gitCmdOutput(ctx context.Context, gitDir string, env []string, stdin io.Reader, args ...string) (string, error) {
	cmd := exec.CommandContext(ctx, "git", append([]string{"--git-dir", gitDir}, args...)...)
	if env != nil {
		cmd.Env = env
	}
	if stdin != nil {
		cmd.Stdin = stdin
	}
	out, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("%s", strings.TrimSpace(string(out)))
	}
	return string(out), nil
}

func runWorktreeGit(ctx context.Context, dir string, args ...string) error {
	_, err := worktreeGitOutput(ctx, dir, args...)
	return err
}

func worktreeGitOutput(ctx context.Context, dir string, args ...string) (string, error) {
	cmd := exec.CommandContext(ctx, "git", args...)
	cmd.Dir = dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("%s", strings.TrimSpace(string(out)))
	}
	return string(out), nil
}

func commandOutput(ctx context.Context, gitDir string, env []string, args ...string) string {
	out, err := gitCmdOutput(ctx, gitDir, env, nil, args...)
	if err != nil {
		return ""
	}
	return out
}
