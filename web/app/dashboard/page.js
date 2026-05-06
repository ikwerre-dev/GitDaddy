"use client";

import { Dashboard } from "../../components/Dashboard";
import { useGitDaddy } from "../../hooks/useGitDaddy";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const state = useGitDaddy();
  const router = useRouter();

  useEffect(() => {
    if (!state.token || !state.user) {
      router.replace("/auth");
    }
  }, [state.token, state.user, router]);

  if (!state.token || !state.user) {
    return null;
  }

  return <Dashboard state={state} />;
}
