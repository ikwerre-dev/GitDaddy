"use client";

import { Sad01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "../../../components/Icon";
import { Panel } from "../../../components/ui";
import { Sidebar } from "../../../components/Sidebar";
import { TopNav } from "../../../components/TopNav";
import { useGitDaddy } from "../../../hooks/useGitDaddy";

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
            <div className="mx-auto grid max-w-[1280px] gap-4">
              <h1 className="text-3xl font-black">Issues</h1>
              <Panel className="p-10 text-center">
                <Icon icon={Sad01Icon} size={42} className="mx-auto text-neutral-500" />
                <h2 className="mt-4 text-lg font-black">Issues are not enabled yet</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-neutral-500">
                  GitDaddy currently supports repositories, commits, branches, file editing, collaborators, and pull requests. There is no issue storage API yet, so there are no issue records to list.
                </p>
              </Panel>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
