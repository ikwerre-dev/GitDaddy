"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { UserProfile } from "../../components/UserProfile";
import { useGitDaddy } from "../../hooks/useGitDaddy";
import { gitdaddyApi } from "../../lib/api";

export default function UserProfilePage() {
  const params = useParams();
  const state = useGitDaddy();
  const [publicRepos, setPublicRepos] = useState([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    gitdaddyApi.publicUserRepos(params.username)
      .then((result) => {
        if (!active) return;
        setPublicRepos(Array.isArray(result.repositories) ? result.repositories : []);
        setNotFound(false);
      })
      .catch(() => {
        if (active) setNotFound(true);
      });
    return () => {
      active = false;
    };
  }, [params.username]);

  return <UserProfile state={state} username={params.username} publicRepos={publicRepos} notFound={notFound} />;
}
