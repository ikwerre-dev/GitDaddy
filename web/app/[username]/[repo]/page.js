"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Repository } from "../../../components/Repository";
import { useGitDaddy } from "../../../hooks/useGitDaddy";
import { TopNav } from "../../../components/TopNav";
import { Sidebar } from "../../../components/Sidebar";
import Link from "next/link";

export default function RepoPage() {
  const params = useParams();
  const state = useGitDaddy();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // Find and select the repo based on URL params
    if (state.token && state.user && params.username && params.repo && state.repos.length > 0) {
      const repo = state.repos.find((r) => r.name === params.repo);
      if (repo && state.selected?.name !== repo.name) {
        state.chooseRepo(repo);
        setNotFound(false);
      } else if (!repo) {
        setNotFound(true);
      }
    }
  }, [params.username, params.repo, state.token, state.user, state.repos]);

  if (!state.token || !state.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fa]">
        <p className="text-[#57606a]">Loading...</p>
      </div>
    );
  }

  const repo = state.repoDetail || state.selected;

  if (notFound) {
    return (
      <main className="min-h-screen bg-[#f6f8fa]">
        <TopNav user={state.user} onLogout={state.logout} />
        <div className="flex min-h-[calc(100vh-64px)]">
          <Sidebar state={state} />
          <section className="flex-1 px-4 py-6 lg:px-8">
            <div className="mx-auto max-w-[1280px]">
              <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
                <div className="text-8xl">🔍</div>
                <h1 className="mt-6 text-3xl font-bold">Repository not found</h1>
                <p className="mt-3 text-lg text-[#57606a]">
                  The repository <strong>{params.username}/{params.repo}</strong> doesn't exist or you don't have access to view it.
                </p>
                <div className="mt-6 flex gap-3">
                  <Link
                    href={`/${params.username}`}
                    className="inline-flex h-10 items-center justify-center rounded-md border border-[#d0d7de] bg-white px-4 text-sm font-medium hover:bg-[#f6f8fa]"
                  >
                    View {params.username}'s profile
                  </Link>
                  <Link
                    href="/dashboard"
                    className="inline-flex h-10 items-center justify-center rounded-md border border-[#0969da] bg-[#0969da] px-4 text-sm font-medium text-white hover:bg-[#0860ca]"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!repo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fa]">
        <div className="text-center">
          <p className="text-lg text-[#57606a]">Loading repository...</p>
        </div>
      </div>
    );
  }

  return <Repository state={state} repo={repo} username={params.username} />;
}
