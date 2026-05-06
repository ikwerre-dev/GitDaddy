"use client";

import { useParams } from "next/navigation";
import { UserProfile } from "../../components/UserProfile";
import { useGitDaddy } from "../../hooks/useGitDaddy";

export default function UserProfilePage() {
  const params = useParams();
  const state = useGitDaddy();

  if (!state.token || !state.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fa]">
        <p className="text-[#57606a]">Loading...</p>
      </div>
    );
  }

  return <UserProfile state={state} username={params.username} />;
}
