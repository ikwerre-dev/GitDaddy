"use client";

import { CodeFolderIcon, GitBranchIcon, GitCommitIcon, LockKeyIcon } from "@hugeicons/core-free-icons";
import { Icon } from "./Icon";
import { Panel } from "./ui";
import { TopNav } from "./TopNav";
import { Sidebar } from "./Sidebar";
import Link from "next/link";

export function UserProfile({ state, username, publicRepos = [], notFound = false }) {
  const isOwnProfile = state.user?.username === username;
  const visibleRepos = isOwnProfile ? state.repos : publicRepos;

  if (notFound) {
    return (
      <main className="min-h-screen bg-[#f7f8f4]">
        <TopNav user={state.user} onLogout={state.logout} />
        <section className="mx-auto flex min-h-[calc(100vh-64px)] max-w-[1280px] items-center justify-center px-4 text-center">
          <div>
            <div className="mx-auto grid h-24 w-24 place-items-center rounded-md border border-neutral-950 bg-white text-5xl font-black shadow-[4px_4px_0_#1f2328]">?</div>
            <h1 className="mt-6 text-3xl font-black">User not found</h1>
            <p className="mt-3 text-neutral-600">@{username} does not exist.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8f4] font-['Space_Grotesk','Inter',ui-sans-serif,system-ui] text-[#1f2328]">
      <div className="flex min-h-screen">
        {state.user ? <Sidebar user={state.user} /> : null}
        <div className="min-w-0 flex-1">
          <TopNav user={state.user} onLogout={state.logout} />
          <section className="px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-[1280px]">
            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
              <aside className="grid content-start gap-4">
                <div>
                  <div className="grid h-48 w-48 place-items-center rounded-md border border-neutral-950 bg-[#0969da] text-7xl font-black text-white shadow-[6px_6px_0_#1f2328]">
                    {username.slice(0, 1).toUpperCase()}
                  </div>
                  <h1 className="mt-4 text-2xl font-black">{username}</h1>
                  <p className="mt-1 font-semibold text-neutral-500">@{username}</p>
                </div>
                <Panel className="p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-neutral-600">
                    <Icon icon={CodeFolderIcon} size={16} />
                    <span>{visibleRepos.length} public repositories</span>
                  </div>
                </Panel>
              </aside>

              <div className="grid content-start gap-4">
                <h2 className="text-xl font-black">{isOwnProfile ? "Your repositories" : `${username}'s public repositories`}</h2>
                {visibleRepos.length ? (
                  <div className="grid gap-4">
                    {visibleRepos.map((repo) => (
                      <RepoCard key={repo.id} repo={repo} owner={username} />
                    ))}
                  </div>
                ) : (
                  <Panel className="p-12 text-center">
                    <Icon icon={CodeFolderIcon} size={48} className="mx-auto text-neutral-500" />
                    <h3 className="mt-4 text-lg font-black">No public repositories</h3>
                    <p className="mt-2 text-sm font-semibold text-neutral-500">
                      {isOwnProfile ? "Create a public repository to show it here." : `${username} has no public repositories yet.`}
                    </p>
                    {isOwnProfile ? (
                      <Link
                        href="/dashboard/new"
                        className="mt-4 inline-flex h-9 items-center justify-center rounded-md border border-neutral-950 bg-[#1f2328] px-4 text-sm font-black text-white shadow-[2px_2px_0_#1f2328]"
                      >
                        Create repository
                      </Link>
                    ) : null}
                  </Panel>
                )}
              </div>
            </div>
          </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function RepoCard({ repo, owner }) {
  return (
    <Panel className="p-4 transition-colors hover:border-[#0969da]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link href={`/${owner}/${repo.name}`} className="text-lg font-black text-[#0969da] hover:underline">
              {repo.name}
            </Link>
            <span className="rounded-full border border-neutral-950 px-2 py-0.5 text-xs font-black text-neutral-600">
              {repo.visibility}
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold text-neutral-500">
            {repo.description || "No description provided"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-semibold text-neutral-500">
            <span className="flex items-center gap-1"><Icon icon={GitCommitIcon} size={14} /> commits</span>
            <span className="flex items-center gap-1"><Icon icon={GitBranchIcon} size={14} /> branches</span>
            <span className="flex items-center gap-1"><Icon icon={LockKeyIcon} size={14} /> {repo.visibility}</span>
            <span>Created {formatDate(repo.created_at)}</span>
          </div>
        </div>
        <Link
          href={`/${owner}/${repo.name}`}
          className="inline-flex h-8 flex-shrink-0 items-center gap-2 rounded-md border border-neutral-950 bg-white px-3 text-sm font-black shadow-[2px_2px_0_#1f2328]"
        >
          <Icon icon={CodeFolderIcon} size={16} />
          <span className="hidden sm:inline">View</span>
        </Link>
      </div>
    </Panel>
  );
}

function formatDate(value) {
  if (!value) return "recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
