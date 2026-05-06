"use client";

import { Add01Icon, GitBranchIcon, Logout01Icon, MoreVerticalIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "./Icon";
import Link from "next/link";
import { useState } from "react";

export function TopNav({ user, onLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-[#d0d7de] bg-white">
      <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <button
            className="inline-grid h-8 w-8 cursor-pointer place-items-center rounded-md border border-transparent hover:bg-[#f6f8fa] lg:hidden"
            type="button"
            aria-label="Menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Icon icon={MoreVerticalIcon} size={18} />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold hover:text-[#0969da]">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#24292f] text-white">
              <Icon icon={GitBranchIcon} size={20} />
            </div>
            <span className="hidden sm:inline">GitDaddy</span>
          </Link>
        </div>

        <label className="mx-auto hidden h-9 w-full max-w-xl items-center gap-3 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm text-[#57606a] md:flex">
          <Icon icon={Search01Icon} size={16} />
          <input
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#57606a]"
            placeholder="Search repositories..."
          />
          <kbd className="rounded border border-[#d0d7de] px-1.5 py-0.5 text-xs text-[#57606a]">/</kbd>
        </label>

        <div className="flex items-center justify-end gap-2">
          <button
            className="inline-grid h-8 w-8 cursor-pointer place-items-center rounded-md border border-transparent hover:bg-[#f6f8fa]"
            type="button"
            aria-label="Create"
          >
            <Icon icon={Add01Icon} size={18} />
          </button>
          <button
            className="hidden h-8 cursor-pointer items-center gap-2 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm font-medium hover:bg-[#f3f4f6] sm:inline-flex"
            type="button"
            onClick={onLogout}
          >
            <Icon icon={Logout01Icon} size={16} />
            Logout
          </button>
          <Link
            href={`/${user.username}`}
            className="grid h-8 w-8 place-items-center rounded-full bg-[#0969da] text-xs font-bold text-white hover:ring-2 hover:ring-[#0969da] hover:ring-offset-2"
          >
            {user.username.slice(0, 1).toUpperCase()}
          </Link>
        </div>
      </div>
    </header>
  );
}
