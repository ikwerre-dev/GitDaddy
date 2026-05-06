"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitBranchIcon, ShieldKeyIcon } from "@hugeicons/core-free-icons";
import { Icon } from "./Icon";
import { Input, Message } from "./ui";

export function AuthPage({ state }) {
  const [mode, setMode] = useState("login");
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#f6f8fa]">
      <section className="mx-auto grid min-h-screen max-w-[1180px] content-center px-4 py-10 sm:px-8">
        <div className="mb-6 flex items-center justify-between">
          <a className="flex items-center gap-2 text-lg font-bold" href="/">
            <Icon icon={GitBranchIcon} size={24} />
            <span>GitDaddy</span>
          </a>
          <a
            className="inline-flex h-8 items-center rounded-md border border-[#d0d7de] bg-white px-3 text-sm font-medium hover:bg-[#f6f8fa]"
            href="/"
          >
            Back home
          </a>
        </div>

        <div className="grid overflow-hidden rounded-lg border border-[#d0d7de] bg-white shadow-sm lg:grid-cols-[1fr_420px]">
          <section className="relative hidden min-h-[560px] border-r border-[#d0d7de] bg-[#f6f8fa] p-10 lg:block">
            <div className="grid h-full content-center">
              <p className="text-sm font-semibold uppercase text-[#57606a]">
                Workspace access
              </p>
              <h1 className="mt-4 max-w-xl text-5xl font-bold leading-tight">
                Your self-hosted Git platform
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-8 text-[#57606a]">
                Login to access your repositories, manage code, and collaborate with your team.
              </p>
            </div>
          </section>

          <section className="p-6 sm:p-8">
            <form
              className="grid min-h-[500px] content-center gap-4"
              onSubmit={async (event) => {
                event.preventDefault();
                const result = await state.login(
                  Object.fromEntries(new FormData(event.currentTarget)),
                  mode
                );
                if (result) router.replace("/dashboard");
              }}
            >
              <div>
                <p className="text-sm font-semibold uppercase text-[#57606a]">
                  {mode === "login" ? "Welcome back" : "Get started"}
                </p>
                <h2 className="mt-2 text-3xl font-bold">
                  {mode === "login" ? "Sign in to GitDaddy" : "Create your account"}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-md border border-[#d0d7de] bg-[#f6f8fa] p-1">
                <button
                  type="button"
                  className={
                    mode === "login"
                      ? "h-9 cursor-pointer rounded bg-white font-medium text-[#24292f] shadow-sm"
                      : "h-9 cursor-pointer font-medium text-[#57606a]"
                  }
                  onClick={() => setMode("login")}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={
                    mode === "register"
                      ? "h-9 cursor-pointer rounded bg-white font-medium text-[#24292f] shadow-sm"
                      : "h-9 cursor-pointer font-medium text-[#57606a]"
                  }
                  onClick={() => setMode("register")}
                >
                  Sign up
                </button>
              </div>

              <Input name="username" placeholder="Username" required />
              {mode === "register" ? <Input name="email" placeholder="Email (optional)" /> : null}
              <Input name="password" placeholder="Password" type="password" required />

              <button
                className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#1f883d] bg-[#1f883d] px-4 text-sm font-medium text-white hover:bg-[#1a7f37] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={state.busy}
                type="submit"
              >
                <Icon icon={ShieldKeyIcon} size={18} />
                <span>{mode === "login" ? "Sign in" : "Create account"}</span>
              </button>
              <Message>{state.message}</Message>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}
