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
  Settings01Icon,
  StarIcon,
  TerminalIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { apiBase } from "../lib/api";
import { Icon } from "./Icon";
import { Input, Message, Panel, Select } from "./ui";
import { TopNav } from "./TopNav";
import { Sidebar } from "./Sidebar";

export function Repository({ state, repo, username }) {
  const owner = username || state.owner;
  const clone = `${apiBase}/git/${owner}/${repo.name}.git`;

  return (
    <main className="min-h-screen bg-[#f6f8fa]">
      <TopNav user={state.user} onLogout={state.logout} />
      <div className="flex min-h-[calc(100vh-64px)]">
        <Sidebar state={state} />
        <section className="flex-1 px-4 py-6 lg:px-8">
          <Message>{state.message}</Message>
          <div className="mx-auto max-w-[1280px]">
            <RepoHeader state={state} repo={repo} clone={clone} />
            <RepoTabs
              active={state.activeTab}
              onChange={state.setActiveTab}
              commits={state.repoStats?.commits ?? state.commits.length}
              pulls={state.pulls.length}
            />
            <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
              <section className="min-w-0">
                {state.activeTab === "code" ? <CodeView state={state} clone={clone} /> : null}
                {state.activeTab === "commits" ? <CommitView state={state} /> : null}
                {state.activeTab === "branches" ? <BranchView state={state} /> : null}
                {state.activeTab === "pulls" ? <PullRequestView state={state} /> : null}
                {state.activeTab === "settings" ? (
                  <SettingsView state={state} repo={repo} clone={clone} />
                ) : null}
              </section>
              <RepoAbout state={state} repo={repo} clone={clone} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function RepoHeader({ state, repo, clone }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-full bg-[#0969da] text-white">
          <Icon icon={CodeFolderIcon} size={24} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold text-[#0969da] sm:text-2xl">
              {owner} / {repo.name}
            </h1>
            <span className="rounded-full border border-[#d0d7de] px-2 py-0.5 text-xs font-medium text-[#57606a]">
              {repo.visibility}
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <RepoButton icon={StarIcon} label="Star" value="0" />
        <button
          className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm font-medium hover:bg-[#f3f4f6]"
          onClick={() => navigator.clipboard?.writeText(`git clone ${clone}`)}
          type="button"
        >
          <Icon icon={Copy01Icon} size={16} />
          <span className="hidden sm:inline">Code</span>
        </button>
      </div>
    </div>
  );
}

function RepoButton({ icon, label, value }) {
  return (
    <button
      className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm font-medium hover:bg-[#f3f4f6]"
      type="button"
    >
      <Icon icon={icon} size={16} />
      <span className="hidden sm:inline">{label}</span>
      <span className="text-xs text-[#57606a]">{value}</span>
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
    <div className="border-b border-[#d0d7de]">
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map(([key, icon, label, count]) => (
          <button
            key={key}
            className={`flex h-12 cursor-pointer items-center gap-2 border-b-2 px-4 text-sm font-medium ${
              active === key
                ? "border-[#fd8c73] text-[#24292f]"
                : "border-transparent text-[#57606a] hover:border-[#d0d7de] hover:text-[#24292f]"
            }`}
            onClick={() => onChange(key)}
            type="button"
          >
            <Icon icon={icon} size={16} />
            <span>{label}</span>
            {count ? (
              <span className="rounded-full bg-[#d0d7de] px-1.5 py-0.5 text-xs font-medium">
                {count}
              </span>
            ) : null}
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
          <Select
            value={state.ref}
            onChange={(event) => state.changeRef(event.target.value)}
            className="h-8 text-sm"
          >
            <option value="HEAD">HEAD</option>
            {state.branches.map((branch) => (
              <option key={branch.name} value={branch.name}>
                {branch.name}
              </option>
            ))}
          </Select>
          <div className="flex items-center gap-2 text-sm text-[#57606a]">
            <Icon icon={GitBranchIcon} size={16} />
            <span className="hidden sm:inline">{state.branches.length} branches</span>
            <span className="sm:hidden">{state.branches.length}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#57606a]">
            <Icon icon={GitCommitIcon} size={16} />
            <span className="hidden sm:inline">{state.commits.length} commits</span>
            <span className="sm:hidden">{state.commits.length}</span>
          </div>
        </div>
        {state.path ? (
          <button
            className="inline-flex h-8 cursor-pointer items-center rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm font-medium hover:bg-[#f3f4f6]"
            onClick={state.upPath}
            type="button"
          >
            Go up
          </button>
        ) : null}
      </div>

      <Panel className="overflow-hidden">
        {lastCommit && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d0d7de] bg-[#f6f8fa] px-4 py-2 text-sm">
            <div className="min-w-0">
              <span className="font-semibold">{lastCommit.author}</span>
              <span className="ml-2 text-[#57606a]">{lastCommit.subject}</span>
            </div>
            <div className="flex items-center gap-3 text-[#57606a]">
              <code className="text-xs">{lastCommit.hash.slice(0, 7)}</code>
              <span className="hidden sm:inline">{state.commits.length} commits</span>
            </div>
          </div>
        )}
        {state.tree.length ? (
          <div className="divide-y divide-[#d0d7de]">
            {state.tree.map((entry) => (
              <button
                key={entry.hash + entry.path}
                className="grid w-full grid-cols-[auto_1fr] gap-3 px-4 py-2 text-left text-sm hover:bg-[#f6f8fa] sm:grid-cols-[auto_1fr_auto]"
                onClick={() => state.openEntry(entry)}
                type="button"
              >
                <span className="flex items-center gap-2 font-medium text-[#0969da]">
                  <Icon
                    icon={entry.type === "tree" ? Folder01Icon : File01Icon}
                    size={16}
                    className={entry.type === "tree" ? "text-[#54aeff]" : "text-[#57606a]"}
                  />
                  <span className="truncate">{entry.name}</span>
                </span>
                <span className="hidden truncate text-[#57606a] sm:block">
                  {lastCommit?.subject || "Initial commit"}
                </span>
                <code className="hidden text-xs text-[#57606a] sm:block">
                  {entry.type === "tree" ? "dir" : "file"}
                </code>
              </button>
            ))}
          </div>
        ) : (
          <EmptyRepo clone={clone} />
        )}
        {state.filePreview ? (
          <Preview
            title={state.filePreview.path}
            subtitle="File preview"
            content={state.filePreview.content}
            onClose={() => state.setFilePreview(null)}
          />
        ) : null}
      </Panel>
    </div>
  );
}

function EmptyRepo({ clone }) {
  return (
    <div className="grid justify-items-center gap-3 p-10 text-center">
      <Icon icon={TerminalIcon} size={32} className="text-[#57606a]" />
      <strong className="text-lg">This repository is empty</strong>
      <p className="max-w-xl text-sm leading-6 text-[#57606a]">
        Push your local project with the normal Git command line.
      </p>
      <code className="max-w-full overflow-auto rounded-md bg-[#f6f8fa] px-3 py-2 text-sm">
        git remote add origin {clone}
      </code>
    </div>
  );
}

function CommitView({ state }) {
  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-[#d0d7de] px-4 py-3">
        <strong className="text-sm font-semibold">Commits</strong>
        <p className="mt-1 text-sm text-[#57606a]">{state.commits.length} commits</p>
      </div>
      <div className="divide-y divide-[#d0d7de]">
        {state.commits.length ? (
          state.commits.map((commit) => (
            <article
              className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto]"
              key={commit.hash}
            >
              <div>
                <strong className="text-sm">{commit.subject}</strong>
                <p className="mt-1 text-sm text-[#57606a]">
                  {commit.author} committed {formatDate(commit.date)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <code className="rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-2 py-1 text-xs">
                  {commit.hash.slice(0, 7)}
                </code>
                <button
                  className="inline-flex h-8 cursor-pointer items-center justify-center rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm font-medium hover:bg-[#f3f4f6]"
                  onClick={() => state.openDiff(commit)}
                  type="button"
                >
                  <span className="hidden sm:inline">View</span>
                  <span className="sm:hidden">•••</span>
                </button>
              </div>
            </article>
          ))
        ) : (
          <p className="p-4 text-sm text-[#57606a]">No commits yet.</p>
        )}
      </div>
      {state.diffPreview ? (
        <Preview
          title={`Diff ${state.diffPreview.hash.slice(0, 7)}`}
          subtitle="Commit diff"
          content={state.diffPreview.diff}
          onClose={() => state.setDiffPreview(null)}
        />
      ) : null}
    </Panel>
  );
}

function BranchView({ state }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Panel className="divide-y divide-[#d0d7de] overflow-hidden">
        {state.branches.length ? (
          state.branches.map((branch) => (
            <article className="flex items-center gap-3 px-4 py-3" key={branch.name}>
              <Icon icon={GitBranchIcon} size={16} className="text-[#57606a]" />
              <div>
                <strong className="text-sm font-medium">{branch.name}</strong>
                <p className="text-xs text-[#57606a]">
                  {branch.current ? "Default branch" : "Branch"}
                </p>
              </div>
            </article>
          ))
        ) : (
          <p className="p-4 text-sm text-[#57606a]">No branches found.</p>
        )}
      </Panel>
      <Panel className="p-4">
        <BranchForm state={state} />
      </Panel>
    </div>
  );
}

function BranchForm({ state }) {
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        state.createBranch(Object.fromEntries(new FormData(event.currentTarget)));
        event.currentTarget.reset();
      }}
    >
      <strong className="text-sm font-semibold">Create branch</strong>
      <Input name="name" placeholder="feature/new-feature" required />
      <Input name="from" placeholder={state.ref || "HEAD"} />
      <button
        className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#1f883d] bg-[#1f883d] px-3 text-sm font-medium text-white hover:bg-[#1a7f37] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={state.busy}
        type="submit"
      >
        <Icon icon={GitBranchIcon} size={16} />
        Create branch
      </button>
    </form>
  );
}

function PullRequestView({ state }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Panel className="divide-y divide-[#d0d7de] overflow-hidden">
        {state.pulls.length ? (
          state.pulls.map((pull) => (
            <article className="px-4 py-3" key={pull.id}>
              <div className="flex items-start gap-3">
                <Icon icon={GitPullRequestIcon} size={18} className="text-[#1f883d]" />
                <div>
                  <strong className="text-sm">
                    #{pull.id} {pull.title}
                  </strong>
                  <p className="mt-1 text-sm text-[#57606a]">
                    {pull.source} → {pull.target} · {pull.status}
                  </p>
                  {pull.body ? <p className="mt-2 text-sm">{pull.body}</p> : null}
                </div>
              </div>
            </article>
          ))
        ) : (
          <p className="p-4 text-sm text-[#57606a]">No pull requests yet.</p>
        )}
      </Panel>
      <Panel className="p-4">
        <PullForm state={state} />
      </Panel>
    </div>
  );
}

function PullForm({ state }) {
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        state.createPullRequest(Object.fromEntries(new FormData(event.currentTarget)));
        event.currentTarget.reset();
      }}
    >
      <strong className="text-sm font-semibold">New pull request</strong>
      <Input name="title" placeholder="Add new feature" required />
      <textarea
        className="min-h-24 rounded-md border border-[#d0d7de] bg-white px-3 py-2 text-sm outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20"
        name="body"
        placeholder="Describe your changes"
      />
      <Select name="source" defaultValue="">
        <option value="" disabled>
          Compare branch
        </option>
        {state.branches.map((branch) => (
          <option key={branch.name} value={branch.name}>
            {branch.name}
          </option>
        ))}
      </Select>
      <Select
        name="target"
        defaultValue={
          state.branches.find((branch) => branch.current)?.name ||
          state.branches[0]?.name ||
          ""
        }
      >
        {state.branches.map((branch) => (
          <option key={branch.name} value={branch.name}>
            {branch.name}
          </option>
        ))}
      </Select>
      <button
        className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#1f883d] bg-[#1f883d] px-3 text-sm font-medium text-white hover:bg-[#1a7f37] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={state.busy || state.branches.length < 2}
        type="submit"
      >
        <Icon icon={GitPullRequestIcon} size={16} />
        Create pull request
      </button>
    </form>
  );
}

function SettingsView({ state, repo, clone }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Panel className="p-4">
        <Icon icon={TerminalIcon} size={20} />
        <strong className="mt-3 block text-sm font-semibold">Git remote URL</strong>
        <code className="mt-2 block overflow-auto rounded-md bg-[#f6f8fa] p-3 text-xs">
          {clone}
        </code>
      </Panel>
      <Panel className="p-4">
        <Icon icon={LockKeyIcon} size={20} />
        <strong className="mt-3 block text-sm font-semibold">Visibility</strong>
        <Select
          className="mt-3 w-full"
          value={repo.visibility}
          onChange={(event) => state.updateVisibility(event.target.value)}
        >
          <option value="private">Private</option>
          <option value="public">Public</option>
        </Select>
      </Panel>
      <Panel className="p-4">
        <Icon icon={Activity01Icon} size={20} />
        <strong className="mt-3 block text-sm font-semibold">Storage</strong>
        <p className="mt-2 text-sm text-[#57606a]">
          Synced to Cloudflare R2 for backup and distribution.
        </p>
      </Panel>
      <CollaboratorsPanel state={state} />
      <Panel className="border-[#d1242f] p-4">
        <Icon icon={Cancel01Icon} size={20} className="text-[#d1242f]" />
        <strong className="mt-3 block text-sm font-semibold">Danger zone</strong>
        <button
          className="mt-3 inline-flex h-8 cursor-pointer items-center justify-center rounded-md border border-[#d1242f] bg-white px-3 text-sm font-medium text-[#d1242f] hover:bg-[#d1242f] hover:text-white"
          onClick={state.deleteRepo}
          type="button"
        >
          Delete repository
        </button>
      </Panel>
    </div>
  );
}

function CollaboratorsPanel({ state }) {
  return (
    <Panel className="p-4 md:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Icon icon={UserIcon} size={20} />
          <strong className="mt-3 block text-sm font-semibold">Collaborators</strong>
          <p className="mt-1 text-sm text-[#57606a]">
            Manage repository access for other users.
          </p>
        </div>
        <span className="rounded-full bg-[#f6f8fa] px-2.5 py-1 text-xs font-medium text-[#57606a]">
          {state.collaborators.length}
        </span>
      </div>

      <form
        className="mt-4 grid gap-3 lg:grid-cols-[1fr_140px_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          state.addCollaborator(Object.fromEntries(new FormData(event.currentTarget)));
          event.currentTarget.reset();
        }}
      >
        <Input name="username" placeholder="username" required />
        <Select name="role" defaultValue="write">
          <option value="read">Read</option>
          <option value="write">Write</option>
          <option value="admin">Admin</option>
        </Select>
        <button
          className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#1f883d] bg-[#1f883d] px-3 text-sm font-medium text-white hover:bg-[#1a7f37] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={state.busy}
          type="submit"
        >
          <Icon icon={Add01Icon} size={16} />
          <span className="hidden sm:inline">Add</span>
        </button>
      </form>

      <div className="mt-4 overflow-hidden rounded-md border border-[#d0d7de]">
        {state.collaborators.length ? (
          state.collaborators.map((collaborator) => (
            <div
              className="grid gap-3 border-b border-[#d0d7de] p-3 last:border-b-0 sm:grid-cols-[1fr_auto_auto] sm:items-center"
              key={collaborator.user_id}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-[#0969da] text-xs font-bold text-white">
                  {collaborator.username.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <strong className="block truncate text-sm">{collaborator.username}</strong>
                  <p className="truncate text-xs text-[#57606a]">
                    {collaborator.email || "GitDaddy user"}
                  </p>
                </div>
              </div>
              <span className="w-fit rounded-full border border-[#d0d7de] px-2 py-0.5 text-xs font-medium capitalize text-[#57606a]">
                {collaborator.role}
              </span>
              <button
                className="inline-flex h-8 cursor-pointer items-center justify-center rounded-md border border-[#d1242f] bg-white px-3 text-sm font-medium text-[#d1242f] hover:bg-[#d1242f] hover:text-white"
                onClick={() => state.removeCollaborator(collaborator.username)}
                type="button"
              >
                Remove
              </button>
            </div>
          ))
        ) : (
          <p className="p-4 text-sm text-[#57606a]">
            No collaborators yet. Add users to grant them access.
          </p>
        )}
      </div>
    </Panel>
  );
}

function RepoAbout({ state, repo, clone }) {
  return (
    <aside className="grid content-start gap-4">
      <Panel className="p-4">
        <strong className="text-sm font-semibold">About</strong>
        <p className="mt-3 text-sm leading-6 text-[#57606a]">
          Self-hosted Git repository with R2 backup and smart HTTP protocol support.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-[#ddf4ff] px-2 py-1 text-xs font-medium text-[#0969da]">
            git
          </span>
          <span className="rounded-full bg-[#ddf4ff] px-2 py-1 text-xs font-medium text-[#0969da]">
            r2
          </span>
        </div>
        <div className="mt-4 grid gap-2 text-sm text-[#24292f]">
          <AboutLine icon={GitCommitIcon} text={`${state.commits.length} commits`} />
          <AboutLine icon={GitBranchIcon} text={`${state.branches.length} branches`} />
          <AboutLine icon={UserIcon} text={`${state.collaborators.length} collaborators`} />
          <AboutLine icon={LockKeyIcon} text={`${repo.visibility} repository`} />
        </div>
      </Panel>

      <Panel className="p-4">
        <div className="flex items-center justify-between">
          <strong className="text-sm font-semibold">Clone</strong>
          <button
            className="inline-grid h-7 w-7 cursor-pointer place-items-center rounded-md border border-[#d0d7de] hover:bg-[#f6f8fa]"
            onClick={() => navigator.clipboard?.writeText(`git clone ${clone}`)}
            type="button"
          >
            <Icon icon={Copy01Icon} size={14} />
          </button>
        </div>
        <code className="mt-3 block overflow-auto rounded-md bg-[#f6f8fa] p-2 text-xs">
          {clone}
        </code>
      </Panel>

      <Panel className="p-4">
        <strong className="text-sm font-semibold">Stats</strong>
        <div className="mt-3 grid gap-2">
          <StatLine label="Files" value={state.tree.length} />
          <StatLine label="Pull requests" value={state.pulls.length} />
          <StatLine label="Pending jobs" value={state.platformStats?.pending_jobs ?? 0} />
        </div>
      </Panel>
    </aside>
  );
}

function AboutLine({ icon, text }) {
  return (
    <div className="flex items-center gap-2">
      <Icon icon={icon} size={16} className="text-[#57606a]" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

function StatLine({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[#57606a]">{label}</span>
      <strong className="text-[#24292f]">{value}</strong>
    </div>
  );
}

function Preview({ title, subtitle, content, onClose }) {
  return (
    <div className="border-t border-[#d0d7de]">
      <div className="flex items-center justify-between gap-3 border-b border-[#d0d7de] bg-[#f6f8fa] px-4 py-2">
        <div>
          <strong className="text-sm">{title}</strong>
          <p className="text-xs text-[#57606a]">{subtitle}</p>
        </div>
        <button
          className="inline-flex h-8 cursor-pointer items-center justify-center rounded-md border border-[#d0d7de] bg-white px-3 text-sm font-medium hover:bg-[#f3f4f6]"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
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
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
