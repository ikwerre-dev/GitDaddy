"use client";

import {
  BookOpen01Icon,
  CodeFolderIcon,
  GitBranchIcon,
  GitCommitIcon,
  LockKeyIcon,
  StarIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "./Icon";
import { Panel } from "./ui";
import { TopNav } from "./TopNav";
import { Sidebar } from "./Sidebar";
import Link from "next/link";

export function UserProfile({ state, username }) {
  // Check if user exists
  const userExists = state.owner === username || state.repos.some(r => r.owner === username);
  
  // Filter repos based on ownership and collaboration
  const ownedRepos = state.repos.filter((repo) => state.owner === username);
  const isOwnProfile = state.user?.username === username;

  // For now, we'll show all repos if it's the user's own profile
  // In a real app, you'd fetch collaborator repos from the API
  const visibleRepos = isOwnProfile ? ownedRepos : ownedRepos.filter((r) => r.visibility === "public");

  // If user doesn't exist and it's not the current user
  if (!userExists && !isOwnProfile) {
    return (
      <main className="min-h-screen bg-[#f6f8fa]">
        <TopNav user={state.user} onLogout={state.logout} />
        <div className="flex min-h-[calc(100vh-64px)]">
          <Sidebar state={state} />
          <section className="flex-1 px-4 py-6 lg:px-8">
            <div className="mx-auto max-w-[1280px]">
              <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
                <div className="grid h-32 w-32 place-items-center rounded-full bg-[#d0d7de] text-6xl font-bold text-white">
                  ?
                </div>
                <h1 className="mt-6 text-3xl font-bold">User not found</h1>
                <p className="mt-3 text-lg text-[#57606a]">
                  The user <strong>@{username}</strong> doesn't exist or you don't have access to view their profile.
                </p>
                <a
                  href="/dashboard"
                  className="mt-6 inline-flex h-10 items-center justify-center rounded-md border border-[#0969da] bg-[#0969da] px-4 text-sm font-medium text-white hover:bg-[#0860ca]"
                >
                  Go to Dashboard
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8fa]">
      <TopNav user={state.user} onLogout={state.logout} />
      <div className="flex min-h-[calc(100vh-64px)]">
        <Sidebar state={state} />
        <section className="flex-1 px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-[1280px]">
            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
              {/* Left Sidebar - User Info */}
              <aside className="grid content-start gap-4">
                <div className="flex flex-col items-center lg:items-start">
                  <div className="grid h-64 w-64 place-items-center rounded-full bg-[#0969da] text-8xl font-bold text-white">
                    {username.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="mt-4 text-center lg:text-left">
                    <h1 className="text-2xl font-semibold">{username}</h1>
                    <p className="mt-1 text-[#57606a]">@{username}</p>
                  </div>
                </div>

                <Panel className="p-4">
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-center gap-2 text-[#57606a]">
                      <Icon icon={CodeFolderIcon} size={16} />
                      <span>{visibleRepos.length} repositories</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#57606a]">
                      <Icon icon={GitCommitIcon} size={16} />
                      <span>
                        {state.platformStats?.total_commits ?? 0} commits
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[#57606a]">
                      <Icon icon={GitBranchIcon} size={16} />
                      <span>
                        {state.platformStats?.total_branches ?? 0} branches
                      </span>
                    </div>
                  </div>
                </Panel>
              </aside>

              {/* Main Content - Repositories */}
              <div className="grid content-start gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    {isOwnProfile ? "Your repositories" : `${username}'s repositories`}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button className="inline-flex h-8 items-center gap-2 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm font-medium hover:bg-[#f3f4f6]">
                      <Icon icon={BookOpen01Icon} size={16} />
                      <span className="hidden sm:inline">Type</span>
                    </button>
                    <button className="inline-flex h-8 items-center gap-2 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm font-medium hover:bg-[#f3f4f6]">
                      <Icon icon={StarIcon} size={16} />
                      <span className="hidden sm:inline">Sort</span>
                    </button>
                  </div>
                </div>

                {visibleRepos.length > 0 ? (
                  <div className="grid gap-4">
                    {visibleRepos.map((repo) => (
                      <RepoCard
                        key={repo.id}
                        repo={repo}
                        owner={username}
                        state={state}
                      />
                    ))}
                  </div>
                ) : (
                  <Panel className="p-12 text-center">
                    <Icon
                      icon={CodeFolderIcon}
                      size={48}
                      className="mx-auto text-[#57606a]"
                    />
                    <h3 className="mt-4 text-lg font-semibold">
                      No repositories yet
                    </h3>
                    <p className="mt-2 text-sm text-[#57606a]">
                      {isOwnProfile
                        ? "Create your first repository to get started."
                        : `${username} doesn't have any public repositories yet.`}
                    </p>
                    {isOwnProfile && (
                      <Link
                        href="/dashboard"
                        className="mt-4 inline-flex h-9 items-center justify-center rounded-md border border-[#1f883d] bg-[#1f883d] px-4 text-sm font-medium text-white hover:bg-[#1a7f37]"
                      >
                        Create repository
                      </Link>
                    )}
                  </Panel>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function RepoCard({ repo, owner, state }) {
  // Calculate stats
  const repoCommits = state.repoStats?.commits ?? 0;
  const repoBranches = state.repoStats?.branches ?? 0;

  return (
    <Panel className="p-4 hover:border-[#0969da] transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/${owner}/${repo.name}`}
              className="text-lg font-semibold text-[#0969da] hover:underline"
            >
              {repo.name}
            </Link>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                repo.visibility === "public"
                  ? "border-[#d0d7de] text-[#57606a]"
                  : "border-[#d0d7de] text-[#57606a]"
              }`}
            >
              {repo.visibility}
            </span>
          </div>

          <p className="mt-2 text-sm text-[#57606a]">
            {repo.description || "No description provided"}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[#57606a]">
            {repo.language && (
              <div className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full bg-[#0969da]" />
                <span>{repo.language}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Icon icon={GitCommitIcon} size={14} />
              <span>{repoCommits} commits</span>
            </div>
            <div className="flex items-center gap-1">
              <Icon icon={GitBranchIcon} size={14} />
              <span>{repoBranches} branches</span>
            </div>
            <div className="flex items-center gap-1">
              <Icon icon={LockKeyIcon} size={14} />
              <span>{repo.visibility}</span>
            </div>
            <span>Updated {formatDate(repo.updated_at || repo.created_at)}</span>
          </div>
        </div>

        <Link
          href={`/${owner}/${repo.name}`}
          className="inline-flex h-8 flex-shrink-0 items-center gap-2 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm font-medium hover:bg-[#f3f4f6]"
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
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}
