"use client";

import {
  Add01Icon,
  CodeFolderIcon,
  Home01Icon,
  Search01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "./Icon";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar({ state }) {
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";
  const isUserProfile = pathname.startsWith("/") && pathname.split("/").length === 2 && pathname !== "/dashboard";

  return (
    <aside className="hidden w-64 border-r border-neutral-950 bg-[#f7f8f4] font-['Space_Grotesk','Inter',ui-sans-serif,system-ui] lg:block">
      <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto p-4">
        <nav className="grid gap-1">
          <SideLink
            href="/dashboard"
            active={isDashboard}
            icon={Home01Icon}
            label="Home"
          />
          <SideLink
            href={`/${state.owner}`}
            active={isUserProfile}
            icon={UserIcon}
            label="Your profile"
          /> 
        </nav>

        <div className="my-4 border-t border-neutral-950" />

        <div className="mb-3 flex items-center justify-between">
          <strong className="text-sm font-black">Repositories</strong>
          <button
            className="inline-grid h-8 w-8 cursor-pointer place-items-center rounded-md border border-neutral-950 bg-white text-[#1f2328] shadow-[2px_2px_0_#1f2328] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#1f2328]"
            type="button"
            aria-label="New repository"
          >
            <Icon icon={Add01Icon} size={16} />
          </button>
        </div>
        <label className="mb-3 flex h-9 items-center gap-2 rounded-md border border-neutral-950 bg-white px-2 text-sm font-semibold text-neutral-500 shadow-[2px_2px_0_#1f2328]">
          <Icon icon={Search01Icon} size={14} />
          <input
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-neutral-400"
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
                className={`grid cursor-pointer grid-cols-[16px_1fr_auto] items-center gap-2 rounded-md border px-2 py-2 text-left text-sm font-semibold ${
                  isActive
                    ? "border-neutral-950 bg-[#ddf4ff] text-[#0969da] shadow-[2px_2px_0_#1f2328]"
                    : "border-transparent hover:border-neutral-950 hover:bg-white"
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
                      : "border border-[#1f2328]"
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
      className={`flex h-9 cursor-pointer items-center gap-2 rounded-md border px-2 text-sm font-black ${
        active
          ? "border-neutral-950 bg-[#ddf4ff] text-[#0969da] shadow-[2px_2px_0_#1f2328]"
          : "border-transparent text-[#1f2328] hover:border-neutral-950 hover:bg-white"
      }`}
    >
      <Icon icon={icon} size={16} />
      <span>{label}</span>
      {count ? (
        <span className="ml-auto rounded-full bg-[#1f2328] px-1.5 py-0.5 text-xs text-white">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
