"use client";

import { Add01Icon, GitBranchIcon, Logout01Icon, MoreVerticalIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "./Icon";
import Link from "next/link";
import { useState } from "react";

export function TopNav({ user, onLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-950 bg-[#f7f8f4] font-['Space_Grotesk','Inter',ui-sans-serif,system-ui]">
      <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <button
            className="inline-grid h-9 w-9 cursor-pointer place-items-center rounded-md border border-neutral-950 bg-white shadow-[2px_2px_0_#1f2328] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#1f2328] lg:hidden"
            type="button"
            aria-label="Menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Icon icon={MoreVerticalIcon} size={18} />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-black hover:text-[#0969da]">
            <div className="grid h-9 w-9 place-items-center rounded-md border border-neutral-950 bg-[#1f2328] text-white shadow-[2px_2px_0_#1f2328]">
              <Icon icon={GitBranchIcon} size={20} />
            </div>
            <span className="hidden sm:inline">GitDaddy</span>
          </Link>
        </div>

        <label className="mx-auto hidden h-9 w-full max-w-xl items-center gap-3 rounded-md border border-neutral-950 bg-white px-3 text-sm font-semibold text-neutral-500 shadow-[2px_2px_0_#1f2328] md:flex">
          <Icon icon={Search01Icon} size={16} />
          <input
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-neutral-400"
            placeholder="Search repositories..."
          />
          <kbd className="rounded border border-neutral-950 bg-[#f7f8f4] px-1.5 py-0.5 text-xs font-black text-[#1f2328]">/</kbd>
        </label>

        <div className="flex items-center justify-end gap-2">
          <button
            className="inline-grid h-9 w-9 cursor-pointer place-items-center rounded-md border border-neutral-950 bg-white shadow-[2px_2px_0_#1f2328] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#1f2328]"
            type="button"
            aria-label="Create"
          >
            <Icon icon={Add01Icon} size={18} />
          </button>
          <button
            className="hidden h-9 cursor-pointer items-center gap-2 rounded-md border border-neutral-950 bg-white px-3 text-sm font-black shadow-[2px_2px_0_#1f2328] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#1f2328] sm:inline-flex"
            type="button"
            onClick={onLogout}
          >
            <Icon icon={Logout01Icon} size={16} />
            Logout
          </button>
          <Link
            href={`/${user.username}`}
            className="grid h-9 w-9 place-items-center rounded-md border border-neutral-950 bg-[#0969da] text-xs font-black text-white shadow-[2px_2px_0_#1f2328] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#1f2328]"
          >
            {user.username.slice(0, 1).toUpperCase()}
          </Link>
        </div>
      </div>
    </header>
  );
}
