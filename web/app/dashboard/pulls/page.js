"use client";

import { useEffect, useState } from "react";
import { GitPullRequestIcon } from "@hugeicons/core-free-icons";
import { gitdaddyApi } from "../../../lib/api";
import { Icon } from "../../../components/Icon";
import { Panel } from "../../../components/ui";
import { Sidebar } from "../../../components/Sidebar";
import { TopNav } from "../../../components/TopNav";
import { useGitDaddy } from "../../../hooks/useGitDaddy";
import Link from "next/link";

export default function Page() {
  const state = useGitDaddy();
  const [pulls, setPulls] = useState([]);

  useEffect(() => {
    if (!state.token || !state.owner || !state.repos.length) return;
    let active = true;
    Promise.all(
      state.repos.map((repo) =>
        gitdaddyApi.pulls(state.token, state.owner, repo.name)
          .then((items) => items.map((pull) => ({ ...pull, repo: repo.name })))
          .catch(() => [])
      )
    ).then((groups) => {
      if (active) setPulls(groups.flat());
    });
    return () => {
      active = false;
    };
  }, [state.token, state.owner, state.repos]);

  if (!state.user) return null;

  return (
    <main className="min-h-screen bg-[#f7f8f4] font-['Space_Grotesk','Inter',ui-sans-serif,system-ui] text-[#1f2328]">
      <div className="flex min-h-screen">
        <Sidebar user={state.user} />
        <div className="min-w-0 flex-1">
          <TopNav user={state.user} onLogout={state.logout} />
          <section className="px-4 py-6 lg:px-8">
            <div className="mx-auto grid max-w-[1280px] gap-4">
              <h1 className="text-3xl font-black">Pull requests</h1>
              <Panel className="overflow-hidden">
                {pulls.length ? pulls.map((pull) => (
                  <Link
                    key={`${pull.repo}-${pull.id}`}
                    href={`/${state.owner}/${pull.repo}`}
                    className="grid gap-2 border-b border-neutral-950 px-5 py-4 last:border-b-0 hover:bg-[#f7f8f4]"
                  >
                    <div className="flex items-center gap-2">
                      <Icon icon={GitPullRequestIcon} size={18} className="text-[#1f883d]" />
                      <strong className="text-sm">#{pull.id} {pull.title}</strong>
                    </div>
                    <p className="text-sm font-semibold text-neutral-500">
                      {state.owner}/{pull.repo} · {pull.source} to {pull.target} · {pull.status}
                    </p>
                  </Link>
                )) : (
                  <div className="p-10 text-center">
                    <Icon icon={GitPullRequestIcon} size={42} className="mx-auto text-neutral-500" />
                    <h2 className="mt-4 text-lg font-black">No pull requests</h2>
                    <p className="mt-2 text-sm font-semibold text-neutral-500">Open pull requests from a repository page when you have branches to compare.</p>
                  </div>
                )}
              </Panel>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
