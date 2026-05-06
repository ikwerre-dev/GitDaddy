"use client";

import { useState } from "react";
import {
  Activity01Icon,
  CloudUploadIcon,
  CodeFolderIcon,
  Copy01Icon,
  DatabaseSyncIcon,
  GitBranchIcon,
  GithubIcon,
  RepositoryIcon,
  ServerStack03Icon,
  ShieldKeyIcon,
  TerminalIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "./Icon";
import { Button, Input, Message } from "./ui";

export function LandingPage({ busy, message, onSubmit }) {
  const [mode, setMode] = useState("login");
  const cloneCommand = "git clone http://localhost:8080/git/robinson/api.git";
  const commandBlock = `git remote add origin http://localhost:8080/git/robinson/api.git
git fetch origin
git pull origin main
git push origin main`;

  return (
    <main className="min-h-screen bg-white text-neutral-950 [background-image:linear-gradient(#e8e8e8_1px,transparent_1px),linear-gradient(90deg,#e8e8e8_1px,transparent_1px)] [background-size:72px_72px]">
      <section className="mx-auto min-h-screen max-w-[1480px] px-3 py-3 sm:px-6 sm:py-6 lg:px-10 lg:py-10">
        <div className="border border-neutral-950 bg-white shadow-[12px_12px_0_#111]">
          <header className="border-b border-neutral-950">
            <nav className="flex min-h-16 items-center justify-between border-b border-neutral-200 px-4 sm:px-6">
              <div className="flex items-center gap-3 font-black">
                <span className="grid h-10 w-10 place-items-center border border-neutral-950 bg-lime-300">
                  <Icon icon={GithubIcon} size={23} />
                </span>
                <span>GitDaddy</span>
              </div>
              <div className="hidden items-center gap-2 text-xs font-black uppercase text-neutral-600 md:flex">
                <span className="border border-neutral-300 px-3 py-1">GitHub alternative</span>
                <span className="border border-neutral-300 px-3 py-1">Smart HTTP Git</span>
                <span className="border border-neutral-300 px-3 py-1">R2 snapshots</span>
              </div>
            </nav>
            <div className="grid lg:grid-cols-[1fr_360px]">
              <div className="px-4 py-12 sm:px-8 sm:py-16 lg:px-12">
                <p className="mb-4 flex items-center gap-2 text-xs font-black uppercase text-neutral-600">
                  <Icon icon={RepositoryIcon} size={18} />
                  Self-hosted Git platform for real Git commands
                </p>
                <h1 className="text-[64px] font-black leading-[0.9] text-neutral-950 sm:text-[104px] lg:text-[168px]">GitDaddy</h1>
                <p className="mt-7 max-w-3xl text-lg font-semibold leading-8 text-neutral-700">
                  A clean, open-source GitHub alternative with normal clone, fetch, pull, and push workflows,
                  browser repository views, branch creation, pull requests, Postgres metadata, Redis queues, and async R2 backup sync.
                </p>
              </div>
              <div className="grid border-t border-neutral-950 lg:border-l lg:border-t-0">
                {[
                  ["clone", "Restore from cache or R2"],
                  ["push", "Write fast, sync later"],
                  ["review", "Open lightweight PRs"],
                ].map(([label, text]) => (
                  <div className="grid content-center gap-2 border-b border-neutral-950 p-6 last:border-b-0" key={label}>
                    <strong className="text-4xl font-black">{label}</strong>
                    <span className="text-sm font-bold text-neutral-600">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </header>

          <div className="flex min-h-16 items-center justify-between gap-3 border-b border-neutral-950 bg-neutral-950 px-4 text-white sm:px-6">
            <div className="flex min-w-0 items-center gap-3 font-mono text-xs sm:text-sm">
              <Icon icon={TerminalIcon} size={20} />
              <span className="truncate">{cloneCommand}</span>
            </div>
            <button className="grid h-10 w-10 shrink-0 place-items-center border border-white/40 bg-white text-neutral-950" type="button" title="Copy clone command" onClick={() => navigator.clipboard?.writeText(cloneCommand)}>
              <Icon icon={Copy01Icon} size={18} />
            </button>
          </div>

          <div className="grid lg:grid-cols-[1fr_420px]">
            <div className="grid md:grid-cols-2">
              <article className="min-h-[300px] border-b border-neutral-950 p-6 sm:p-8 md:border-r">
                <span className="text-xs font-black uppercase text-neutral-500">01 / concept</span>
                <h2 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">Your own GitHub-style control room.</h2>
                <p className="mt-5 max-w-xl text-base font-medium leading-7 text-neutral-700">
                  Create repositories, inspect branches, read commits, open file trees, preview files, review diffs,
                  and manage repository settings from the browser.
                </p>
              </article>
              <div className="min-h-[300px] border-b border-neutral-950 bg-neutral-100 [background-image:repeating-linear-gradient(135deg,#111_0_1px,transparent_1px_12px)]" aria-hidden="true" />
              <article className="border-b border-neutral-950 p-6 sm:p-8 md:col-span-2 md:border-r">
                <span className="text-xs font-black uppercase text-neutral-500">git transport</span>
                <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">No custom CLI. Just Git.</h2>
                <pre className="mt-6 overflow-auto border border-neutral-950 bg-neutral-950 p-5 font-mono text-sm leading-7 text-lime-200">
                  <code>{commandBlock}</code>
                </pre>
              </article>
              <article className="grid gap-4 border-b border-neutral-950 p-6 sm:p-8 md:border-r lg:border-b-0">
                <span className="text-xs font-black uppercase text-neutral-500">backend path</span>
                {[
                  [GitBranchIcon, "Smart HTTP Git protocol"],
                  [ShieldKeyIcon, "Token auth and repository permissions"],
                  [DatabaseSyncIcon, "PostgreSQL metadata and Redis queues"],
                  [CloudUploadIcon, "LZ4-compressed async R2 snapshots"],
                ].map(([icon, text]) => (
                  <div className="flex items-center gap-3 border border-neutral-200 bg-neutral-50 p-3 font-black" key={text}>
                    <Icon icon={icon} size={20} />
                    <span>{text}</span>
                  </div>
                ))}
              </article>
              <article className="grid content-between gap-8 border-b border-neutral-950 p-6 sm:p-8 lg:border-b-0">
                <span className="text-xs font-black uppercase text-neutral-500">system shape</span>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    [ServerStack03Icon, "Go API"],
                    [CodeFolderIcon, "Repo browser"],
                    [Activity01Icon, "Worker sync"],
                    [CloudUploadIcon, "R2 backup"],
                  ].map(([icon, label]) => (
                    <div className="grid min-h-24 place-items-center border border-neutral-950 bg-white text-center font-black" key={label}>
                      <Icon icon={icon} size={25} />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <aside className="border-neutral-950 bg-[#f7f4ec] lg:border-l">
              <form className="grid gap-4 p-6 sm:p-8 lg:sticky lg:top-8" onSubmit={(event) => {
                event.preventDefault();
                onSubmit(Object.fromEntries(new FormData(event.currentTarget)), mode);
              }}>
                <div>
                  <span className="text-xs font-black uppercase text-neutral-500">workspace access</span>
                  <h2 className="mt-3 text-3xl font-black leading-tight">{mode === "login" ? "Enter GitDaddy." : "Create GitDaddy account."}</h2>
                </div>
                <Input name="username" placeholder="Username" required />
                {mode === "register" ? <Input name="email" placeholder="Email" /> : null}
                <Input name="password" placeholder="Password" type="password" required />
                <div className="grid grid-cols-2 rounded-md border border-neutral-950 bg-white p-1">
                  <button type="button" className={mode === "login" ? "min-h-10 rounded bg-neutral-950 font-black text-white" : "min-h-10 font-black text-neutral-600"} onClick={() => setMode("login")}>Login</button>
                  <button type="button" className={mode === "register" ? "min-h-10 rounded bg-neutral-950 font-black text-white" : "min-h-10 font-black text-neutral-600"} onClick={() => setMode("register")}>Sign up</button>
                </div>
                <Button variant="primary" disabled={busy} type="submit">
                  <Icon icon={ShieldKeyIcon} size={18} />
                  {mode === "login" ? "Login" : "Create account"}
                </Button>
                <Message>{message}</Message>
              </form>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
