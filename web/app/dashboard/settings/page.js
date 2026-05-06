"use client";

import { CodeFolderIcon, GitBranchIcon, GitCommitIcon, Settings01Icon, UserIcon } from "@hugeicons/core-free-icons";
import { Icon } from "../../../components/Icon";
import { Panel } from "../../../components/ui";
import { Sidebar } from "../../../components/Sidebar";
import { TopNav } from "../../../components/TopNav";
import { useGitDaddy } from "../../../hooks/useGitDaddy";
import Link from "next/link";

export default function Page() {
  const state = useGitDaddy();
  if (!state.user) return null;

  return (
    <main className="min-h-screen bg-[#f7f8f4] font-['Space_Grotesk','Inter',ui-sans-serif,system-ui] text-[#1f2328]">
      <div className="flex min-h-screen">
        <Sidebar user={state.user} />
        <div className="min-w-0 flex-1">
          <TopNav user={state.user} onLogout={state.logout} />
          <section className="px-4 py-6 lg:px-8">
            <div className="mx-auto grid max-w-[1280px] gap-5">
              <h1 className="text-3xl font-black">Settings</h1>
              <div className="grid gap-5 lg:grid-cols-2">
                <Panel className="p-5">
                  <Icon icon={UserIcon} size={22} />
                  <h2 className="mt-3 text-lg font-black">Account</h2>
                  <div className="mt-4 grid gap-3 text-sm font-semibold text-neutral-600">
                    <p><span className="font-black text-[#1f2328]">Username:</span> {state.user.username}</p>
                    <p><span className="font-black text-[#1f2328]">Email:</span> {state.user.email || "Not set"}</p>
                  </div>
                  <Link href={`/${state.user.username}`} className="mt-5 inline-flex h-9 items-center rounded-md border border-neutral-950 bg-white px-3 text-sm font-black shadow-[2px_2px_0_#1f2328]">
                    View public profile
                  </Link>
                </Panel>

                <Panel className="p-5">
                  <Icon icon={Settings01Icon} size={22} />
                  <h2 className="mt-3 text-lg font-black">Workspace summary</h2>
                  <div className="mt-4 grid gap-3 text-sm font-semibold text-neutral-600">
                    <SummaryLine icon={CodeFolderIcon} label="Repositories" value={state.repos.length} />
                    <SummaryLine icon={GitBranchIcon} label="Branches" value={state.platformStats?.total_branches ?? 0} />
                    <SummaryLine icon={GitCommitIcon} label="Commits" value={state.platformStats?.total_commits ?? 0} />
                  </div>
                </Panel>
              </div>

              <Panel className="p-5">
                <h2 className="text-lg font-black">Repository defaults</h2>
                <p className="mt-2 text-sm font-semibold text-neutral-500">
                  New repositories can be created as public/private and can include an initial README commit from the create repo screen.
                </p>
                <Link href="/dashboard/new" className="mt-5 inline-flex h-9 items-center rounded-md border border-neutral-950 bg-[#1f2328] px-3 text-sm font-black text-white shadow-[2px_2px_0_#1f2328]">
                  Create repo
                </Link>
              </Panel>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function SummaryLine({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-neutral-300 bg-white px-3 py-2">
      <span className="flex items-center gap-2">
        <Icon icon={icon} size={16} />
        {label}
      </span>
      <strong className="text-[#1f2328]">{value}</strong>
    </div>
  );
}
