"use client";

import {
  Activity01Icon,
  Add01Icon,
  BookOpen01Icon,
  Cancel01Icon,
  CodeFolderIcon,
  Copy01Icon,
  File01Icon,
  Folder01Icon,
  GitBranchIcon,
  GitCommitIcon,
  GitPullRequestIcon,
  GithubIcon,
  LockKeyIcon,
  Logout01Icon,
  RefreshIcon,
  Search01Icon,
  Settings01Icon,
  TerminalIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { apiBase } from "../lib/api";
import { Icon } from "./Icon";
import { Button, Input, Message, Panel, Select } from "./ui";

export function Dashboard({ state }) {
  if (!state.user) return null;
  const selected = state.repoDetail || state.selected;
  return (
    <main className="min-h-screen bg-[#f6f8fa] text-[#1f2328]">
      <TopNav user={state.user} message={state.message} onLogout={state.logout} />
      <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 lg:grid-cols-[296px_1fr]">
        <Sidebar state={state} />
        <section className="min-w-0">
          <Message>{state.message}</Message>
          {selected ? <Repository state={state} repo={selected} /> : <EmptyState />}
        </section>
      </div>
    </main>
  );
}

function TopNav({ user, onLogout }) {
  return (
    <header className="border-b border-neutral-300 bg-[#24292f] text-white">
      <div className="mx-auto flex min-h-16 max-w-[1440px] items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-3">
          <Icon icon={GithubIcon} size={28} />
          <strong className="text-lg">GitDaddy</strong>
          <span className="hidden rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white/70 sm:inline">GitHub alternative</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 text-sm font-semibold text-white/80 sm:flex">
            <Icon icon={UserIcon} size={17} />
            {user.username}
          </span>
          <Button className="border-white/20 bg-transparent text-white hover:bg-white/10" onClick={onLogout}>
            <Icon icon={Logout01Icon} size={17} />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}

function Sidebar({ state }) {
  return (
    <aside className="grid content-start gap-4">
      <Panel className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <strong>Repositories</strong>
          <span className="text-sm text-neutral-500">{state.repos.length}</span>
        </div>
        <div className="mb-3 flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3">
          <Icon icon={Search01Icon} size={17} className="text-neutral-500" />
          <input className="min-h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" value={state.query} onChange={(event) => state.setQuery(event.target.value)} placeholder="Find a repository" />
        </div>
        <div className="grid gap-1">
          {state.filteredRepos.map((repo) => (
            <button key={repo.id} className={`flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-semibold ${state.selected?.id === repo.id ? "bg-[#ddf4ff] text-[#0969da]" : "hover:bg-neutral-100"}`} onClick={() => state.chooseRepo(repo)}>
              <Icon icon={CodeFolderIcon} size={17} />
              <span className="truncate">{repo.name}</span>
              <span className="ml-auto rounded-full border border-neutral-300 px-2 py-0.5 text-[11px] text-neutral-500">{repo.visibility}</span>
            </button>
          ))}
        </div>
      </Panel>
      <CreateRepo busy={state.busy} onSubmit={state.createRepo} />
      <Stats state={state} />
    </aside>
  );
}

function CreateRepo({ busy, onSubmit }) {
  return (
    <Panel className="p-4">
      <form className="grid gap-3" onSubmit={(event) => {
        event.preventDefault();
        onSubmit(Object.fromEntries(new FormData(event.currentTarget)));
        event.currentTarget.reset();
      }}>
        <strong>New repository</strong>
        <Input name="name" placeholder="service-api" required />
        <Select name="visibility" defaultValue="private">
          <option value="private">Private</option>
          <option value="public">Public</option>
        </Select>
        <Button variant="primary" disabled={busy} type="submit">
          <Icon icon={Add01Icon} size={17} />
          Create
        </Button>
      </form>
    </Panel>
  );
}

function Stats({ state }) {
  const items = [
    ["Repositories", state.platformStats?.repositories ?? state.repos.length],
    ["Branches", state.repoStats?.branches ?? state.branches.length],
    ["Commits", state.repoStats?.commits ?? state.commits.length],
    ["Pending sync jobs", state.platformStats?.pending_jobs ?? 0],
  ];
  return (
    <Panel className="grid grid-cols-2 overflow-hidden">
      {items.map(([label, value]) => (
        <div className="border-b border-r border-neutral-200 p-4" key={label}>
          <span className="block text-xs font-semibold text-neutral-500">{label}</span>
          <strong className="text-2xl">{value}</strong>
        </div>
      ))}
    </Panel>
  );
}

function Repository({ state, repo }) {
  const clone = `${apiBase}/git/${state.owner}/${repo.name}.git`;
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <Icon icon={CodeFolderIcon} size={18} />
            <span>{state.owner}</span>
            <span>/</span>
            <strong className="text-[#0969da]">{repo.name}</strong>
            <span className="rounded-full border border-neutral-300 px-2 py-0.5 text-xs">{repo.visibility}</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold">{state.owner}/{repo.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => navigator.clipboard?.writeText(`git clone ${clone}`)}>
            <Icon icon={Copy01Icon} size={17} />
            Clone
          </Button>
          <Button onClick={() => state.loadRepo()}>
            <Icon icon={RefreshIcon} size={17} />
            Refresh
          </Button>
        </div>
      </div>
      <Tabs active={state.activeTab} onChange={state.setActiveTab} />
      {state.activeTab === "code" ? <CodeView state={state} clone={clone} /> : null}
      {state.activeTab === "commits" ? <CommitView state={state} /> : null}
      {state.activeTab === "branches" ? <BranchView state={state} /> : null}
      {state.activeTab === "pulls" ? <PullRequestView state={state} /> : null}
      {state.activeTab === "settings" ? <SettingsView state={state} repo={repo} clone={clone} /> : null}
    </div>
  );
}

function Tabs({ active, onChange }) {
  const tabs = [
    ["code", CodeFolderIcon, "Code"],
    ["commits", GitCommitIcon, "Commits"],
    ["branches", GitBranchIcon, "Branches"],
    ["pulls", GitPullRequestIcon, "Pull requests"],
    ["settings", Settings01Icon, "Settings"],
  ];
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-neutral-300">
      {tabs.map(([key, icon, label]) => (
        <button key={key} className={`flex min-h-12 items-center gap-2 border-b-2 px-3 text-sm font-semibold ${active === key ? "border-[#fd8c73] text-neutral-950" : "border-transparent text-neutral-600 hover:bg-neutral-100"}`} onClick={() => onChange(key)}>
          <Icon icon={icon} size={17} />
          {label}
        </button>
      ))}
    </div>
  );
}

function CodeView({ state, clone }) {
  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-300 bg-[#f6f8fa] p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={state.ref} onChange={(event) => state.changeRef(event.target.value)}>
            <option value="HEAD">HEAD</option>
            {state.branches.map((branch) => <option key={branch.name} value={branch.name}>{branch.name}</option>)}
          </Select>
          <span className="text-sm text-neutral-600">{state.path || "/"} · {state.tree.length} entries</span>
        </div>
        {state.path ? <Button onClick={state.upPath}>Up</Button> : null}
      </div>
      {state.tree.length ? (
        <div className="divide-y divide-neutral-200">
          {state.tree.map((entry) => (
            <button key={entry.hash + entry.path} className="grid w-full grid-cols-[28px_1fr_auto] items-center gap-3 px-4 py-3 text-left text-sm hover:bg-[#f6f8fa]" onClick={() => state.openEntry(entry)}>
              <Icon icon={entry.type === "tree" ? Folder01Icon : File01Icon} size={18} className={entry.type === "tree" ? "text-[#54aeff]" : "text-neutral-500"} />
              <span className="font-semibold text-[#0969da]">{entry.name}</span>
              <code className="rounded bg-neutral-100 px-2 py-1 text-xs text-neutral-600">{entry.type}</code>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid justify-items-center gap-3 p-12 text-center">
          <Icon icon={BookOpen01Icon} size={34} className="text-neutral-500" />
          <strong>No files on this ref yet</strong>
          <code className="rounded bg-neutral-100 px-3 py-2 text-sm">git remote add origin {clone}</code>
        </div>
      )}
      {state.filePreview ? <Preview title={state.filePreview.path} subtitle="Text preview" content={state.filePreview.content} onClose={() => state.setFilePreview(null)} /> : null}
    </Panel>
  );
}

function CommitView({ state }) {
  return (
    <Panel className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <strong>Commit history</strong>
          <p className="text-sm text-neutral-600">{state.commits.length} most recent commits</p>
        </div>
      </div>
      <div className="grid gap-3">
        {state.commits.length ? state.commits.map((commit) => (
          <article className="rounded-md border border-neutral-200 p-4" key={commit.hash}>
            <strong>{commit.subject}</strong>
            <p className="mt-1 text-sm text-neutral-600">{commit.author} committed {new Date(commit.date).toLocaleString()}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="rounded bg-neutral-100 px-2 py-1 text-xs">{commit.hash.slice(0, 12)}</code>
              <Button className="min-h-8 px-2" onClick={() => state.openDiff(commit)}>View diff</Button>
            </div>
          </article>
        )) : <p className="text-sm text-neutral-600">No commits have been pushed yet.</p>}
      </div>
      {state.diffPreview ? <Preview title={`Diff ${state.diffPreview.hash.slice(0, 12)}`} subtitle="Patch output from backend" content={state.diffPreview.diff} onClose={() => state.setDiffPreview(null)} /> : null}
    </Panel>
  );
}

function BranchView({ state }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Panel className="divide-y divide-neutral-200">
        {state.branches.length ? state.branches.map((branch) => (
          <article className="flex items-center gap-3 p-4" key={branch.name}>
            <Icon icon={GitBranchIcon} size={19} />
            <div>
              <strong>{branch.name}</strong>
              <p className="text-sm text-neutral-600">{branch.current ? "default branch" : "branch"}</p>
            </div>
          </article>
        )) : <p className="p-4 text-sm text-neutral-600">No branches found.</p>}
      </Panel>
      <Panel className="p-4">
        <BranchForm state={state} />
      </Panel>
    </div>
  );
}

function BranchForm({ state }) {
  return (
    <form className="grid gap-3" onSubmit={(event) => {
      event.preventDefault();
      state.createBranch(Object.fromEntries(new FormData(event.currentTarget)));
      event.currentTarget.reset();
    }}>
      <strong>Create branch</strong>
      <Input name="name" placeholder="feature/r2-cache" required />
      <Input name="from" placeholder={state.ref || "HEAD"} />
      <Button variant="primary" disabled={state.busy} type="submit">
        <Icon icon={GitBranchIcon} size={17} />
        Create branch
      </Button>
    </form>
  );
}

function PullRequestView({ state }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <Panel className="divide-y divide-neutral-200">
        {state.pulls.length ? state.pulls.map((pull) => (
          <article className="p-4" key={pull.id}>
            <div className="flex items-start gap-3">
              <Icon icon={GitPullRequestIcon} size={20} className="text-[#1f883d]" />
              <div>
                <strong>#{pull.id} {pull.title}</strong>
                <p className="mt-1 text-sm text-neutral-600">{pull.source} into {pull.target} · {pull.status}</p>
                {pull.body ? <p className="mt-3 text-sm text-neutral-700">{pull.body}</p> : null}
              </div>
            </div>
          </article>
        )) : <p className="p-4 text-sm text-neutral-600">No pull requests yet.</p>}
      </Panel>
      <Panel className="p-4">
        <PullForm state={state} />
      </Panel>
    </div>
  );
}

function PullForm({ state }) {
  return (
    <form className="grid gap-3" onSubmit={(event) => {
      event.preventDefault();
      state.createPullRequest(Object.fromEntries(new FormData(event.currentTarget)));
      event.currentTarget.reset();
    }}>
      <strong>Open pull request</strong>
      <Input name="title" placeholder="Add repository cache restore" required />
      <textarea className="min-h-24 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0969da]" name="body" placeholder="Describe the change" />
      <Select name="source" defaultValue="">
        <option value="" disabled>Compare branch</option>
        {state.branches.map((branch) => <option key={branch.name} value={branch.name}>{branch.name}</option>)}
      </Select>
      <Select name="target" defaultValue={state.branches.find((branch) => branch.current)?.name || state.branches[0]?.name || ""}>
        {state.branches.map((branch) => <option key={branch.name} value={branch.name}>{branch.name}</option>)}
      </Select>
      <Button variant="primary" disabled={state.busy || state.branches.length < 2} type="submit">
        <Icon icon={GitPullRequestIcon} size={17} />
        Open pull request
      </Button>
    </form>
  );
}

function SettingsView({ state, repo, clone }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Panel className="p-4">
        <Icon icon={TerminalIcon} size={22} />
        <strong className="mt-3 block">Git remote</strong>
        <code className="mt-2 block overflow-auto rounded bg-neutral-100 p-3 text-sm">{clone}</code>
      </Panel>
      <Panel className="p-4">
        <Icon icon={LockKeyIcon} size={22} />
        <strong className="mt-3 block">Visibility</strong>
        <Select className="mt-3 w-full" value={repo.visibility} onChange={(event) => state.updateVisibility(event.target.value)}>
          <option value="private">Private</option>
          <option value="public">Public</option>
        </Select>
      </Panel>
      <Panel className="p-4">
        <Icon icon={Activity01Icon} size={22} />
        <strong className="mt-3 block">Async storage</strong>
        <p className="mt-2 text-sm text-neutral-600">Pushes enqueue R2 sync jobs after local Git receives the update.</p>
      </Panel>
      <Panel className="border-red-300 p-4">
        <Icon icon={Cancel01Icon} size={22} className="text-red-600" />
        <strong className="mt-3 block">Danger zone</strong>
        <Button className="mt-3" variant="danger" onClick={state.deleteRepo}>Delete repository</Button>
      </Panel>
    </div>
  );
}

function Preview({ title, subtitle, content, onClose }) {
  return (
    <div className="border-t border-neutral-300">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-300 bg-[#f6f8fa] p-3">
        <div>
          <strong>{title}</strong>
          <p className="text-sm text-neutral-600">{subtitle}</p>
        </div>
        <Button onClick={onClose}>Close</Button>
      </div>
      <pre className="max-h-[520px] overflow-auto bg-[#0d1117] p-4 text-sm leading-6 text-[#e6edf3]">
        {content}
      </pre>
    </div>
  );
}

function EmptyState() {
  return (
    <Panel className="grid justify-items-center gap-3 p-12 text-center">
      <Icon icon={Add01Icon} size={34} className="text-neutral-500" />
      <strong>No repositories yet</strong>
      <span className="text-sm text-neutral-600">Create one from the sidebar to start pushing code.</span>
    </Panel>
  );
}
