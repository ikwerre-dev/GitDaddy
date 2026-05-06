"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UserProfile } from "../../components/UserProfile";
import { useGitDaddy } from "../../hooks/useGitDaddy";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const state = useGitDaddy();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    if (!hasCheckedAuth && !state.token && !state.user) {
      setHasCheckedAuth(true);
      router.push("/auth");
    }
  }, [state.token, state.user, router, hasCheckedAuth]);

  if (!state.token || !state.user) {
    return null;
  }

  return <UserProfile state={state} username={params.username} />;
}
