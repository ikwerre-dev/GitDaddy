"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Repository } from "../../../components/Repository";
import { useGitDaddy } from "../../../hooks/useGitDaddy";

export default function RepoPage() {
  const params = useParams();
  const router = useRouter();
  const state = useGitDaddy();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    if (!hasCheckedAuth && !state.token && !state.user) {
      setHasCheckedAuth(true);
      router.push("/auth");
      return;
    }

    // Find and select the repo based on URL params
    if (state.token && state.user && params.username && params.repo && state.repos.length > 0) {
      const repo = state.repos.find((r) => r.name === params.repo);
      if (repo && state.selected?.name !== repo.name) {
        state.chooseRepo(repo);
      }
    }
  }, [params.username, params.repo, state.token, state.user, state.repos, router, hasCheckedAuth]);

  if (!state.token || !state.user) {
    return null;
  }

  const repo = state.repoDetail || state.selected;

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
