"use client";

import {
  Activity01Icon,
  CodeFolderIcon,
  GitBranchIcon,
  GitCommitIcon,
  LockKeyIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "./Icon";
import { Message, Panel } from "./ui";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import Link from "next/link";

export function Dashboard({ state }) {
  if (!state.user) return null;

  return (
    <main className="min-h-screen bg-[#f7f8f4] font-['Space_Grotesk','Inter',ui-sans-serif,system-ui] text-[#1f2328]">
      <div className="flex min-h-screen">
        <Sidebar user={state.user} />
        <div className="min-w-0 flex-1">
          <TopNav user={state.user} onLogout={state.logout} />
          <section className="relative overflow-hidden px-4 py-6 lg:px-8">
            <Message>{state.message}</Message>
            <HomeDashboard state={state} />
          </section>
        </div>
      </div>
    </main>
  );
}

function HomeDashboard({ state }) {
  const gridItems = [...state.repos];
  while (gridItems.length < 9) {
    gridItems.push(null);
  }

  return (
    <div className="relative z-10 mx-auto grid max-w-[1280px] gap-6">
      <section className="grid gap-5">
        <section className="overflow-hidden rounded-2xl border border-neutral-950 bg-white shadow-[6px_6px_0_#1f2328]">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4">
            <Metric icon={CodeFolderIcon} label="Repositories" value={state.repos.length} />
            <Metric icon={GitBranchIcon} label="Branches" value={state.platformStats?.total_branches ?? 0} />
            <Metric icon={GitCommitIcon} label="Commits" value={state.platformStats?.total_commits ?? 0} />
            <Metric icon={Activity01Icon} label="Pending jobs" value={state.platformStats?.pending_jobs ?? 0} />
          </div>
        </section>
        <section className="rounded-2xl border border-neutral-300 bg-white p-4 [background-image:repeating-linear-gradient(135deg,rgba(31,35,40,.12)_0,rgba(31,35,40,.12)_1px,transparent_1px,transparent_10px)]">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {state.repos.length ? (
              gridItems.slice(0, 9).map((repo, index) => (
                repo ? (
                  <FolderCard key={repo.id} repo={repo} owner={state.owner} index={index} />
                ) : (
                  <GhostCard key={`ghost-${index}`} />
                )
              ))
            ) : (
              gridItems.map((_, index) => <GhostCard key={`ghost-${index}`} />)
            )}
          </div>
        </section>
      </section>
    </div>
  );
}

function FolderCard({ repo, owner, index }) {
  const accent = index % 3 === 0 ? "bg-[#0a7f64]" : index % 3 === 1 ? "bg-[#0969da]" : "bg-[#d29922]";
  return (
    <Link
      href={`/${owner}/${repo.name}`}
      className="group block min-h-[176px] rounded-xl border border-neutral-300 bg-white p-4 shadow-[3px_3px_0_rgba(31,35,40,.75)] transition hover:-translate-y-1 hover:shadow-[5px_5px_0_rgba(31,35,40,.75)]"
    >
      <div className="flex h-full min-h-[144px] flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-md border border-neutral-300 bg-[#f7f8f4]">
            <Icon icon={CodeFolderIcon} size={17} />
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-2 py-0.5 text-[11px] font-black text-neutral-600">
            <Icon icon={repo.visibility === "public" ? GitBranchIcon : LockKeyIcon} size={14} />
            {repo.visibility}
          </span>
        </div>
        <h3 className="mt-4 truncate text-xl font-black text-[#1f2328]">{repo.name}</h3>
        <p className="mt-1 truncate text-xs font-black text-neutral-500">{owner}/{repo.name}</p>
        <p className="mt-2 line-clamp-2 min-h-9 text-xs font-semibold leading-5 text-neutral-600">{repo.description || "No description provided"}</p>
        <div className="mt-auto flex items-center justify-between pt-4 text-xs font-black text-neutral-500">
          <span className={`h-2 w-2 rounded-full ${accent}`} />
          <span>{formatDate(repo.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}

function GhostCard() {
  return (
    <div className="min-h-[176px] rounded-xl border border-dashed border-neutral-300 bg-white/50 p-4">
      <div className="flex h-full min-h-[144px] flex-col opacity-55">
        <div className="h-9 w-9 rounded-md border border-neutral-300 bg-white" />
        <div className="mt-4 h-4 w-2/3 rounded bg-neutral-300" />
        <div className="mt-3 h-3 w-full rounded bg-neutral-200" />
        <div className="mt-2 h-3 w-4/5 rounded bg-neutral-200" />
        <div className="mt-auto h-3 w-1/3 rounded bg-neutral-200" />
      </div>
    </div>
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
