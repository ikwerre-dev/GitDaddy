"use client";

import {
  CodeFolderIcon,
  GitBranchIcon,
  GitPullRequestIcon,
  Sad01Icon,
  Settings01Icon,
  StarIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "./Icon";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function Sidebar({ user }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const primaryLinks = [
    ["/dashboard", CodeFolderIcon, "Repositories"],
    ["/dashboard/pulls", GitPullRequestIcon, "Pull requests"],
    ["/dashboard/issues", Sad01Icon, "Issues"],
    ["/dashboard/stars", StarIcon, "Stars"],
  ];
  const footerLinks = [
    [user ? `/${user.username}` : "/auth", UserIcon, "Profile"],
    ["/dashboard/settings", Settings01Icon, "Settings"],
  ];

  useEffect(() => {
    function toggleSidebar() {
      setMobileOpen((open) => !open);
    }
    window.addEventListener("gitdaddy:toggle-sidebar", toggleSidebar);
    return () => window.removeEventListener("gitdaddy:toggle-sidebar", toggleSidebar);
  }, []);

  return (
    <>
    {mobileOpen ? (
      <button
        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        type="button"
        aria-label="Close sidebar"
        onClick={() => setMobileOpen(false)}
      />
    ) : null}
    <aside className={`${mobileOpen ? "fixed inset-y-0 left-0 z-50 flex" : "hidden"} min-h-screen w-[244px] shrink-0 flex-col border-r border-[#151924] bg-[#070a12] text-white lg:static lg:z-auto lg:flex`}>
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#070a12]">
          <Icon icon={GitBranchIcon} size={21} />
        </div>
        <strong className="text-base font-black">GitDaddy</strong>
      </div>

      <nav className="grid gap-1.5 px-3">
        {primaryLinks.map(([href, icon, label]) => (
          <SideLink key={href} href={href} icon={icon} label={label} active={pathname === href} onClick={() => setMobileOpen(false)} />
        ))}
      </nav>

      <nav className="mt-auto grid gap-1.5 border-t border-[#151924] px-3 py-5">
        {footerLinks.map(([href, icon, label]) => (
          <SideLink key={href} href={href} icon={icon} label={label} active={pathname === href} onClick={() => setMobileOpen(false)} />
        ))}
      </nav>
    </aside>
    </>
  );
}

function SideLink({ href, icon, label, active, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-black transition ${
        active ? "bg-[#1b1e28] text-white" : "text-[#626674] hover:bg-[#111521] hover:text-white"
      }`}
    >
      <Icon icon={icon} size={18} />
      <span>{label}</span>
    </Link>
  );
}
