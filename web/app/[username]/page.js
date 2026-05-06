"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { UserProfile } from "../../components/UserProfile";
import { useGitDaddy } from "../../hooks/useGitDaddy";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const state = useGitDaddy();

  useEffect(() => {
    if (!state.token || !state.user) {
      router.replace("/auth");
    }
  }, [state.token, state.user, router]);

  if (!state.token || !state.user) {
    return null;
  }

  return <UserProfile state={state} username={params.username} />;
}
