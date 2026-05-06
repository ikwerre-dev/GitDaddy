"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { gitdaddyApi, tokenKey, userKey } from "../lib/api";

const REFRESH_INTERVAL_MS = 5000;
const emptyPlatformStats = {
  repositories: 0,
  pending_jobs: 0,
  total_commits: 0,
  storage: "async",
  git_transport: "smart-http",
};
const emptyRepoStats = {
  branches: 0,
  commits: 0,
  objects: 0,
  size: 0,
  head: "",
};

export function useGitDaddy() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [repos, setRepos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [repoDetail, setRepoDetail] = useState(null);
  const [platformStats, setPlatformStats] = useState(emptyPlatformStats);
  const [notifications, setNotifications] = useState([]);
  const [repoStats, setRepoStats] = useState(emptyRepoStats);
  const [branches, setBranches] = useState([]);
  const [commits, setCommits] = useState([]);
  const [tree, setTree] = useState([]);
  const [pulls, setPulls] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [filePreview, setFilePreview] = useState(null);
  const [diffPreview, setDiffPreview] = useState(null);
  const [ref, setRef] = useState("HEAD");
  const [path, setPath] = useState("");
  const [activeTab, setActiveTab] = useState("code");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const backgroundRefresh = useRef(false);

  const owner = user?.username || "";
  const filteredRepos = useMemo(() => repos.filter((repo) => repo.name.toLowerCase().includes(query.toLowerCase())), [repos, query]);

  useEffect(() => {
    const savedToken = localStorage.getItem(tokenKey);
    const savedUser = localStorage.getItem(userKey);
    if (savedToken) setToken(savedToken);
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    if (token) loadRepos(token, { silent: true });
  }, [token]);

  useEffect(() => {
    if (token && user && selected) loadRepo(selected, token, ref, path, { silent: true, preservePreview: true });
  }, [selected?.id, token, user?.username]);

  useEffect(() => {
    if (!token || !user) return;
    const refresh = async () => {
      if (backgroundRefresh.current) return;
      backgroundRefresh.current = true;
      try {
        await loadRepos(token, { silent: true });
        if (selected) {
          await loadRepo(selected, token, ref, path, { silent: true, preservePreview: true });
        }
      } finally {
        backgroundRefresh.current = false;
      }
    };
    const id = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [token, user?.username, selected?.id, selected?.name, ref, path]);

  async function run(action, success) {
    setBusy(true);
    setMessage("");
    try {
      const result = await action();
      if (success) setMessage(success(result));
      return result;
    } catch (error) {
      setMessage(error.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function login(formData, mode) {
    return run(async () => {
      if (mode === "register") await gitdaddyApi.register(formData);
      const result = await gitdaddyApi.login({ username: formData.username, password: formData.password });
      localStorage.setItem(tokenKey, result.token);
      localStorage.setItem(userKey, JSON.stringify(result.user));
      setToken(result.token);
      setUser(result.user);
      return result;
    }, (result) => `Signed in as ${result.user.username}`);
  }

  async function logout() {
    if (token) await gitdaddyApi.logout(token).catch(() => {});
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
    setToken("");
    setUser(null);
    setRepos([]);
    setSelected(null);
  }

  async function loadRepos(activeToken = token, options = {}) {
    try {
      const [repoList, stats, noteList] = await Promise.all([
        gitdaddyApi.repos(activeToken),
        gitdaddyApi.stats(activeToken).catch(() => emptyPlatformStats),
        gitdaddyApi.notifications(activeToken).catch(() => []),
      ]);
      const nextRepos = Array.isArray(repoList) ? repoList : [];
      setRepos(nextRepos);
      setPlatformStats({ ...emptyPlatformStats, ...(stats || {}) });
      setNotifications(Array.isArray(noteList) ? noteList : []);
      if (!selected && nextRepos.length > 0) {
        setSelected(nextRepos[0]);
      } else if (selected && nextRepos.length > 0 && !nextRepos.some((repo) => repo.id === selected.id)) {
        setSelected(nextRepos[0]);
      } else if (selected && nextRepos.length === 0) {
        setSelected(null);
        setRepoDetail(null);
      }
      return nextRepos;
    } catch (error) {
      if (!options.silent) setMessage(error.message);
      return repos;
    }
  }

  async function loadRepo(repo = selected, activeToken = token, nextRef = ref, nextPath = path, options = {}) {
    if (!repo || !owner) return;
    try {
      const [detail, branchData, commitData, treeData, stats, pullData, collaboratorData] = await Promise.all([
        gitdaddyApi.repo(activeToken, owner, repo.name),
        gitdaddyApi.branches(activeToken, owner, repo.name),
        gitdaddyApi.commits(activeToken, owner, repo.name, nextRef || "HEAD"),
        gitdaddyApi.tree(activeToken, owner, repo.name, nextRef || "HEAD", nextPath || ""),
        gitdaddyApi.repoStats(activeToken, owner, repo.name),
        gitdaddyApi.pulls(activeToken, owner, repo.name),
        gitdaddyApi.collaborators(activeToken, owner, repo.name).catch(() => []),
      ]);
      const nextBranches = Array.isArray(branchData) ? branchData : [];
      const nextCommits = Array.isArray(commitData) ? commitData : [];
      const nextTree = Array.isArray(treeData) ? treeData : [];
      const nextPulls = Array.isArray(pullData) ? pullData : [];
      const nextCollaborators = Array.isArray(collaboratorData) ? collaboratorData : [];
      const defaultRef = nextBranches.find((branch) => branch.current)?.name || nextBranches[0]?.name || "HEAD";
      setRepoDetail(detail?.repository || repo);
      setBranches(nextBranches);
      setCommits(nextCommits);
      setTree(nextTree);
      setRepoStats({ ...emptyRepoStats, ...(stats || {}) });
      setPulls(nextPulls);
      setCollaborators(nextCollaborators);
      setRef(nextRef && nextRef !== "HEAD" ? nextRef : defaultRef);
      setPath(nextPath || "");
      if (!options.preservePreview) {
        setFilePreview(null);
        setDiffPreview(null);
      }
    } catch (error) {
      if (options.silent) return;
      setMessage(error.message);
      setRepoDetail(repo);
      setBranches([]);
      setCommits([]);
      setTree([]);
      setPulls([]);
      setCollaborators([]);
      setRepoStats(emptyRepoStats);
    }
  }

  async function createRepo(formData) {
    return run(async () => {
      const repo = await gitdaddyApi.createRepo(token, formData);
      await loadRepos(token);
      setSelected(repo);
      return repo;
    }, (repo) => `Created ${repo.name}`);
  }

  async function commitFile(formData) {
    return run(async () => {
      const commit = await gitdaddyApi.commitFile(token, owner, selected.name, {
        path: formData.path,
        content: formData.content,
        message: formData.message,
        branch: formData.branch || ref || "main",
      });
      await loadRepos(token);
      await loadRepo(selected, token, formData.branch || ref || "main", path);
      return commit;
    }, (commit) => `Committed ${commit.hash.slice(0, 7)}`);
  }

  async function chooseRepo(repo) {
    setSelected(repo);
    setPath("");
    setRef("HEAD");
    setActiveTab("code");
  }

  async function changeRef(nextRef) {
    setRef(nextRef);
    await loadRepo(selected, token, nextRef, path);
  }

  async function openEntry(entry) {
    if (entry.type === "tree") {
      await loadRepo(selected, token, ref, entry.path);
      return;
    }
    const result = await run(() => gitdaddyApi.file(token, owner, selected.name, ref || "HEAD", entry.path));
    if (result) setFilePreview({ path: entry.path, content: result.content });
  }

  async function openDiff(commit) {
    const result = await run(() => gitdaddyApi.diff(token, owner, selected.name, commit.hash));
    if (result) setDiffPreview({ hash: commit.hash, diff: result.diff });
  }

  async function rollbackCommit(commit, formData) {
    return run(async () => {
      const mode = formData.mode || "new";
      const targetBranch = formData.branch || ref || "main";
      const newBranch = mode === "new" ? formData.new_branch : "";
      const reverted = await gitdaddyApi.rollbackCommit(token, owner, selected.name, commit.hash, {
        branch: targetBranch,
        new_branch: newBranch,
      });
      await loadRepo(selected, token, newBranch || targetBranch, path, { preservePreview: true });
      return { commit: reverted, branch: newBranch || targetBranch };
    }, (result) => `Rolled back into ${result.branch}`);
  }

  async function upPath() {
    const parent = path.split("/").slice(0, -1).join("/");
    await loadRepo(selected, token, ref, parent);
  }

  async function createBranch(formData) {
    return run(async () => {
      const branch = await gitdaddyApi.createBranch(token, owner, selected.name, { name: formData.name, from: formData.from || ref || "HEAD" });
      await loadRepo(selected, token, branch.name, path);
      return branch;
    }, (branch) => `Created branch ${branch.name}`);
  }

  async function createPullRequest(formData) {
    return run(async () => {
      const pull = await gitdaddyApi.createPull(token, owner, selected.name, formData);
      await loadRepo(selected, token, ref, path);
      return pull;
    }, (pull) => `Opened pull request #${pull.id}`);
  }

  async function reviewPullRequest(pullID) {
    return run(async () => {
      const reviewed = await gitdaddyApi.reviewPull(token, owner, selected.name, pullID);
      setPulls((current) => current.map((pull) => (pull.id === pullID ? reviewed : pull)));
      return reviewed;
    }, (pull) => `Checked pull request #${pull.id}`);
  }

  async function mergePullRequest(pullID) {
    return run(async () => {
      const result = await gitdaddyApi.mergePull(token, owner, selected.name, pullID);
      await loadRepo(selected, token, ref, path, { preservePreview: true });
      return result;
    }, (result) => `Merged pull request #${result.pull?.id}`);
  }

  async function addCollaborator(formData) {
    return run(async () => {
      const username = String(formData.username || "").trim();
      const role = formData.role || "write";
      const collaborator = await gitdaddyApi.addCollaborator(token, owner, selected.name, username, { role });
      const list = await gitdaddyApi.collaborators(token, owner, selected.name);
      setCollaborators(list);
      return collaborator;
    }, (collaborator) => `Added ${collaborator.username} as ${collaborator.role}`);
  }

  async function removeCollaborator(username) {
    return run(async () => {
      await gitdaddyApi.removeCollaborator(token, owner, selected.name, username);
      const list = await gitdaddyApi.collaborators(token, owner, selected.name);
      setCollaborators(list);
      return { username };
    }, ({ username }) => `Removed ${username}`);
  }

  async function updateVisibility(visibility) {
    return run(async () => {
      const updated = await gitdaddyApi.updateRepo(token, owner, selected.name, { visibility });
      setSelected(updated);
      await loadRepos(token);
      await loadRepo(updated, token, ref, path);
      return updated;
    }, (updated) => `Repository is now ${updated.visibility}`);
  }

  async function syncRepoToR2() {
    return run(async () => {
      const result = await gitdaddyApi.syncRepo(token, owner, selected.name);
      await loadRepos(token);
      return result;
    }, (result) => `R2 sync queued: ${result.prefix}`);
  }

  async function deleteRepo() {
    if (!selected || !window.confirm(`Delete ${selected.name}? This removes repository metadata and local Git storage.`)) return;
    await run(async () => {
      await gitdaddyApi.deleteRepo(token, owner, selected.name);
      setSelected(null);
      setRepoDetail(null);
      await loadRepos(token);
    }, () => `Deleted ${selected.name}`);
  }

  return {
    activeTab,
    branches,
    busy,
    collaborators,
    commits,
    diffPreview,
    filePreview,
    filteredRepos,
    message,
    notifications,
    owner,
    path,
    platformStats,
    pulls,
    query,
    ref,
    repoDetail,
    repos,
    repoStats,
    selected,
    token,
    tree,
    user,
    changeRef,
    chooseRepo,
    createBranch,
    addCollaborator,
    createPullRequest,
    createRepo,
    commitFile,
    deleteRepo,
    loadRepo,
    login,
    logout,
    openDiff,
    openEntry,
    mergePullRequest,
    removeCollaborator,
    reviewPullRequest,
    rollbackCommit,
    setActiveTab,
    setDiffPreview,
    setFilePreview,
    setQuery,
    syncRepoToR2,
    upPath,
    updateVisibility,
  };
}
