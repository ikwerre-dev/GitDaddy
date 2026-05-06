"use client";

import { GitBranchIcon } from "@hugeicons/core-free-icons";
import { Icon } from "../components/Icon";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#f7f8f4] font-['Space_Grotesk','Inter',ui-sans-serif,system-ui] text-[#1f2328]">
      <section className="mx-auto grid min-h-screen max-w-4xl content-center px-4 py-10">
        <div className="relative overflow-hidden rounded-2xl border border-neutral-950 bg-white p-8 text-center shadow-[6px_6px_0_#1f2328] sm:p-12">
          <div className="absolute right-0 top-0 h-32 w-40 [background-image:radial-gradient(circle,#1f2328_1px,transparent_1px)] [background-size:9px_9px] opacity-20" aria-hidden="true" />
          <div className="relative z-10">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl border border-neutral-950 bg-[#f7f8f4]">
              <Icon icon={GitBranchIcon} size={28} />
            </div>
            <p className="mt-6 text-sm font-black uppercase text-neutral-500">404</p>
            <h1 className="mt-2 text-5xl font-black">That repo path went missing.</h1>
            <p className="mx-auto mt-4 max-w-xl text-lg font-semibold leading-8 text-neutral-600">
              The page does not exist, or the repository is private and you need to log in first.
            </p>
            <a className="mt-7 inline-flex min-h-10 cursor-pointer items-center justify-center rounded-md border border-neutral-950 bg-[#1f2328] px-4 text-sm font-black text-white" href="/">
              Back to GitDaddy
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
