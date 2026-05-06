"use client";

import { useEffect, useState } from "react";
import { GitBranchIcon, GithubIcon, TerminalIcon } from "@hugeicons/core-free-icons";
import { Icon } from "./Icon";

export function LandingPage() {
  const [stars, setStars] = useState(null);
  const repoUrl = "https://github.com/ikwerre-dev/GitDaddy";

  useEffect(() => {
    let active = true;
    fetch("https://api.github.com/repos/ikwerre-dev/GitDaddy")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && data) setStars(data.stargazers_count);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f8f4] font-['Space_Grotesk','Inter',ui-sans-serif,system-ui] text-[#1f2328]">
      <section className="mx-auto max-w-[1320px] px-4 py-6 sm:px-8 lg:px-10">
        <header className="mb-6 flex min-h-12 items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-black">
            <Icon icon={GitBranchIcon} size={24} />
            <span>GitDaddy</span>
          </div>
          <a className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-md border border-neutral-950 bg-white px-3 text-sm font-black shadow-[2px_2px_0_#1f2328] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#1f2328]" href={repoUrl} rel="noreferrer" target="_blank">
            <Icon icon={GithubIcon} size={18} />
            GitHub
            <span className="rounded-full bg-neutral-950 px-2 py-0.5 text-xs text-white">{stars === null ? "--" : formatStars(stars)}</span>
          </a>
        </header>

        <section id="platform" className="grid overflow-hidden rounded-2xl border border-neutral-950 bg-white shadow-[6px_6px_0_#1f2328] lg:grid-cols-[1fr_410px]">
          <div className="relative min-h-[560px] border-b border-neutral-950 p-6 sm:p-10 lg:border-b-0 lg:border-r">
            <PixelPanel className="absolute left-0 top-24 hidden h-56 w-28 sm:block" tone="dark" />
            <PixelPanel className="absolute bottom-0 right-0 h-40 w-52" tone="warm" />
            <div className="relative z-10 mx-auto grid min-h-[470px] max-w-3xl content-center text-center">
              <p className="mb-4 text-sm font-black uppercase text-neutral-500">Open source alternative to GitHub</p>
              <h1 className="text-[64px] font-black leading-[0.9] sm:text-[108px]">GitDaddy</h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg font-semibold leading-8 text-neutral-600">
                Are you broke? Need to self-host GitHub with all the functions? Then I&apos;ve got you covered.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <a className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-md border border-neutral-950 bg-white px-3 text-sm font-black shadow-[2px_2px_0_#1f2328] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#1f2328]" href={repoUrl} rel="noreferrer" target="_blank">
                  <Icon icon={GithubIcon} size={18} />
                  View repo
                </a>
                <a
                  className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-neutral-950 bg-[#1f2328] px-3 text-sm font-black text-white shadow-[2px_2px_0_#1f2328] hover:bg-neutral-800"
                  href="/auth"
                >
                  <span>Get started</span>
                </a>
              </div>
            </div>
          </div>

          <div className="grid">
            <PixelMetric title="Small server" body="Built for modest VPS setups, not giant enterprise hardware." />
            <PixelMetric title="Normal Git" body="Clone, fetch, pull, and push through smart HTTP." />
            <PixelMetric title="GitHub-like UI" body="Files, commits, diffs, branches, settings, and PRs." />
          </div>
        </section>

        <section id="workflow" className="mt-16 grid gap-5 pb-16 lg:grid-cols-[0.9fr_1.1fr]">
          <PixelCard>
            <p className="text-sm font-black uppercase text-neutral-500">Clean, lightweight hosting</p>
            <h2 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">Git, but stored on Cloudflare R2 with custom infra.</h2>
            <p className="mt-5 text-lg leading-8 text-neutral-600">
              GitDaddy takes care of accounts, repo details, branches, PRs, and storage backups, while your team keeps pushing code with plain Git.
            </p>
          </PixelCard>

          <PixelCard>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm font-black uppercase text-neutral-500">
                <Icon icon={TerminalIcon} size={18} />
                terminal
              </div>
              <Icon icon={GitBranchIcon} size={22} />
            </div>
            <pre className="overflow-auto rounded-md bg-[#1f2328] p-5 font-mono text-sm leading-7 text-[#8cffb7]">{`# create a repo in the web UI, then:
git clone http://localhost:8080/git/ikwerre/demo.git
cd demo

git status
git add .
git commit -m "ship it"
git push origin main

git pull origin main
git fetch origin

git checkout -b feature/cache
git push -u origin feature/cache

git branch
git log --oneline
git remote -v`}</pre>
          </PixelCard>
        </section>
      </section>

    </main>
  );
}

function PixelPanel({ className, tone }) {
  const warm = tone === "warm";
  return (
    <div className={`pointer-events-none ${className}`} aria-hidden="true">
      <div className="absolute inset-0 [background-image:radial-gradient(circle,#1f2328_1px,transparent_1px)] [background-size:9px_9px] opacity-20" />
      <span className={`absolute bottom-0 left-0 h-10 w-16 ${warm ? "bg-[#ff7b72]" : "bg-[#1f2328]"}`} />
      <span className={`absolute bottom-10 left-12 h-12 w-12 ${warm ? "bg-[#f0883e]" : "bg-neutral-300"}`} />
      <span className={`absolute bottom-0 left-24 h-14 w-20 ${warm ? "bg-[#d29922]" : "bg-neutral-100"}`} />
      <span className="absolute bottom-14 left-32 h-8 w-8 bg-white" />
    </div>
  );
}

function PixelMetric({ title, body }) {
  return (
    <article className="min-h-44 border-b border-neutral-950 p-7 last:border-b-0">
      <strong className="block text-4xl font-black">{title}</strong>
      <p className="mt-3 max-w-xs text-sm font-semibold leading-6 text-neutral-500">{body}</p>
    </article>
  );
}

function PixelCard({ children }) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-neutral-950 bg-white p-6 shadow-[4px_4px_0_#1f2328] sm:p-8">
      <div className="absolute right-0 top-0 h-24 w-28 [background-image:radial-gradient(circle,#1f2328_1px,transparent_1px)] [background-size:9px_9px] opacity-20" aria-hidden="true" />
      <div className="relative z-10">{children}</div>
    </article>
  );
}

function formatStars(value) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return String(value);
}
