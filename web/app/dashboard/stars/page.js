"use client";

import { useEffect, useState } from "react";
import { CodeFolderIcon, StarIcon } from "@hugeicons/core-free-icons";
import { Icon } from "../../../components/Icon";
import { Panel } from "../../../components/ui";
import { Sidebar } from "../../../components/Sidebar";
import { TopNav } from "../../../components/TopNav";
import { useGitDaddy } from "../../../hooks/useGitDaddy";
import Link from "next/link";

export default function Page() {
  const state = useGitDaddy();
  const [stars, setStars] = useState([]);

  useEffect(() => {
    function loadStars() {
      setStars(JSON.parse(localStorage.getItem("gitdaddy_stars") || "[]"));
    }
    loadStars();
    window.addEventListener("gitdaddy:stars-updated", loadStars);
    return () => window.removeEventListener("gitdaddy:stars-updated", loadStars);
  }, []);

  if (!state.user) return null;

  return (
    <main className="min-h-screen bg-[#f7f8f4] font-['Space_Grotesk','Inter',ui-sans-serif,system-ui] text-[#1f2328]">
      <div className="flex min-h-screen">
        <Sidebar user={state.user} />
        <div className="min-w-0 flex-1">
          <TopNav user={state.user} onLogout={state.logout} />
          <section className="px-4 py-6 lg:px-8">
            <div className="mx-auto grid max-w-[1280px] gap-4">
              <h1 className="text-3xl font-black">Stars</h1>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {stars.length ? stars.map((repo) => (
                  <Link
                    key={`${repo.owner}/${repo.name}`}
                    href={`/${repo.owner}/${repo.name}`}
                    className="rounded-xl border border-neutral-300 bg-white p-4 shadow-[3px_3px_0_rgba(31,35,40,.75)]"
                  >
                    <div className="flex items-center justify-between">
                      <Icon icon={CodeFolderIcon} size={20} />
                      <Icon icon={StarIcon} size={18} className="text-[#d29922]" />
                    </div>
                    <h2 className="mt-4 truncate text-xl font-black">{repo.name}</h2>
                    <p className="mt-1 truncate text-xs font-black text-neutral-500">{repo.owner}/{repo.name}</p>
                    <p className="mt-3 line-clamp-2 text-sm font-semibold text-neutral-600">{repo.description || "No description provided"}</p>
                  </Link>
                )) : (
                  <Panel className="p-10 text-center sm:col-span-2 xl:col-span-3">
                    <Icon icon={StarIcon} size={42} className="mx-auto text-neutral-500" />
                    <h2 className="mt-4 text-lg font-black">No starred repositories</h2>
                    <p className="mt-2 text-sm font-semibold text-neutral-500">Star repositories from a repo page to keep them here.</p>
                  </Panel>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
