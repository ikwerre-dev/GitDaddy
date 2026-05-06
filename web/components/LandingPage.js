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
    <main className="min-h-screen bg-[#f6f8fa]">
      <section className="mx-auto max-w-[1320px] px-4 py-6 sm:px-8 lg:px-10">
        <header className="mb-6 flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-bold">
            <Icon icon={GitBranchIcon} size={24} />
            <span>GitDaddy</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-[#d0d7de] bg-white px-3 text-sm font-medium hover:bg-[#f6f8fa]"
              href={repoUrl}
              rel="noreferrer"
              target="_blank"
            >
              <Icon icon={GithubIcon} size={16} />
              <span className="hidden sm:inline">GitHub</span>
              <span className="rounded-full bg-[#f6f8fa] px-2 py-0.5 text-xs">
                {stars === null ? "--" : formatStars(stars)}
              </span>
            </a>
            <a
              className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-[#1f883d] bg-[#1f883d] px-3 text-sm font-medium text-white hover:bg-[#1a7f37]"
              href="/auth"
            >
              Get started
            </a>
          </div>
        </header>

        <section id="platform" className="grid overflow-hidden rounded-lg border border-[#d0d7de] bg-white shadow-sm lg:grid-cols-[1fr_410px]">
          <div className="relative min-h-[560px] border-b border-[#d0d7de] bg-[#f6f8fa] p-6 sm:p-10 lg:border-b-0 lg:border-r">
            <div className="relative z-10 mx-auto grid min-h-[470px] max-w-3xl content-center text-center">
              <p className="mb-4 text-sm font-semibold uppercase text-[#57606a]">
                Open source alternative to GitHub
              </p>
              <h1 className="text-5xl font-bold leading-tight sm:text-7xl">GitDaddy</h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg font-medium leading-8 text-[#57606a]">
                Self-hosted Git platform with GitHub-like interface. Perfect for teams who want full control over their code hosting.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <a
                  className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-[#d0d7de] bg-white px-4 text-sm font-medium hover:bg-[#f6f8fa]"
                  href={repoUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Icon icon={GithubIcon} size={18} />
                  View repository
                </a>
                <a
                  className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#1f883d] bg-[#1f883d] px-4 text-sm font-medium text-white hover:bg-[#1a7f37]"
                  href="/auth"
                >
                  Get started
                </a>
              </div>
            </div>
          </div>

          <div className="grid divide-y divide-[#d0d7de]">
            <PixelMetric title="Lightweight" body="Built for modest VPS setups, not enterprise hardware." />
            <PixelMetric title="Standard Git" body="Clone, fetch, pull, and push through smart HTTP." />
            <PixelMetric title="GitHub-like UI" body="Files, commits, diffs, branches, and pull requests." />
          </div>
        </section>

        <section id="workflow" className="mt-16 grid gap-5 pb-16 lg:grid-cols-[0.9fr_1.1fr]">
          <PixelCard>
            <p className="text-sm font-semibold uppercase text-[#57606a]">
              Clean, lightweight hosting
            </p>
            <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
              Git storage on Cloudflare R2 with custom infrastructure
            </h2>
            <p className="mt-5 text-lg leading-8 text-[#57606a]">
              GitDaddy manages accounts, repositories, branches, and pull requests while your team uses standard Git commands.
            </p>
          </PixelCard>

          <PixelCard>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase text-[#57606a]">
                <Icon icon={TerminalIcon} size={18} />
                terminal
              </div>
              <Icon icon={GitBranchIcon} size={22} />
            </div>
            <pre className="overflow-auto rounded-md bg-[#24292f] p-5 font-mono text-sm leading-7 text-[#8cffb7]">{`# create a repo in the web UI, then:
git clone http://localhost:8080/git/user/demo.git
cd demo

git status
git add .
git commit -m "initial commit"
git push origin main

git pull origin main
git fetch origin

git checkout -b feature/new-feature
git push -u origin feature/new-feature

git branch
git log --oneline
git remote -v`}</pre>
          </PixelCard>
        </section>
      </section>
    </main>
  );
}

function PixelMetric({ title, body }) {
  return (
    <article className="min-h-44 p-7">
      <strong className="block text-3xl font-bold">{title}</strong>
      <p className="mt-3 max-w-xs text-sm font-medium leading-6 text-[#57606a]">{body}</p>
    </article>
  );
}

function PixelCard({ children }) {
  return (
    <article className="relative overflow-hidden rounded-lg border border-[#d0d7de] bg-white p-6 shadow-sm sm:p-8">
      <div className="relative z-10">{children}</div>
    </article>
  );
}

function formatStars(value) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return String(value);
}
