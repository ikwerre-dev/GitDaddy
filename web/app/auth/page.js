"use client";

import { AuthPage } from "../../components/AuthPage";
import { useGitDaddy } from "../../hooks/useGitDaddy";

export default function Page() {
  const state = useGitDaddy();
  return <AuthPage state={state} />;
}
