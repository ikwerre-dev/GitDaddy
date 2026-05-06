"use client";

import {
  Activity01Icon,
  Add01Icon,
  BookOpen01Icon,
  CodeFolderIcon,
  GitPullRequestIcon,
  Search01Icon,
  Settings01Icon,
  StarIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "./Icon";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar({ state }) {
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";

  return (
    <aside className="hidden w-64 border-r border-[#d0d7de] bg-white lg:block">
      <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto p-4">
        <nav className="grid gap-1">
          <SideLink
            href="/dashboard"
            active={isDashboard}
            icon={BookOpen01Icon}
            label="Home"
          />
          <SideLink
            href="/dashboard?tab=pulls"
            icon={GitPullRequestIcon}
            label="Pull requests"
            count={state.pulls.length}
          />
          <SideLink href="/dashboard?tab=activity" icon={Activity01Icon} label="Activity" />
          <SideLink href="/dashboard?tab=stars" icon={StarIcon} label="Stars" />
          <SideLink href="/dashboard?tab=settings" icon={Settings01Icon} label="Settings" />
        </nav>

        <div className="my-4 border-t border-[#d0d7de]" />

        <div className="mb-3 flex items-center justify-between">
          <strong className="text-sm font-semibold">Repositories</strong>
          <button
            className="inline-grid h-7 w-7 cursor-pointer place-items-center rounded-md text-[#57606a] hover:bg-[#f6f8fa]"
            type="button"
            aria-label="New repository"
          >
            <Icon icon={Add01Icon} size={16} />
          </button>
        </div>
        <label className="mb-3 flex h-8 items-center gap-2 rounded-md border border-[#d0d7de] bg-white px-2 text-sm text-[#57606a]">
          <Icon icon={Search01Icon} size={14} />
          <input
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#57606a]"
            value={state.query}
            onChange={(event) => state.setQuery(event.target.value)}
            placeholder="Find a repository..."
          />
        </label>
        <div className="grid gap-0.5">
          {state.filteredRepos.map((repo) => {
            const repoPath = `/${state.owner}/${repo.name}`;
            const isActive = pathname === repoPath;
            
            return (
              <Link
                key={repo.id}
                href={repoPath}
                className={`grid cursor-pointer grid-cols-[16px_1fr_auto] items-center gap-2 rounded-md px-2 py-2 text-left text-sm ${
                  isActive
                    ? "bg-[#ddf4ff] text-[#0969da]"
                    : "hover:bg-[#f6f8fa]"
                }`}
              >
                <Icon icon={CodeFolderIcon} size={14} />
                <span className="truncate font-medium">
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
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function SideLink({ href, active = false, icon, label, count }) {
  return (
    <Link
      href={href}
      className={`flex h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-sm font-medium ${
        active
          ? "bg-[#ddf4ff] text-[#0969da]"
          : "text-[#24292f] hover:bg-[#f6f8fa]"
      }`}
    >
      <Icon icon={icon} size={16} />
      <span>{label}</span>
      {count ? (
        <span className="ml-auto rounded-full bg-[#d0d7de] px-1.5 py-0.5 text-xs text-[#57606a]">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
