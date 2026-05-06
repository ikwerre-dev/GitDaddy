"use client";

import { Dashboard } from "../../components/Dashboard";
import { useGitDaddy } from "../../hooks/useGitDaddy";

export default function DashboardPage() {
  const state = useGitDaddy();

  if (!state.token || !state.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fa]">
        <p className="text-[#57606a]">Loading...</p>
      </div>
    );
  }

  return <Dashboard state={state} />;
}
