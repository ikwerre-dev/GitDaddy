"use client";

import { LandingPage } from "../components/LandingPage";
import { useGitDaddy } from "../hooks/useGitDaddy";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const state = useGitDaddy();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Only redirect once when both token and user are available
    if (state.token && state.user && !hasRedirected) {
      setHasRedirected(true);
      router.push("/dashboard");
    }
  }, [state.token, state.user, hasRedirected, router]);

  return <LandingPage />;
}
