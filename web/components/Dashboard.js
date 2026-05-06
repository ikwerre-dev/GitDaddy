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
  LockKeyIcon,
  Logout01Icon,
  MoreVerticalIcon,
  RefreshIcon,
  Search01Icon,
  Settings01Icon,
  StarIcon,
  TerminalIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { apiBase } from "../lib/api";
import { Icon } from "./Icon";
import { Input, Message, Panel, Select } from "./ui";

export function Dashboard({ state }) {
  if (!state.user) return null;
  const selected = state.repoDetail || state.selected;

  return (
    <main className="min-h-screen bg-[#f6f8fa] font-['Space_Grotesk','Inter',ui-sans-serif,system-ui] text-[#1f2328]">
      <TopNav user={state.user} onLogout={state.logout} />
      <div className="grid min-h-[calc(100vh-64px)] lg:grid-cols-[304px_1fr]">
        <Sidebar state={state} />
        <section className="min-w-0 px-4 py-5 lg:px-6">
          <Message>{state.message}</Message>
          {selected ? <Repository state={state} repo={selected} /> : <HomeDashboard state={state} />}
        </section>
      </div>
    </main>
  );
}

function TopNav({ user, onLogout }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#d8dee4] bg-white/95 backdrop-blur">
      <div className="grid min-h-16 grid-cols-[auto_1fr_auto] items-center gap-4 px-4">
        <div className="flex items-center gap-4">
          <button className="inline-grid h-9 w-9 cursor-pointer place-items-center rounded-md border border-transparent text-neutral-700 hover:bg-[#f6f8fa]" type="button" aria-label="Menu">
            <span className="block h-0.5 w-4 bg-current shadow-[0_6px_0_current,0_-6px_0_current]" />
          </button>
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[#24292f] text-white">
            <Icon icon={GitBranchIcon} size={24} />
          </div>
          <strong className="hidden text-xl sm:block">GitDaddy</strong>
        </div>

        <label className="mx-auto hidden h-11 w-full max-w-xl items-center gap-3 rounded-lg border border-[#d8dee4] bg-white px-4 text-sm text-neutral-500 shadow-sm md:flex">
          <Icon icon={Search01Icon} size={19} />
          <input className="min-w-0 flex-1 bg-transparent outline-none" placeholder="Search or jump to..." />
          <kbd className="rounded border border-neutral-300 px-2 py-0.5 text-xs text-neutral-500">/</kbd>
        </label>

        <div className="flex items-center justify-end gap-2">
          <button className="inline-grid h-9 w-9 cursor-pointer place-items-center rounded-md border border-transparent hover:bg-[#f6f8fa]" type="button" aria-label="Create">
            <Icon icon={Add01Icon} size={20} />
          </button>
          <button className="hidden h-9 cursor-pointer items-center gap-2 rounded-md border border-[#d8dee4] bg-white px-3 text-sm font-semibold hover:bg-[#f6f8fa] sm:inline-flex" type="button" onClick={onLogout}>
            <Icon icon={Logout01Icon} size={17} />
            Logout
          </button>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-[#0969da] text-sm font-black text-white">
            {user.username.slice(0, 1).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}

function Sidebar({ state }) {
  return (
    <aside className="hidden border-r border-[#d8dee4] bg-white p-5 lg:block">
      <nav className="grid gap-1">
        <SideLink active icon={BookOpen01Icon} label="Home" />
        <SideLink icon={GitPullRequestIcon} label="Pull requests" count={state.pulls.length} />
        <SideLink icon={Activity01Icon} label="Activity" />
        <SideLink icon={StarIcon} label="Stars" />
        <SideLink icon={Settings01Icon} label="Settings" />
      </nav>

      <div className="my-5 border-t border-[#d8dee4]" />

      <div className="mb-3 flex items-center justify-between">
        <strong className="text-sm">Repositories</strong>
        <button className="inline-grid h-8 w-8 cursor-pointer place-items-center rounded-md text-neutral-600 hover:bg-[#f6f8fa]" type="button">
          <Icon icon={Add01Icon} size={18} />
        </button>
      </div>
      <label className="mb-3 flex h-10 items-center gap-2 rounded-md border border-[#d8dee4] bg-white px-3 text-sm text-neutral-500">
        <Icon icon={Search01Icon} size={17} />
        <input className="min-w-0 flex-1 bg-transparent outline-none" value={state.query} onChange={(event) => state.setQuery(event.target.value)} placeholder="Find a repository..." />
      </label>
      <div className="grid gap-1">
        {state.filteredRepos.map((repo) => (
          <button key={repo.id} className={`grid cursor-pointer grid-cols-[18px_1fr_auto] items-center gap-2 rounded-md px-2 py-2 text-left text-sm ${state.selected?.id === repo.id ? "bg-[#ddf4ff] text-[#0969da]" : "hover:bg-[#f6f8fa]"}`} onClick={() => state.chooseRepo(repo)} type="button">
            <Icon icon={CodeFolderIcon} size={17} />
            <span className="truncate font-semibold">{state.owner} / {repo.name}</span>
            <span className={`h-2 w-2 rounded-full ${repo.visibility === "public" ? "bg-[#0969da]" : "border border-neutral-500"}`} />
          </button>
        ))}
      </div>
    </aside>
  );
}

function SideLink({ active = false, icon, label, count }) {
  return (
    <button className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm font-semibold ${active ? "bg-[#ddf4ff] text-[#0969da]" : "text-neutral-700 hover:bg-[#f6f8fa]"}`} type="button">
      <Icon icon={icon} size={19} />
      <span>{label}</span>
      {count ? <span className="ml-auto rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{count}</span> : null}
    </button>
  );
}

function HomeDashboard({ state }) {
  return (
    <div className="mx-auto grid max-w-[1180px] gap-6 xl:grid-cols-[1fr_360px]">
      <section className="grid gap-5">
        <h1 className="text-2xl font-semibold">Home</h1>
        <CreateCard state={state} />
        <Panel className="overflow-hidden">
          <div className="border-b border-[#d8dee4] px-5 py-4">
            <strong>Recent activity</strong>
          </div>
          <div className="divide-y divide-[#d8dee4]">
            {state.repos.length ? state.repos.map((repo, index) => (
              <button className="grid w-full grid-cols-[42px_1fr_auto] items-center gap-4 px-5 py-4 text-left hover:bg-[#f6f8fa]" key={repo.id} onClick={() => state.chooseRepo(repo)} type="button">
                <div className={`grid h-10 w-10 place-items-center rounded-full ${index % 2 ? "bg-[#dafbe1] text-[#1a7f37]" : "bg-[#ddf4ff] text-[#0969da]"}`}>
                  <Icon icon={CodeFolderIcon} size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-neutral-500">{state.owner} / {repo.name}</p>
                  <strong className="block truncate">Repository ready for normal git push and pull</strong>
                  <p className="mt-1 text-sm text-neutral-500">{repo.visibility} · created {formatDate(repo.created_at)}</p>
                </div>
                <Icon icon={GitBranchIcon} size={20} className="text-neutral-500" />
              </button>
            )) : (
              <div className="p-8 text-sm text-neutral-600">Create a repository to start hosting code.</div>
            )}
          </div>
        </Panel>
      </section>
      <RightRail state={state} />
    </div>
  );
}

function CreateCard({ state }) {
  return (
    <Panel className="p-5">
      <form className="grid gap-4 sm:grid-cols-[52px_1fr_auto] sm:items-center" onSubmit={(event) => {
        event.preventDefault();
        state.createRepo(Object.fromEntries(new FormData(event.currentTarget)));
        event.currentTarget.reset();
      }}>
        <div className="grid h-12 w-12 place-items-center rounded-full bg-[#0969da] text-white">
          <Icon icon={BookOpen01Icon} size={24} />
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_150px]">
          <div>
            <strong>Create something new</strong>
            <p className="mt-1 text-sm text-neutral-600">Start a repo, push with plain Git, and browse it here.</p>
          </div>
          <Select name="visibility" defaultValue="private">
            <option value="private">Private</option>
            <option value="public">Public</option>
          </Select>
        </div>
        <div className="flex gap-2">
          <Input className="w-44" name="name" placeholder="new-repo" required />
          <button className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-md border border-[#1f883d] bg-[#1f883d] px-4 text-sm font-semibold text-white hover:bg-[#1a7f37] disabled:opacity-60" disabled={state.busy} type="submit">
            New repository
          </button>
        </div>
      </form>
    </Panel>
  );
}

function Repository({ state, repo }) {
  const clone = `${apiBase}/git/${state.owner}/${repo.name}.git`;

  return (
    <div className="mx-auto max-w-[1500px]">
      <RepoHeader state={state} repo={repo} clone={clone} />
      <RepoTabs active={state.activeTab} onChange={state.setActiveTab} commits={state.repoStats?.commits ?? state.commits.length} pulls={state.pulls.length} />
      <div className="grid gap-6 py-6 xl:grid-cols-[1fr_306px]">
        <section className="min-w-0">
          {state.activeTab === "code" ? <CodeView state={state} clone={clone} /> : null}
          {state.activeTab === "commits" ? <CommitView state={state} /> : null}
          {state.activeTab === "branches" ? <BranchView state={state} /> : null}
          {state.activeTab === "pulls" ? <PullRequestView state={state} /> : null}
          {state.activeTab === "settings" ? <SettingsView state={state} repo={repo} clone={clone} /> : null}
        </section>
        <RepoAbout state={state} repo={repo} clone={clone} />
      </div>
    </div>
  );
}

function RepoHeader({ state, repo, clone }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-4">
      <div className="flex min-w-0 items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-[#111827] text-white">
          <Icon icon={GitBranchIcon} size={30} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold text-[#0969da]">{repo.name}</h1>
            <span className="rounded-full border border-[#d8dee4] px-2 py-0.5 text-xs font-semibold text-neutral-600">{repo.visibility}</span>
          </div>
          <p className="mt-1 text-sm text-neutral-600">{state.owner} / {repo.name}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <RepoButton icon={BookOpen01Icon} label="Watch" value={state.repoStats?.branches ?? state.branches.length} />
        <RepoButton icon={GitBranchIcon} label="Fork" value="0" />
        <RepoButton icon={StarIcon} label="Star" value="0" />
        <button className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-[#d8dee4] bg-white px-3 text-sm font-semibold hover:bg-[#f6f8fa]" onClick={() => navigator.clipboard?.writeText(`git clone ${clone}`)} type="button">
          <Icon icon={Copy01Icon} size={17} />
          Clone
        </button>
      </div>
    </div>
  );
}

function RepoButton({ icon, label, value }) {
  return (
    <button className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-[#d8dee4] bg-white px-3 text-sm font-semibold hover:bg-[#f6f8fa]" type="button">
      <Icon icon={icon} size={17} />
      <span>{label}</span>
      <span className="rounded-full bg-[#f6f8fa] px-2 py-0.5 text-xs">{value}</span>
    </button>
  );
}

function RepoTabs({ active, onChange, commits, pulls }) {
  const tabs = [
    ["code", CodeFolderIcon, "Code", null],
    ["commits", GitCommitIcon, "Commits", commits],
    ["branches", GitBranchIcon, "Branches", null],
    ["pulls", GitPullRequestIcon, "Pull requests", pulls],
    ["settings", Settings01Icon, "Settings", null],
  ];
  return (
    <div className="-mx-4 border-y border-[#d8dee4] bg-white px-4 lg:-mx-6 lg:px-6">
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map(([key, icon, label, count]) => (
          <button key={key} className={`flex min-h-14 cursor-pointer items-center gap-2 border-b-2 px-3 text-sm font-semibold ${active === key ? "border-[#fd8c73] text-[#24292f]" : "border-transparent text-neutral-600 hover:bg-[#f6f8fa]"}`} onClick={() => onChange(key)} type="button">
            <Icon icon={icon} size={18} />
            {label}
            {count ? <span className="rounded-full bg-[#eaeef2] px-2 py-0.5 text-xs">{count}</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function CodeView({ state, clone }) {
  const lastCommit = state.commits[0];
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={state.ref} onChange={(event) => state.changeRef(event.target.value)}>
            <option value="HEAD">HEAD</option>
            {state.branches.map((branch) => <option key={branch.name} value={branch.name}>{branch.name}</option>)}
          </Select>
          <button className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-[#d8dee4] bg-white px-3 text-sm font-semibold hover:bg-[#f6f8fa]" type="button">
            <Icon icon={GitBranchIcon} size={17} />
            {state.branches.length} branches
          </button>
          <button className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-[#d8dee4] bg-white px-3 text-sm font-semibold hover:bg-[#f6f8fa]" type="button">
            <Icon icon={GitCommitIcon} size={17} />
            {state.commits.length} commits
          </button>
        </div>
        {state.path ? <button className="inline-flex min-h-10 cursor-pointer items-center rounded-md border border-[#d8dee4] bg-white px-3 text-sm font-semibold hover:bg-[#f6f8fa]" onClick={state.upPath} type="button">Up one level</button> : null}
      </div>

      <Panel className="overflow-hidden">
        <div className="grid gap-3 border-b border-[#d8dee4] bg-[#f6f8fa] px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="min-w-0 text-sm">
            <strong>{lastCommit?.author || "GitDaddy"}</strong>
            <span className="ml-2 text-neutral-600">{lastCommit?.subject || "No commits pushed yet"}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-neutral-600">
            {lastCommit ? <code>{lastCommit.hash.slice(0, 7)}</code> : null}
            <strong className="text-neutral-800">{state.repoStats?.commits ?? state.commits.length} Commits</strong>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_minmax(180px,0.9fr)_120px] border-b border-[#d8dee4] px-4 py-2 text-xs font-semibold text-neutral-600">
          <span>Name</span>
          <span className="hidden sm:block">Last commit message</span>
          <span className="text-right">Type</span>
        </div>
        {state.tree.length ? (
          <div className="divide-y divide-[#d8dee4]">
            {state.tree.map((entry) => (
              <button key={entry.hash + entry.path} className="grid w-full grid-cols-[1fr_120px] gap-3 px-4 py-3 text-left text-sm hover:bg-[#f6f8fa] sm:grid-cols-[1fr_minmax(180px,0.9fr)_120px]" onClick={() => state.openEntry(entry)} type="button">
                <span className="flex min-w-0 items-center gap-3 font-semibold text-[#0969da]">
                  <Icon icon={entry.type === "tree" ? Folder01Icon : File01Icon} size={19} className={entry.type === "tree" ? "text-[#54aeff]" : "text-neutral-500"} />
                  <span className="truncate">{entry.name}</span>
                </span>
                <span className="hidden truncate text-neutral-600 sm:block">{lastCommit?.subject || "Waiting for first push"}</span>
                <code className="text-right text-xs text-neutral-500">{entry.type === "tree" ? "directory" : "file"}</code>
              </button>
            ))}
          </div>
        ) : (
          <EmptyRepo clone={clone} />
        )}
        {state.filePreview ? <Preview title={state.filePreview.path} subtitle="Text preview" content={state.filePreview.content} onClose={() => state.setFilePreview(null)} /> : null}
      </Panel>
    </div>
  );
}

function EmptyRepo({ clone }) {
  return (
    <div className="grid justify-items-center gap-3 p-10 text-center">
      <Icon icon={TerminalIcon} size={32} className="text-neutral-500" />
      <strong>This repository is empty.</strong>
      <p className="max-w-xl text-sm leading-6 text-neutral-600">Push your local project with the normal Git command line.</p>
      <code className="max-w-full overflow-auto rounded-md bg-[#f6f8fa] px-3 py-2 text-sm">git remote add origin {clone}</code>
    </div>
  );
}

function CommitView({ state }) {
  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-[#d8dee4] px-5 py-4">
        <strong>Commit history</strong>
        <p className="mt-1 text-sm text-neutral-600">{state.commits.length} most recent commits</p>
      </div>
      <div className="divide-y divide-[#d8dee4]">
        {state.commits.length ? state.commits.map((commit) => (
          <article className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto]" key={commit.hash}>
            <div>
              <strong>{commit.subject}</strong>
              <p className="mt-1 text-sm text-neutral-600">{commit.author} committed {formatDate(commit.date)}</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="rounded-md border border-[#d8dee4] bg-[#f6f8fa] px-2 py-1 text-xs">{commit.hash.slice(0, 12)}</code>
              <button className="inline-flex min-h-8 cursor-pointer items-center justify-center rounded-md border border-[#d8dee4] bg-white px-2 text-sm font-semibold hover:bg-[#f6f8fa]" onClick={() => state.openDiff(commit)} type="button">View diff</button>
            </div>
          </article>
        )) : <p className="p-5 text-sm text-neutral-600">No commits have been pushed yet.</p>}
      </div>
      {state.diffPreview ? <Preview title={`Diff ${state.diffPreview.hash.slice(0, 12)}`} subtitle="Patch output from backend" content={state.diffPreview.diff} onClose={() => state.setDiffPreview(null)} /> : null}
    </Panel>
  );
}

function BranchView({ state }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Panel className="divide-y divide-[#d8dee4] overflow-hidden">
        {state.branches.length ? state.branches.map((branch) => (
          <article className="flex items-center gap-3 p-4" key={branch.name}>
            <Icon icon={GitBranchIcon} size={19} className="text-neutral-600" />
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
      <button className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#1f883d] bg-[#1f883d] px-3 text-sm font-semibold text-white hover:bg-[#1a7f37] disabled:cursor-not-allowed disabled:opacity-60" disabled={state.busy} type="submit">
        <Icon icon={GitBranchIcon} size={17} />
        Create branch
      </button>
    </form>
  );
}

function PullRequestView({ state }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <Panel className="divide-y divide-[#d8dee4] overflow-hidden">
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
      <textarea className="min-h-24 rounded-md border border-[#d8dee4] bg-white px-3 py-2 text-sm outline-none focus:border-[#0969da]" name="body" placeholder="Describe the change" />
      <Select name="source" defaultValue="">
        <option value="" disabled>Compare branch</option>
        {state.branches.map((branch) => <option key={branch.name} value={branch.name}>{branch.name}</option>)}
      </Select>
      <Select name="target" defaultValue={state.branches.find((branch) => branch.current)?.name || state.branches[0]?.name || ""}>
        {state.branches.map((branch) => <option key={branch.name} value={branch.name}>{branch.name}</option>)}
      </Select>
      <button className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#1f883d] bg-[#1f883d] px-3 text-sm font-semibold text-white hover:bg-[#1a7f37] disabled:cursor-not-allowed disabled:opacity-60" disabled={state.busy || state.branches.length < 2} type="submit">
        <Icon icon={GitPullRequestIcon} size={17} />
        Open pull request
      </button>
    </form>
  );
}

function SettingsView({ state, repo, clone }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Panel className="p-4">
        <Icon icon={TerminalIcon} size={22} />
        <strong className="mt-3 block">Git remote</strong>
        <code className="mt-2 block overflow-auto rounded-md bg-[#f6f8fa] p-3 text-sm">{clone}</code>
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
      <CollaboratorsPanel state={state} />
      <Panel className="border-red-300 p-4">
        <Icon icon={Cancel01Icon} size={22} className="text-red-600" />
        <strong className="mt-3 block">Danger zone</strong>
        <button className="mt-3 inline-flex min-h-9 cursor-pointer items-center justify-center rounded-md border border-red-600 bg-white px-3 text-sm font-semibold text-red-600 hover:bg-red-50" onClick={state.deleteRepo} type="button">Delete repository</button>
      </Panel>
    </div>
  );
}

function CollaboratorsPanel({ state }) {
  return (
    <Panel className="p-4 md:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Icon icon={UserIcon} size={22} />
          <strong className="mt-3 block">Collaborators</strong>
          <p className="mt-1 text-sm text-neutral-600">Give another GitDaddy user read, write, or admin access to this repository.</p>
        </div>
        <span className="rounded-full bg-[#f6f8fa] px-3 py-1 text-xs font-semibold text-neutral-600">{state.collaborators.length} collaborators</span>
      </div>

      <form className="mt-4 grid gap-3 lg:grid-cols-[1fr_160px_auto]" onSubmit={(event) => {
        event.preventDefault();
        state.addCollaborator(Object.fromEntries(new FormData(event.currentTarget)));
        event.currentTarget.reset();
      }}>
        <Input name="username" placeholder="username" required />
        <Select name="role" defaultValue="write">
          <option value="read">Read</option>
          <option value="write">Write</option>
          <option value="admin">Admin</option>
        </Select>
        <button className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#1f883d] bg-[#1f883d] px-3 text-sm font-semibold text-white hover:bg-[#1a7f37] disabled:cursor-not-allowed disabled:opacity-60" disabled={state.busy} type="submit">
          <Icon icon={Add01Icon} size={17} />
          Add collaborator
        </button>
      </form>

      <div className="mt-5 overflow-hidden rounded-md border border-[#d8dee4]">
        {state.collaborators.length ? state.collaborators.map((collaborator) => (
          <div className="grid gap-3 border-b border-[#d8dee4] p-3 last:border-b-0 sm:grid-cols-[1fr_auto_auto] sm:items-center" key={collaborator.user_id}>
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[#0969da] text-sm font-black text-white">
                {collaborator.username.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <strong className="block truncate">{collaborator.username}</strong>
                <p className="truncate text-sm text-neutral-600">{collaborator.email || "GitDaddy user"}</p>
              </div>
            </div>
            <span className="w-fit rounded-full border border-[#d8dee4] px-2 py-1 text-xs font-semibold capitalize text-neutral-700">{collaborator.role}</span>
            <button className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-md border border-red-300 bg-white px-3 text-sm font-semibold text-red-600 hover:bg-red-50" onClick={() => state.removeCollaborator(collaborator.username)} type="button">
              Remove
            </button>
          </div>
        )) : (
          <p className="p-4 text-sm text-neutral-600">No collaborators yet. The repository owner still has full admin access.</p>
        )}
      </div>
    </Panel>
  );
}

function RepoAbout({ state, repo, clone }) {
  return (
    <aside className="grid content-start gap-4">
      <Panel className="p-5">
        <strong>About</strong>
        <p className="mt-4 text-sm leading-6 text-neutral-700">
          GitDaddy repo hosted on your own infra, synced to Cloudflare R2, and served through normal Git smart HTTP.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-[#ddf4ff] px-2 py-1 text-xs font-semibold text-[#0969da]">git</span>
          <span className="rounded-full bg-[#ddf4ff] px-2 py-1 text-xs font-semibold text-[#0969da]">r2</span>
          <span className="rounded-full bg-[#ddf4ff] px-2 py-1 text-xs font-semibold text-[#0969da]">self-hosted</span>
        </div>
        <div className="mt-5 grid gap-3 text-sm text-neutral-700">
          <AboutLine icon={BookOpen01Icon} text="README" />
          <AboutLine icon={GitCommitIcon} text={`${state.repoStats?.commits ?? state.commits.length} commits`} />
          <AboutLine icon={GitBranchIcon} text={`${state.repoStats?.branches ?? state.branches.length} branches`} />
          <AboutLine icon={UserIcon} text={`${state.collaborators.length} collaborators`} />
          <AboutLine icon={LockKeyIcon} text={`${repo.visibility} repository`} />
        </div>
      </Panel>

      <Panel className="p-5">
        <div className="flex items-center justify-between">
          <strong>Clone</strong>
          <button className="inline-grid h-8 w-8 cursor-pointer place-items-center rounded-md border border-[#d8dee4] hover:bg-[#f6f8fa]" onClick={() => navigator.clipboard?.writeText(`git clone ${clone}`)} type="button">
            <Icon icon={Copy01Icon} size={17} />
          </button>
        </div>
        <code className="mt-3 block overflow-auto rounded-md bg-[#f6f8fa] p-3 text-xs">{clone}</code>
      </Panel>

      <Panel className="p-5">
        <strong>Repository stats</strong>
        <div className="mt-4 grid gap-3">
          <StatLine label="Files" value={state.tree.length} />
          <StatLine label="Pull requests" value={state.pulls.length} />
          <StatLine label="Pending sync jobs" value={state.platformStats?.pending_jobs ?? 0} />
        </div>
      </Panel>
    </aside>
  );
}

function RightRail({ state }) {
  return (
    <aside className="grid content-start gap-4">
      <Panel className="p-5">
        <div className="flex items-center justify-between">
          <strong>Repositories you contribute to</strong>
          <button className="cursor-pointer text-sm font-semibold text-[#0969da]" type="button">View all</button>
        </div>
        <div className="mt-4 grid gap-3">
          {state.repos.slice(0, 6).map((repo) => (
            <button key={repo.id} className="flex cursor-pointer items-center gap-3 text-left text-sm hover:text-[#0969da]" onClick={() => state.chooseRepo(repo)} type="button">
              <Icon icon={CodeFolderIcon} size={17} className="text-neutral-500" />
              <span className="font-semibold">{state.owner} / {repo.name}</span>
              <span className={`ml-auto h-2 w-2 rounded-full ${repo.visibility === "public" ? "bg-[#0969da]" : "border border-neutral-500"}`} />
            </button>
          ))}
        </div>
      </Panel>
      <Panel className="p-5">
        <strong>Latest changes</strong>
        <div className="mt-4 grid gap-4 border-l border-[#d8dee4] pl-4">
          <Timeline title="Postgres persistence" body="Repo data survives Docker restarts." />
          <Timeline title="Smart HTTP Git" body="Clone, fetch, pull, and push with normal Git." />
          <Timeline title="R2 sync path" body="Pushes can be backed up outside the request path." />
        </div>
      </Panel>
      <Panel className="p-5">
        <strong>Explore repositories</strong>
        <div className="mt-4 grid gap-3 text-sm">
          {state.repos.slice(0, 3).map((repo) => (
            <button key={repo.id} className="flex cursor-pointer items-center justify-between text-left hover:text-[#0969da]" onClick={() => state.chooseRepo(repo)} type="button">
              <span>{state.owner} / {repo.name}</span>
              <Icon icon={GitBranchIcon} size={16} />
            </button>
          ))}
        </div>
      </Panel>
    </aside>
  );
}

function AboutLine({ icon, text }) {
  return (
    <div className="flex items-center gap-3">
      <Icon icon={icon} size={17} className="text-neutral-500" />
      <span>{text}</span>
    </div>
  );
}

function StatLine({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-neutral-600">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Timeline({ title, body }) {
  return (
    <div className="relative">
      <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#0969da]" />
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6 text-neutral-600">{body}</p>
    </div>
  );
}

function Preview({ title, subtitle, content, onClose }) {
  return (
    <div className="border-t border-[#d8dee4]">
      <div className="flex items-center justify-between gap-3 border-b border-[#d8dee4] bg-[#f6f8fa] p-3">
        <div>
          <strong>{title}</strong>
          <p className="text-sm text-neutral-600">{subtitle}</p>
        </div>
        <button className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-md border border-[#d8dee4] bg-white px-3 text-sm font-semibold hover:bg-[#f6f8fa]" onClick={onClose} type="button">Close</button>
      </div>
      <pre className="max-h-[520px] overflow-auto bg-[#0d1117] p-4 text-sm leading-6 text-[#e6edf3]">
        {content}
      </pre>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
