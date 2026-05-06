"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BookOpen,
  Box,
  Code2,
  Copy,
  File,
  Folder,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  KeyRound,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Terminal,
  Unlock,
  User,
} from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Activity01Icon,
  CloudUploadIcon,
  CodeFolderIcon,
  Copy01Icon,
  DatabaseSyncIcon,
  GitBranchIcon as HugeGitBranchIcon,
  GithubIcon,
  RepositoryIcon,
  ServerStack03Icon,
  ShieldKeyIcon,
  TerminalIcon,
} from "@hugeicons/core-free-icons";

const tokenKey = "gitdaddy_token";
const userKey = "gitdaddy_user";
const apiBase = process.env.NEXT_PUBLIC_GITDADDY_API_URL || "http://localhost:8080";

export default function Home() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [repos, setRepos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [repoDetail, setRepoDetail] = useState(null);
  const [platformStats, setPlatformStats] = useState(null);
  const [repoStats, setRepoStats] = useState(null);
  const [branches, setBranches] = useState([]);
  const [commits, setCommits] = useState([]);
  const [tree, setTree] = useState([]);
  const [filePreview, setFilePreview] = useState(null);
  const [diffPreview, setDiffPreview] = useState(null);
  const [ref, setRef] = useState("");
  const [path, setPath] = useState("");
  const [activeTab, setActiveTab] = useState("code");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem(tokenKey);
    const savedUser = localStorage.getItem(userKey);
    if (savedToken) setToken(savedToken);
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    if (token) {
      loadRepos(token);
    }
  }, [token]);

  useEffect(() => {
    if (selected && token) {
      loadRepo(selected, token);
    }
  }, [selected, token]);

  const filteredRepos = useMemo(() => {
    return repos.filter((repo) => repo.name.toLowerCase().includes(query.toLowerCase()));
  }, [repos, query]);

  async function login(formData, mode) {
    setBusy(true);
    setMessage("");
    try {
      if (mode === "register") {
        await api("/api/register", { method: "POST", body: formData });
      }
      const result = await api("/api/login", {
        method: "POST",
        body: { username: formData.username, password: formData.password },
      });
      localStorage.setItem(tokenKey, result.token);
      localStorage.setItem(userKey, JSON.stringify(result.user));
      setToken(result.token);
      setUser(result.user);
      setMessage(`Signed in as ${result.user.username}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function createRepo(formData) {
    setBusy(true);
    setMessage("");
    try {
      const repo = await api("/api/repos", { method: "POST", token, body: formData });
      setMessage(`Created ${repo.name}`);
      await loadRepos(token);
      setSelected(repo);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadRepos(activeToken = token) {
    try {
      const [data, stats] = await Promise.all([
        api("/api/repos", { token: activeToken }),
        api("/api/stats", { token: activeToken }),
      ]);
      setRepos(data);
      setPlatformStats(stats);
      if (!selected && data.length > 0) setSelected(data[0]);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadRepo(repo, activeToken = token, nextRef = ref, nextPath = path) {
    const owner = user?.username || JSON.parse(localStorage.getItem(userKey) || "{}").username;
    if (!owner) return;
    try {
      const encodedPath = encodeURIComponent(nextPath || "");
      const [detail, branchData, commitData, treeData, stats] = await Promise.all([
        api(`/api/repos/${owner}/${repo.name}`, { token: activeToken }),
        api(`/api/repos/${owner}/${repo.name}/branches`, { token: activeToken }),
        api(`/api/repos/${owner}/${repo.name}/commits?ref=${encodeURIComponent(nextRef || "HEAD")}`, { token: activeToken }),
        api(`/api/repos/${owner}/${repo.name}/tree?ref=${encodeURIComponent(nextRef || "HEAD")}&path=${encodedPath}`, { token: activeToken }),
        api(`/api/repos/${owner}/${repo.name}/stats`, { token: activeToken }),
      ]);
      setRepoDetail(detail.repository);
      setBranches(branchData);
      setCommits(commitData);
      setTree(treeData);
      setRepoStats(stats);
      setFilePreview(null);
      setDiffPreview(null);
      if (!nextRef && branchData.length > 0) {
        setRef(branchData.find((branch) => branch.current)?.name || branchData[0].name);
      }
    } catch (error) {
      setRepoDetail(repo);
      setBranches([]);
      setCommits([]);
      setTree([]);
      setRepoStats(null);
    }
  }

  async function openFile(entry) {
    if (entry.type === "tree") {
      setPath(entry.path);
      loadRepo(selected, token, ref, entry.path);
      return;
    }
    try {
      const result = await api(`/api/repos/${user.username}/${selected.name}/file?ref=${encodeURIComponent(ref || "HEAD")}&path=${encodeURIComponent(entry.path)}`, { token });
      setFilePreview({ path: entry.path, content: result.content });
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function openDiff(commit) {
    try {
      const result = await api(`/api/repos/${user.username}/${selected.name}/diff?commit=${encodeURIComponent(commit.hash)}`, { token });
      setDiffPreview({ hash: commit.hash, diff: result.diff });
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateVisibility(visibility) {
    if (!selected) return;
    try {
      const updated = await api(`/api/repos/${user.username}/${selected.name}`, {
        method: "PATCH",
        token,
        body: { visibility },
      });
      setSelected(updated);
      await loadRepos(token);
      await loadRepo(updated, token);
      setMessage(`Repository is now ${visibility}`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteRepo() {
    if (!selected) return;
    if (!window.confirm(`Delete ${selected.name}? This removes repository metadata and local Git storage.`)) return;
    try {
      await api(`/api/repos/${user.username}/${selected.name}`, { method: "DELETE", token });
      setMessage(`Deleted ${selected.name}`);
      setSelected(null);
      setRepoDetail(null);
      await loadRepos(token);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function logout() {
    if (token) {
      await api("/api/logout", { method: "POST", token }).catch(() => {});
    }
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
    setToken("");
    setUser(null);
    setRepos([]);
    setSelected(null);
  }

  if (!token || !user) {
    return <AuthScreen busy={busy} message={message} onSubmit={login} />;
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="mark">
            <Code2 size={20} />
          </div>
          <div>
            <strong>GitDaddy</strong>
            <span>distributed Git hosting</span>
          </div>
        </div>

        <div className="profile">
          <User size={18} />
          <div>
            <strong>{user.username}</strong>
            <span>{user.email || "local account"}</span>
          </div>
        </div>

        <div className="search">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find repositories" />
        </div>

        <div className="repoNav">
          {filteredRepos.map((repo) => (
            <button
              className={selected?.id === repo.id ? "repoButton active" : "repoButton"}
              key={repo.id}
              onClick={() => {
                setSelected(repo);
                setPath("");
              }}
            >
              {repo.visibility === "public" ? <Unlock size={16} /> : <Lock size={16} />}
              <span>{repo.name}</span>
            </button>
          ))}
        </div>

        <CreateRepo busy={busy} onSubmit={createRepo} />
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>Repository</p>
            <h1>{selected ? `${user.username}/${selected.name}` : "Create your first repository"}</h1>
          </div>
          <div className="topActions">
            <button className="iconButton" title="Refresh" onClick={() => selected && loadRepo(selected)}>
              <RefreshCw size={18} />
            </button>
            <button className="iconButton" title="Logout" onClick={logout}>
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <Stats repos={repos} branches={branches} commits={commits} platformStats={platformStats} repoStats={repoStats} />

        {message ? <p className="message">{message}</p> : null}

        {selected ? (
          <>
            <RepoHeader
              repo={repoDetail || selected}
              owner={user.username}
              branches={branches}
              ref={ref}
              onRefChange={(value) => {
                setRef(value);
                loadRepo(selected, token, value, path);
              }}
            />
            <Tabs active={activeTab} onChange={setActiveTab} />
            {activeTab === "code" ? (
              <CodeView
                owner={user.username}
                repo={selected}
                ref={ref || "HEAD"}
                path={path}
                tree={tree}
                filePreview={filePreview}
                onCloseFile={() => setFilePreview(null)}
                onOpen={openFile}
                onUp={() => {
                  const parent = path.split("/").slice(0, -1).join("/");
                  setPath(parent);
                  loadRepo(selected, token, ref, parent);
                }}
              />
            ) : null}
            {activeTab === "commits" ? <CommitView commits={commits} diffPreview={diffPreview} onOpenDiff={openDiff} onCloseDiff={() => setDiffPreview(null)} /> : null}
            {activeTab === "branches" ? <BranchView branches={branches} /> : null}
            {activeTab === "settings" ? <SettingsView repo={repoDetail || selected} onVisibility={updateVisibility} onDelete={deleteRepo} /> : null}
          </>
        ) : (
          <EmptyState />
        )}
      </section>
    </main>
  );
}

function AuthScreen({ busy, message, onSubmit }) {
  const [mode, setMode] = useState("login");
  const cloneCommand = "git clone http://localhost:8080/git/robinson/api.git";
  const pushCommand = "git push origin main";
  const commandBlock = `git remote add origin http://localhost:8080/git/robinson/api.git
git fetch origin
git pull origin main
git push origin main`;
  return (
    <main className="min-h-screen bg-white text-neutral-950 [background-image:linear-gradient(#e8e8e8_1px,transparent_1px),linear-gradient(90deg,#e8e8e8_1px,transparent_1px)] [background-size:72px_72px]">
      <section className="mx-auto min-h-screen max-w-[1480px] px-3 py-3 sm:px-6 sm:py-6 lg:px-10 lg:py-10">
        <div className="border border-neutral-950 bg-white shadow-[12px_12px_0_#111]">
          <header className="border-b border-neutral-950">
            <nav className="flex min-h-16 items-center justify-between border-b border-neutral-200 px-4 sm:px-6">
              <div className="flex items-center gap-3 font-black">
                <span className="grid h-10 w-10 place-items-center border border-neutral-950 bg-lime-300">
                  <LandingIcon icon={GithubIcon} size={23} />
                </span>
                <span>GitDaddy</span>
              </div>
              <div className="hidden items-center gap-2 text-xs font-black uppercase text-neutral-600 md:flex">
                <span className="border border-neutral-300 px-3 py-1">GitHub alternative</span>
                <span className="border border-neutral-300 px-3 py-1">Smart HTTP Git</span>
                <span className="border border-neutral-300 px-3 py-1">R2 snapshots</span>
              </div>
            </nav>

            <div className="grid lg:grid-cols-[1fr_360px]">
              <div className="px-4 py-12 sm:px-8 sm:py-16 lg:px-12">
                <p className="mb-4 flex items-center gap-2 text-xs font-black uppercase text-neutral-600">
                  <LandingIcon icon={RepositoryIcon} size={18} />
                  Self-hosted Git platform for real Git commands
                </p>
                <h1 className="text-[64px] font-black leading-[0.9] text-neutral-950 sm:text-[104px] lg:text-[168px]">GitDaddy</h1>
                <p className="mt-7 max-w-3xl text-lg font-semibold leading-8 text-neutral-700">
                  A clean, open-source GitHub alternative with normal clone, fetch, pull, and push workflows,
                  browser repository views, Postgres metadata, Redis queues, and fast async R2 backup sync.
                </p>
              </div>

              <div className="grid border-t border-neutral-950 lg:border-l lg:border-t-0">
                {[
                  ["clone", "Restore from cache or R2"],
                  ["push", "Write fast, sync later"],
                  ["browse", "Files, commits, diffs"],
                ].map(([label, text]) => (
                  <div className="grid content-center gap-2 border-b border-neutral-950 p-6 last:border-b-0" key={label}>
                    <strong className="text-4xl font-black">{label}</strong>
                    <span className="text-sm font-bold text-neutral-600">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </header>

          <div className="flex min-h-16 items-center justify-between gap-3 border-b border-neutral-950 bg-neutral-950 px-4 text-white sm:px-6">
            <div className="flex min-w-0 items-center gap-3 font-mono text-xs sm:text-sm">
              <LandingIcon icon={TerminalIcon} size={20} />
              <span className="truncate">{cloneCommand}</span>
            </div>
            <button
              className="grid h-10 w-10 shrink-0 place-items-center border border-white/40 bg-white text-neutral-950"
              type="button"
              title="Copy clone command"
              onClick={() => navigator.clipboard?.writeText(cloneCommand)}
            >
              <LandingIcon icon={Copy01Icon} size={18} />
            </button>
          </div>

          <div className="grid lg:grid-cols-[1fr_420px]">
            <div className="grid md:grid-cols-2">
              <article className="min-h-[300px] border-b border-neutral-950 p-6 sm:p-8 md:border-r">
                <span className="text-xs font-black uppercase text-neutral-500">01 / concept</span>
                <h2 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">Your own GitHub-style control room.</h2>
                <p className="mt-5 max-w-xl text-base font-medium leading-7 text-neutral-700">
                  Create repositories, manage visibility, inspect branches, read commit history, open file trees,
                  and review diffs from the web UI while developers keep using standard Git.
                </p>
              </article>

              <div
                className="min-h-[300px] border-b border-neutral-950 bg-neutral-100 [background-image:repeating-linear-gradient(135deg,#111_0_1px,transparent_1px_12px)]"
                aria-hidden="true"
              />

              <article className="border-b border-neutral-950 p-6 sm:p-8 md:col-span-2 md:border-r">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <span className="text-xs font-black uppercase text-neutral-500">git transport</span>
                    <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">No custom CLI. Just Git.</h2>
                  </div>
                  <button
                    className="grid h-11 w-11 shrink-0 place-items-center border border-neutral-950 bg-lime-300"
                    type="button"
                    title="Copy push command"
                    onClick={() => navigator.clipboard?.writeText(pushCommand)}
                  >
                    <LandingIcon icon={Copy01Icon} size={19} />
                  </button>
                </div>
                <pre className="mt-6 overflow-auto border border-neutral-950 bg-neutral-950 p-5 font-mono text-sm leading-7 text-lime-200">
                  <code>{commandBlock}</code>
                </pre>
              </article>

              <article className="grid gap-4 border-b border-neutral-950 p-6 sm:p-8 md:border-r lg:border-b-0">
                <span className="text-xs font-black uppercase text-neutral-500">backend path</span>
                {[
                  [HugeGitBranchIcon, "Smart HTTP Git protocol"],
                  [ShieldKeyIcon, "Token auth and repository permissions"],
                  [DatabaseSyncIcon, "PostgreSQL metadata and Redis queues"],
                  [CloudUploadIcon, "LZ4-compressed async R2 snapshots"],
                ].map(([icon, text]) => (
                  <div className="flex items-center gap-3 border border-neutral-200 bg-neutral-50 p-3 font-black" key={text}>
                    <LandingIcon icon={icon} size={20} />
                    <span>{text}</span>
                  </div>
                ))}
              </article>

              <article className="grid content-between gap-8 border-b border-neutral-950 p-6 sm:p-8 lg:border-b-0">
                <div>
                  <span className="text-xs font-black uppercase text-neutral-500">system shape</span>
                  <h2 className="mt-3 text-3xl font-black leading-tight">Fast local Git, durable object storage.</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    [ServerStack03Icon, "Go API"],
                    [CodeFolderIcon, "Repo browser"],
                    [Activity01Icon, "Worker sync"],
                    [CloudUploadIcon, "R2 backup"],
                  ].map(([icon, label]) => (
                    <div className="grid min-h-24 place-items-center border border-neutral-950 bg-white text-center font-black" key={label}>
                      <LandingIcon icon={icon} size={25} />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <aside className="border-neutral-950 bg-[#f7f4ec] lg:border-l">
              <form
                className="grid gap-4 p-6 sm:p-8 lg:sticky lg:top-8"
                onSubmit={(event) => {
                  event.preventDefault();
                  onSubmit(Object.fromEntries(new FormData(event.currentTarget)), mode);
                }}
              >
                <div>
                  <span className="text-xs font-black uppercase text-neutral-500">workspace access</span>
                  <h2 className="mt-3 text-3xl font-black leading-tight">
                    {mode === "login" ? "Enter GitDaddy." : "Create GitDaddy account."}
                  </h2>
                </div>
                <input className="min-h-12 border border-neutral-950 bg-white px-3 font-bold outline-none" name="username" placeholder="Username" required />
                {mode === "register" ? (
                  <input className="min-h-12 border border-neutral-950 bg-white px-3 font-bold outline-none" name="email" placeholder="Email" />
                ) : null}
                <input
                  className="min-h-12 border border-neutral-950 bg-white px-3 font-bold outline-none"
                  name="password"
                  placeholder="Password"
                  type="password"
                  required
                />
                <div className="grid grid-cols-2 border border-neutral-950 bg-white p-1">
                  <button
                    type="button"
                    className={mode === "login" ? "min-h-10 bg-neutral-950 font-black text-white" : "min-h-10 font-black text-neutral-600"}
                    onClick={() => setMode("login")}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    className={mode === "register" ? "min-h-10 bg-neutral-950 font-black text-white" : "min-h-10 font-black text-neutral-600"}
                    onClick={() => setMode("register")}
                  >
                    Sign up
                  </button>
                </div>
                <button className="flex min-h-12 items-center justify-center gap-2 border border-neutral-950 bg-lime-300 px-4 font-black text-neutral-950" disabled={busy} type="submit">
                  <LandingIcon icon={ShieldKeyIcon} size={19} />
                  {mode === "login" ? "Login" : "Create account"}
                </button>
                {message ? <p className="border border-amber-500 bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p> : null}
              </form>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

function LandingIcon({ icon, size = 20, className = "" }) {
  return <HugeiconsIcon className={className} color="currentColor" icon={icon} size={size} strokeWidth={1.7} />;
}

function CreateRepo({ busy, onSubmit }) {
  return (
    <form
      className="createRepo"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(Object.fromEntries(new FormData(event.currentTarget)));
        event.currentTarget.reset();
      }}
    >
      <label>New repository</label>
      <input name="name" placeholder="service-api" required />
      <select name="visibility" defaultValue="private">
        <option value="private">Private</option>
        <option value="public">Public</option>
      </select>
      <button className="primary" disabled={busy} type="submit">
        <Plus size={17} />
        Create
      </button>
    </form>
  );
}

function Stats({ repos, branches, commits, platformStats, repoStats }) {
  return (
    <div className="stats">
      <Stat icon={<Box size={18} />} label="Repositories" value={platformStats?.repositories ?? repos.length} />
      <Stat icon={<GitBranch size={18} />} label="Branches" value={repoStats?.branches ?? branches.length} />
      <Stat icon={<GitCommitHorizontal size={18} />} label="Commits" value={repoStats?.commits ?? commits.length} />
      <Stat icon={<ShieldCheck size={18} />} label="Pending sync jobs" value={platformStats?.pending_jobs ?? 0} />
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="stat">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RepoHeader({ owner, repo, branches, ref, onRefChange }) {
  const clone = `git clone http://localhost:8080/git/${owner}/${repo.name}.git`;
  return (
    <div className="repoHeader">
      <div>
        <div className="visibility">{repo.visibility === "public" ? <Unlock size={15} /> : <Lock size={15} />}{repo.visibility}</div>
        <h2>{repo.name}</h2>
      </div>
      <div className="repoControls">
        <select value={ref} onChange={(event) => onRefChange(event.target.value)}>
          <option value="HEAD">HEAD</option>
          {branches.map((branch) => (
            <option key={branch.name} value={branch.name}>
              {branch.name}
            </option>
          ))}
        </select>
        <button className="secondary" onClick={() => navigator.clipboard?.writeText(clone)}>
          <Copy size={16} />
          Clone
        </button>
      </div>
    </div>
  );
}

function Tabs({ active, onChange }) {
  const tabs = [
    ["code", Code2, "Code"],
    ["commits", GitCommitHorizontal, "Commits"],
    ["branches", GitBranch, "Branches"],
    ["settings", Activity, "Settings"],
  ];
  return (
    <div className="tabs">
      {tabs.map(([key, Icon, label]) => (
        <button key={key} className={active === key ? "active" : ""} onClick={() => onChange(key)}>
          <Icon size={16} />
          {label}
        </button>
      ))}
    </div>
  );
}

function CodeView({ owner, repo, ref, path, tree, filePreview, onCloseFile, onOpen, onUp }) {
  return (
    <div className="panel">
      <div className="panelHeader">
        <div>
          <strong>{path || "/"}</strong>
          <span>{tree.length} entries at {ref}</span>
        </div>
        {path ? <button className="secondary" onClick={onUp}>Up</button> : null}
      </div>
      {tree.length ? (
        <div className="fileList">
          {tree.map((entry) => (
            <button key={entry.hash + entry.path} onClick={() => onOpen(entry)} className="fileRow">
              {entry.type === "tree" ? <Folder size={18} /> : <File size={18} />}
              <span>{entry.name}</span>
              <code>{entry.type}</code>
            </button>
          ))}
        </div>
      ) : (
        <div className="emptyPanel">
          <BookOpen size={28} />
          <strong>No files on this ref yet</strong>
          <code>git remote add origin http://localhost:8080/git/{owner}/{repo.name}.git</code>
        </div>
      )}
      {filePreview ? (
        <div className="preview">
          <div className="panelHeader">
            <div>
              <strong>{filePreview.path}</strong>
              <span>Text preview</span>
            </div>
            <button className="secondary" onClick={onCloseFile}>Close</button>
          </div>
          <pre>{filePreview.content}</pre>
        </div>
      ) : null}
    </div>
  );
}

function CommitView({ commits, diffPreview, onOpenDiff, onCloseDiff }) {
  return (
    <div className="panel">
      <div className="panelHeader">
        <div>
          <strong>Commit history</strong>
          <span>{commits.length} most recent commits</span>
        </div>
      </div>
      <div className="timeline">
        {commits.length ? commits.map((commit) => (
          <article key={commit.hash}>
            <GitCommitHorizontal size={18} />
            <div>
              <strong>{commit.subject}</strong>
              <span>{commit.author} committed {new Date(commit.date).toLocaleString()}</span>
              <code>{commit.hash.slice(0, 12)}</code>
              <button className="secondary compact" onClick={() => onOpenDiff(commit)}>View diff</button>
            </div>
          </article>
        )) : <p>No commits have been pushed yet.</p>}
      </div>
      {diffPreview ? (
        <div className="preview">
          <div className="panelHeader">
            <div>
              <strong>Diff {diffPreview.hash.slice(0, 12)}</strong>
              <span>Patch output from backend</span>
            </div>
            <button className="secondary" onClick={onCloseDiff}>Close</button>
          </div>
          <pre>{diffPreview.diff}</pre>
        </div>
      ) : null}
    </div>
  );
}

function BranchView({ branches }) {
  return (
    <div className="panel branchGrid">
      {branches.length ? branches.map((branch) => (
        <article key={branch.name}>
          <GitBranch size={18} />
          <strong>{branch.name}</strong>
          <span>{branch.current ? "default branch" : "branch"}</span>
        </article>
      )) : <p>No branches found.</p>}
    </div>
  );
}

function SettingsView({ repo, onVisibility, onDelete }) {
  return (
    <div className="panel settingsGrid">
      <article>
        <Terminal size={20} />
        <strong>Git remote</strong>
        <code>http://localhost:8080/git/&lt;owner&gt;/{repo.name}.git</code>
      </article>
      <article>
        <GitPullRequest size={20} />
        <strong>Async storage</strong>
        <span>Pushes enqueue R2 sync jobs after local Git receives the update.</span>
      </article>
      <article>
        <Lock size={20} />
        <strong>Visibility</strong>
        <select value={repo.visibility} onChange={(event) => onVisibility(event.target.value)}>
          <option value="private">Private</option>
          <option value="public">Public</option>
        </select>
      </article>
      <article>
        <Activity size={20} />
        <strong>Danger zone</strong>
        <button className="danger" onClick={onDelete}>Delete repository</button>
      </article>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="emptyState">
      <Plus size={30} />
      <strong>No repositories yet</strong>
      <span>Create one from the sidebar to start pushing code.</span>
    </div>
  );
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  const response = await fetch(`${apiBase}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
