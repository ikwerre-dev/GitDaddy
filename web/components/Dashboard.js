"use client";

import {
  Activity01Icon,
  Add01Icon,
  CodeFolderIcon,
  GitBranchIcon,
  GitCommitIcon,
  LockKeyIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "./Icon";
import { Button, Input, Message, Panel, Select } from "./ui";
import { TopNav } from "./TopNav";
import { Sidebar } from "./Sidebar";
import Link from "next/link";

export function Dashboard({ state }) {
  if (!state.user) return null;

  return (
    <main className="min-h-screen bg-[#f7f8f4] font-['Space_Grotesk','Inter',ui-sans-serif,system-ui] text-[#1f2328]">
      <TopNav user={state.user} onLogout={state.logout} />
      <div className="flex min-h-[calc(100vh-64px)]">
        <Sidebar state={state} />
        <section className="relative flex-1 overflow-hidden px-4 py-6 lg:px-8">
          <div className="pointer-events-none absolute right-0 top-10 h-48 w-56 [background-image:radial-gradient(circle,#1f2328_1px,transparent_1px)] [background-size:9px_9px] opacity-20" aria-hidden="true" />
          <div className="pointer-events-none absolute bottom-0 left-0 hidden h-40 w-44 sm:block" aria-hidden="true">
            <span className="absolute bottom-0 left-0 h-10 w-16 bg-[#ff7b72]" />
            <span className="absolute bottom-10 left-12 h-12 w-12 bg-[#f0883e]" />
            <span className="absolute bottom-0 left-24 h-14 w-20 bg-[#d29922]" />
          </div>
          <Message>{state.message}</Message>
          <HomeDashboard state={state} />
        </section>
      </div>
    </main>
  );
}

function HomeDashboard({ state }) {
  return (
    <div className="relative z-10 mx-auto grid max-w-[1280px] gap-6 xl:grid-cols-[1fr_340px]">
      <section className="grid gap-5">
        <section className="overflow-hidden rounded-2xl border border-neutral-950 bg-white shadow-[6px_6px_0_#1f2328]">
          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-black uppercase text-neutral-500">Self-hosted Git command center</p>
              <h1 className="mt-2 text-4xl font-black leading-none sm:text-6xl">Dashboard</h1>
              <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-neutral-600">
                Create repositories, scan activity, and keep your GitDaddy workspace moving from one place.
              </p>
            </div>
            <div className="grid min-w-48 content-center gap-2 rounded-md border border-neutral-950 bg-[#1f2328] p-4 text-white shadow-[4px_4px_0_#1f2328]">
              <span className="text-sm font-black uppercase text-neutral-300">Signed in as</span>
              <strong className="truncate text-2xl font-black">{state.user.username}</strong>
            </div>
          </div>
          <div className="grid border-t border-neutral-950 sm:grid-cols-2 lg:grid-cols-4">
            <Metric icon={CodeFolderIcon} label="Repositories" value={state.repos.length} />
            <Metric icon={GitBranchIcon} label="Branches" value={state.platformStats?.total_branches ?? 0} />
            <Metric icon={GitCommitIcon} label="Commits" value={state.platformStats?.total_commits ?? 0} />
            <Metric icon={Activity01Icon} label="Pending jobs" value={state.platformStats?.pending_jobs ?? 0} />
          </div>
        </section>
        <CreateCard state={state} />
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-neutral-950 px-5 py-4">
            <div>
              <strong className="text-sm font-black uppercase text-neutral-500">Your repositories</strong>
              <p className="mt-1 text-xs font-semibold text-neutral-500">Projects hosted by {state.owner}</p>
            </div>
            <Icon icon={CodeFolderIcon} size={22} />
          </div>
          <div className="divide-y divide-neutral-950">
            {state.repos.length ? (
              state.repos.map((repo, index) => (
                <Link
                  href={`/${state.owner}/${repo.name}`}
                  className="grid w-full grid-cols-[44px_1fr_auto] items-center gap-4 px-5 py-4 text-left hover:bg-[#f7f8f4]"
                  key={repo.id}
                >
                  <div
                    className={`grid h-11 w-11 place-items-center rounded-md border border-neutral-950 shadow-[2px_2px_0_#1f2328] ${
                      index % 2
                        ? "bg-[#dafbe1] text-[#1a7f37]"
                        : "bg-[#ddf4ff] text-[#0969da]"
                    }`}
                  >
                    <Icon icon={CodeFolderIcon} size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#0969da]">
                      {state.owner} / {repo.name}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-neutral-500">
                      {repo.visibility} · created {formatDate(repo.created_at)}
                    </p>
                  </div>
                  <div className="hidden items-center gap-2 rounded-md border border-neutral-950 bg-white px-3 py-1.5 text-xs font-black shadow-[2px_2px_0_#1f2328] sm:flex">
                    <Icon icon={repo.visibility === "public" ? GitBranchIcon : LockKeyIcon} size={14} />
                    {repo.visibility}
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-sm font-semibold text-neutral-500">
                Create a repository to start hosting code.
              </div>
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
    <Panel className="relative overflow-hidden p-6">
      <div className="absolute right-0 top-0 h-24 w-28 [background-image:radial-gradient(circle,#1f2328_1px,transparent_1px)] [background-size:9px_9px] opacity-20" aria-hidden="true" />
      <div className="relative z-10 mb-4 flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-md border border-neutral-950 bg-[#1f2328] text-white shadow-[2px_2px_0_#1f2328]">
          <Icon icon={Add01Icon} size={18} />
        </div>
        <div>
          <h3 className="text-lg font-black">Create a new repository</h3>
          <p className="mt-1 text-sm font-semibold text-neutral-500">
            A repository contains all project files, including revision history.
          </p>
        </div>
      </div>
      <form
        className="relative z-10 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          state.createRepo(Object.fromEntries(new FormData(event.currentTarget)));
          event.currentTarget.reset();
        }}
      >
        <div className="grid gap-2">
          <label className="text-sm font-black">
            Repository name <span className="text-red-600">*</span>
          </label>
          <Input
            className="h-10"
            name="name"
            placeholder="my-awesome-project"
            required
          />
          <p className="text-xs font-semibold text-neutral-500">
            Great repository names are short and memorable.
          </p>
        </div>
        
        <div className="grid gap-2">
          <label className="text-sm font-black">Visibility</label>
          <Select name="visibility" defaultValue="private" className="h-10">
            <option value="private">Private - Only you can see this repository</option>
            <option value="public">Public - Anyone can see this repository</option>
          </Select>
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-950 pt-4">
          <Button disabled={state.busy} type="submit" variant="primary" className="h-10 disabled:opacity-60">
            <Icon icon={CodeFolderIcon} size={16} />
            Create repository
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function RightRail({ state }) {
  return (
    <aside className="grid content-start gap-4">
      <Panel className="overflow-hidden">
        <div className="border-b border-neutral-950 bg-[#1f2328] px-4 py-3 text-white">
          <strong className="text-sm font-black uppercase">Recent repositories</strong>
        </div>
        <div className="grid gap-2 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-neutral-500">Latest</span>
            <Link href="/dashboard" className="text-sm font-black text-[#0969da] hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-3 grid gap-2">
            {state.repos.slice(0, 5).map((repo) => (
              <Link
                key={repo.id}
                href={`/${state.owner}/${repo.name}`}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-left text-sm font-semibold hover:border-neutral-950 hover:bg-[#f7f8f4] hover:text-[#0969da]"
              >
                <Icon icon={CodeFolderIcon} size={14} className="text-neutral-500" />
                <span className="flex-1 truncate font-medium">
                  {state.owner} / {repo.name}
                </span>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    repo.visibility === "public"
                      ? "bg-[#0969da]"
                      : "border border-[#1f2328]"
                  }`}
                />
              </Link>
            ))}
          </div>
        </div>
      </Panel>
      <Panel className="p-4">
        <strong className="text-sm font-black uppercase text-neutral-500">Quick stats</strong>
        <div className="mt-3 grid gap-2">
          <StatLine
            icon={CodeFolderIcon}
            label="Repositories"
            value={state.repos.length}
          />
          <StatLine
            icon={GitBranchIcon}
            label="Total branches"
            value={state.platformStats?.total_branches ?? 0}
          />
          <StatLine
            icon={GitCommitIcon}
            label="Total commits"
            value={state.platformStats?.total_commits ?? 0}
          />
          <StatLine
            icon={Activity01Icon}
            label="Pending jobs"
            value={state.platformStats?.pending_jobs ?? 0}
          />
        </div>
      </Panel>
    </aside>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div className="flex min-h-28 items-center gap-4 border-b border-neutral-950 p-5 last:border-b-0 sm:border-r sm:even:border-r-0 lg:border-b-0 lg:even:border-r lg:last:border-r-0">
      <div className="grid h-10 w-10 place-items-center rounded-md border border-neutral-950 bg-[#f7f8f4] shadow-[2px_2px_0_#1f2328]">
        <Icon icon={icon} size={18} />
      </div>
      <div>
        <p className="text-3xl font-black leading-none">{value}</p>
        <p className="mt-1 text-xs font-black uppercase text-neutral-500">{label}</p>
      </div>
    </div>
  );
}

function StatLine({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-neutral-950 bg-[#f7f8f4] px-3 py-2 text-sm shadow-[2px_2px_0_#1f2328]">
      <div className="flex items-center gap-2 font-semibold text-neutral-600">
        <Icon icon={icon} size={14} />
        <span>{label}</span>
      </div>
      <strong className="text-[#1f2328]">{value}</strong>
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
