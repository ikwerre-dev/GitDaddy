"use client";

import {
  Activity01Icon,
  BookOpen01Icon,
  CodeFolderIcon,
  GitBranchIcon,
  GitCommitIcon,
  StarIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "./Icon";
import { Input, Message, Panel, Select } from "./ui";
import { TopNav } from "./TopNav";
import { Sidebar } from "./Sidebar";
import Link from "next/link";

export function Dashboard({ state }) {
  if (!state.user) return null;

  return (
    <main className="min-h-screen bg-[#f6f8fa]">
      <TopNav user={state.user} onLogout={state.logout} />
      <div className="flex min-h-[calc(100vh-64px)]">
        <Sidebar state={state} />
        <section className="flex-1 px-4 py-6 lg:px-8">
          <Message>{state.message}</Message>
          <HomeDashboard state={state} />
        </section>
      </div>
    </main>
  );
}

function HomeDashboard({ state }) {
  return (
    <div className="mx-auto grid max-w-[1280px] gap-6 xl:grid-cols-[1fr_340px]">
      <section className="grid gap-5">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <CreateCard state={state} />
        <Panel className="overflow-hidden">
          <div className="border-b border-[#d0d7de] px-4 py-3">
            <strong className="text-sm font-semibold">Your repositories</strong>
          </div>
          <div className="divide-y divide-[#d0d7de]">
            {state.repos.length ? (
              state.repos.map((repo, index) => (
                <Link
                  href={`/${state.owner}/${repo.name}`}
                  className="grid w-full grid-cols-[40px_1fr_auto] items-center gap-4 px-4 py-3 text-left hover:bg-[#f6f8fa]"
                  key={repo.id}
                >
                  <div
                    className={`grid h-10 w-10 place-items-center rounded-full ${
                      index % 2
                        ? "bg-[#dafbe1] text-[#1a7f37]"
                        : "bg-[#ddf4ff] text-[#0969da]"
                    }`}
                  >
                    <Icon icon={CodeFolderIcon} size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0969da]">
                      {state.owner} / {repo.name}
                    </p>
                    <p className="mt-1 text-sm text-[#57606a]">
                      {repo.visibility} · created {formatDate(repo.created_at)}
                    </p>
                  </div>
                  <Icon icon={GitBranchIcon} size={18} className="text-[#57606a]" />
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-sm text-[#57606a]">
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
    <Panel className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Create a new repository</h3>
        <p className="mt-1 text-sm text-[#57606a]">
          A repository contains all project files, including revision history.
        </p>
      </div>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          state.createRepo(Object.fromEntries(new FormData(event.currentTarget)));
          event.currentTarget.reset();
        }}
      >
        <div className="grid gap-2">
          <label className="text-sm font-medium">
            Repository name <span className="text-red-600">*</span>
          </label>
          <Input
            className="h-10"
            name="name"
            placeholder="my-awesome-project"
            required
          />
          <p className="text-xs text-[#57606a]">
            Great repository names are short and memorable.
          </p>
        </div>
        
        <div className="grid gap-2">
          <label className="text-sm font-medium">Visibility</label>
          <Select name="visibility" defaultValue="private" className="h-10">
            <option value="private">Private - Only you can see this repository</option>
            <option value="public">Public - Anyone can see this repository</option>
          </Select>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#d0d7de] pt-4">
          <button
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-[#1f883d] bg-[#1f883d] px-4 text-sm font-medium text-white hover:bg-[#1a7f37] disabled:opacity-60"
            disabled={state.busy}
            type="submit"
          >
            Create repository
          </button>
        </div>
      </form>
    </Panel>
  );
}

function RightRail({ state }) {
  return (
    <aside className="grid content-start gap-4">
      <Panel className="p-4">
        <div className="flex items-center justify-between">
          <strong className="text-sm font-semibold">Recent repositories</strong>
          <Link href="/dashboard" className="text-sm font-medium text-[#0969da] hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-3 grid gap-2">
          {state.repos.slice(0, 5).map((repo) => (
            <Link
              key={repo.id}
              href={`/${state.owner}/${repo.name}`}
              className="flex cursor-pointer items-center gap-2 text-left text-sm hover:text-[#0969da]"
            >
              <Icon icon={CodeFolderIcon} size={14} className="text-[#57606a]" />
              <span className="flex-1 truncate font-medium">
                {state.owner} / {repo.name}
              </span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  repo.visibility === "public"
                    ? "bg-[#0969da]"
                    : "border border-[#57606a]"
                }`}
              />
            </Link>
          ))}
        </div>
      </Panel>
      <Panel className="p-4">
        <strong className="text-sm font-semibold">Quick stats</strong>
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

 
function Timeline({ title, body }) {
  return (
    <div className="relative">
      <span className="absolute -left-[17px] top-1.5 h-2 w-2 rounded-full bg-[#0969da]" />
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-0.5 text-xs leading-5 text-[#57606a]">{body}</p>
    </div>
  );
}

function StatLine({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-[#57606a]">
        <Icon icon={icon} size={14} />
        <span>{label}</span>
      </div>
      <strong className="text-[#24292f]">{value}</strong>
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
