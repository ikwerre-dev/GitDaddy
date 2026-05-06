"use client";

import { TopNav } from "./TopNav";
import { Sidebar } from "./Sidebar";
import { Panel } from "./ui";

export function DashboardSectionPage({ state, title, body }) {
  if (!state.user) return null;

  return (
    <main className="min-h-screen bg-[#f7f8f4] font-['Space_Grotesk','Inter',ui-sans-serif,system-ui] text-[#1f2328]">
      <div className="flex min-h-screen">
        <Sidebar user={state.user} />
        <div className="min-w-0 flex-1">
          <TopNav user={state.user} onLogout={state.logout} />
          <section className="px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-[1280px]">
            <Panel className="p-8">
              <p className="text-sm font-black uppercase text-neutral-500">GitDaddy</p>
              <h1 className="mt-2 text-4xl font-black">{title}</h1>
              <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-neutral-600">{body}</p>
            </Panel>
          </div>
          </section>
        </div>
      </div>
    </main>
  );
}
