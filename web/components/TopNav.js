"use client";

import { Add01Icon, MoreVerticalIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { gitdaddyApi, tokenKey } from "../lib/api";
import { Icon } from "./Icon";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function TopNav({ user, onLogout }) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [ownRepos, setOwnRepos] = useState([]);
  const [publicRepos, setPublicRepos] = useState([]);
  const [focused, setFocused] = useState(false);
  const trimmedQuery = query.trim().toLowerCase();

  useEffect(() => {
    let active = true;
    const token = typeof window !== "undefined" ? localStorage.getItem(tokenKey) : "";
    if (user && token) {
      gitdaddyApi.repos(token).then((repos) => {
        if (active) setOwnRepos(Array.isArray(repos) ? repos : []);
      }).catch(() => {});
    } else {
      setOwnRepos([]);
    }
    return () => {
      active = false;
    };
  }, [user?.username]);

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      if (!query.trim()) {
        setPublicRepos([]);
        return;
      }
      gitdaddyApi.searchRepos(query).then((repos) => {
        if (active) setPublicRepos(Array.isArray(repos) ? repos : []);
      }).catch(() => {
        if (active) setPublicRepos([]);
      });
    }, 180);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [query]);

  const ownMatches = useMemo(() => {
    if (!user || !trimmedQuery) return [];
    return ownRepos
      .filter((repo) => `${repo.name} ${repo.description || ""}`.toLowerCase().includes(trimmedQuery))
      .slice(0, 5)
      .map((repo) => ({ owner: user.username, repository: repo, scope: repo.visibility === "private" ? "private" : "yours" }));
  }, [ownRepos, trimmedQuery, user]);
  const results = useMemo(() => {
    const seen = new Set();
    return [...ownMatches, ...publicRepos].filter((result) => {
      const key = `${result.owner}/${result.repository.name}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);
  }, [ownMatches, publicRepos]);

  function submitSearch(event) {
    event.preventDefault();
    if (results[0]) {
      setQuery("");
      router.push(`/${results[0].owner}/${results[0].repository.name}`);
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-950 bg-[#f7f8f4] font-['Space_Grotesk','Inter',ui-sans-serif,system-ui]">
      <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <button
            className="inline-grid h-9 w-9 cursor-pointer place-items-center rounded-md border border-neutral-950 bg-white shadow-[2px_2px_0_#1f2328] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#1f2328] lg:hidden"
            type="button"
            aria-label="Menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => {
              setMobileMenuOpen(!mobileMenuOpen);
              window.dispatchEvent(new Event("gitdaddy:toggle-sidebar"));
            }}
          >
            <Icon icon={MoreVerticalIcon} size={18} />
          </button>
        </div>

        <form className="relative mx-auto hidden w-full max-w-xl md:block" onSubmit={submitSearch}>
          <label className="flex h-9 items-center gap-3 rounded-md border border-neutral-950 bg-white px-3 text-sm font-semibold text-neutral-500 shadow-[2px_2px_0_#1f2328]">
            <Icon icon={Search01Icon} size={16} />
            <input
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-neutral-400"
              placeholder="Search private and public repos..."
              value={query}
              onBlur={() => window.setTimeout(() => setFocused(false), 140)}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setFocused(true)}
            />
            <kbd className="rounded border border-neutral-950 bg-[#f7f8f4] px-1.5 py-0.5 text-xs font-black text-[#1f2328]">/</kbd>
          </label>
          {focused && query ? (
            <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-md border border-neutral-950 bg-white shadow-[4px_4px_0_#1f2328]">
              {results.length ? results.map((result) => (
                <Link
                  key={`${result.owner}/${result.repository.name}/${result.scope}`}
                  className="grid gap-1 border-b border-neutral-950 px-3 py-2 text-sm last:border-b-0 hover:bg-[#f7f8f4]"
                  href={`/${result.owner}/${result.repository.name}`}
                  onClick={() => setQuery("")}
                >
                  <span className="font-black text-[#0969da]">{result.owner}/{result.repository.name}</span>
                  <span className="truncate text-xs font-semibold text-neutral-500">
                    {result.scope} · {result.repository.description || "No description"}
                  </span>
                </Link>
              )) : (
                <p className="px-3 py-3 text-sm font-semibold text-neutral-500">No repositories found.</p>
              )}
            </div>
          ) : null}
        </form>

        <div className="flex items-center justify-end gap-2">
          <Link
            href={user ? "/dashboard/new" : "/auth"}
            className="grid h-9 w-9 place-items-center rounded-md border border-neutral-950 bg-[#1f2328] text-white shadow-[2px_2px_0_#1f2328] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#1f2328]"
            aria-label="Create repository"
          >
            <Icon icon={Add01Icon} size={18} />
          </Link>
        </div>
      </div>
    </header>
  );
}
