"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GitBranchIcon, ShieldKeyIcon } from "@hugeicons/core-free-icons";
import { Icon } from "./Icon";
import { Input, Message } from "./ui";

export function AuthPage({ state }) {
  const router = useRouter();
  const [mode, setMode] = useState("login");

  useEffect(() => {
    if (state.token && state.user) router.replace("/");
  }, [router, state.token, state.user]);

  return (
    <main className="min-h-screen bg-[#f7f8f4] font-['Space_Grotesk','Inter',ui-sans-serif,system-ui] text-[#1f2328]">
      <section className="mx-auto grid min-h-screen max-w-[1180px] content-center px-4 py-10 sm:px-8">
        <div className="mb-6 flex items-center justify-between">
          <a className="flex items-center gap-2 text-lg font-black" href="/">
            <Icon icon={GitBranchIcon} size={24} />
            <span>GitDaddy</span>
          </a>
          <a className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-black shadow-[2px_2px_0_#1f2328]" href="/">
            Back home
          </a>
        </div>

        <div className="grid overflow-hidden rounded-2xl border border-neutral-950 bg-white shadow-[6px_6px_0_#1f2328] lg:grid-cols-[1fr_430px]">
          <section className="relative hidden min-h-[560px] border-r border-neutral-950 p-10 lg:block">
            <PixelPanel className="absolute left-0 top-16 h-64 w-32" tone="dark" />
            <PixelPanel className="absolute bottom-0 right-0 h-48 w-56" tone="warm" />
            <div className="relative z-10 grid h-full content-center">
              <p className="text-sm font-black uppercase text-neutral-500">Workspace access</p>
              <h1 className="mt-4 max-w-xl text-6xl font-black leading-[0.95]">Your tiny GitHub-ish server is waiting.</h1>
              <p className="mt-6 max-w-lg text-lg font-semibold leading-8 text-neutral-600">
                Login, create repos, push code, open branches, and keep your setup light enough for a normal VPS.
              </p>
            </div>
          </section>

          <section className="relative overflow-hidden p-6 sm:p-8">
            <div className="absolute right-0 top-0 h-28 w-32 [background-image:radial-gradient(circle,#1f2328_1px,transparent_1px)] [background-size:9px_9px] opacity-20" aria-hidden="true" />
            <form
              className="relative z-10 grid min-h-[500px] content-center gap-4"
              onSubmit={async (event) => {
                event.preventDefault();
                await state.login(Object.fromEntries(new FormData(event.currentTarget)), mode);
              }}
            >
              <div>
                <p className="text-sm font-black uppercase text-neutral-500">{mode === "login" ? "Welcome back" : "Create workspace"}</p>
                <h2 className="mt-2 text-4xl font-black">{mode === "login" ? "Login to GitDaddy" : "Start with GitDaddy"}</h2>
              </div>

              <div className="grid grid-cols-2 rounded-md border border-neutral-200 bg-neutral-50 p-1">
                <button type="button" className={mode === "login" ? "min-h-10 cursor-pointer rounded bg-neutral-950 font-black text-white" : "min-h-10 cursor-pointer font-black text-neutral-600"} onClick={() => setMode("login")}>
                  Login
                </button>
                <button type="button" className={mode === "register" ? "min-h-10 cursor-pointer rounded bg-neutral-950 font-black text-white" : "min-h-10 cursor-pointer font-black text-neutral-600"} onClick={() => setMode("register")}>
                  Sign up
                </button>
              </div>

              <Input name="username" placeholder="Username" required />
              {mode === "register" ? <Input name="email" placeholder="Email" /> : null}
              <Input name="password" placeholder="Password" type="password" required />

              <button
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-neutral-950 bg-[#1f2328] px-4 text-sm font-black text-white shadow-[2px_2px_0_#1f2328] hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={state.busy}
                type="submit"
              >
                <Icon icon={ShieldKeyIcon} size={18} />
                <span>{mode === "login" ? "Login" : "Create account"}</span>
              </button>
              <Message>{state.message}</Message>
            </form>
          </section>
        </div>
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
