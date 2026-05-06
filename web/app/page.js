"use client";

import { Dashboard } from "../components/Dashboard";
import { LandingPage } from "../components/LandingPage";
import { useGitDaddy } from "../hooks/useGitDaddy";

export default function Home() {
  const state = useGitDaddy();

  if (!state.token || !state.user) {
    return <LandingPage />;
  }

  return <Dashboard state={state} />;
}
