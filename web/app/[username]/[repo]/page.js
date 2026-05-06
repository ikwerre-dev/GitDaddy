"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Repository } from "../../../components/Repository";
import { TopNav } from "../../../components/TopNav";
import { useGitDaddy } from "../../../hooks/useGitDaddy";
import { gitdaddyApi } from "../../../lib/api";

export default function RepoPage() {
  const params = useParams();
  const sessionState = useGitDaddy();
  const [publicData, setPublicData] = useState({
    repo: null,
    branches: [],
    commits: [],
    tree: [],
    pulls: [],
    repoStats: null,
    filePreview: null,
    diffPreview: null,
    ref: "HEAD",
    path: "",
    activeTab: "code",
    message: "",
    notFound: false,
  });

  useEffect(() => {
    let active = true;
    async function load() {
      const requestToken = sessionState.token || "";
      try {
        const [detail, branchData, commitData, treeData, stats, pullData] = await Promise.all([
          gitdaddyApi.repo(requestToken, params.username, params.repo),
          gitdaddyApi.branches(requestToken, params.username, params.repo),
          gitdaddyApi.commits(requestToken, params.username, params.repo, publicData.ref || "HEAD"),
          gitdaddyApi.tree(requestToken, params.username, params.repo, publicData.ref || "HEAD", publicData.path || ""),
          gitdaddyApi.repoStats(requestToken, params.username, params.repo),
          gitdaddyApi.pulls(requestToken, params.username, params.repo).catch(() => []),
        ]);
        if (!active) return;
        const branches = Array.isArray(branchData) ? branchData : [];
        const defaultRef = branches.find((branch) => branch.current)?.name || branches[0]?.name || "HEAD";
        setPublicData((current) => ({
          ...current,
          repo: detail.repository,
          branches,
          commits: Array.isArray(commitData) ? commitData : [],
          tree: Array.isArray(treeData) ? treeData : [],
          pulls: Array.isArray(pullData) ? pullData : [],
          repoStats: stats,
          ref: current.ref === "HEAD" ? defaultRef : current.ref,
          notFound: false,
          message: "",
        }));
      } catch (error) {
        if (active) setPublicData((current) => ({ ...current, notFound: true, message: error.message }));
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [params.username, params.repo, publicData.ref, publicData.path, sessionState.token]);

  const publicState = useMemo(() => ({
    ...sessionState,
    activeTab: publicData.activeTab,
    branches: publicData.branches,
    commits: publicData.commits,
    collaborators: [],
    diffPreview: publicData.diffPreview,
    filePreview: publicData.filePreview,
    message: publicData.message || sessionState.message,
    owner: params.username,
    path: publicData.path,
    pulls: publicData.pulls,
    ref: publicData.ref,
    repoStats: publicData.repoStats,
    selected: publicData.repo,
    tree: publicData.tree,
    user: sessionState.user,
    changeRef: async (nextRef) => setPublicData((current) => ({ ...current, ref: nextRef, path: "" })),
    commitFile: async (formData) => {
      try {
        const commit = await gitdaddyApi.commitFile(sessionState.token || "", params.username, params.repo, {
          path: formData.path,
          content: formData.content,
          message: formData.message,
          branch: formData.branch || publicData.ref || "main",
        });
        setPublicData((current) => ({
          ...current,
          message: `Committed ${commit.hash.slice(0, 7)}`,
          filePreview: null,
        }));
        return commit;
      } catch (error) {
        setPublicData((current) => ({ ...current, message: error.message }));
        return null;
      }
    },
    openEntry: async (entry) => {
      if (entry.type === "tree") {
        setPublicData((current) => ({ ...current, path: entry.path }));
        return;
      }
      try {
        const result = await gitdaddyApi.file(sessionState.token || "", params.username, params.repo, publicData.ref || "HEAD", entry.path);
        setPublicData((current) => ({ ...current, filePreview: { path: entry.path, content: result.content } }));
      } catch (error) {
        setPublicData((current) => ({ ...current, message: error.message }));
      }
    },
    openDiff: async (commit) => {
      try {
        const result = await gitdaddyApi.diff(sessionState.token || "", params.username, params.repo, commit.hash);
        setPublicData((current) => ({ ...current, diffPreview: { hash: commit.hash, diff: result.diff } }));
      } catch (error) {
        setPublicData((current) => ({ ...current, message: error.message }));
      }
    },
    setActiveTab: (tab) => setPublicData((current) => ({ ...current, activeTab: tab })),
    setDiffPreview: (value) => setPublicData((current) => ({ ...current, diffPreview: value })),
    setFilePreview: (value) => setPublicData((current) => ({ ...current, filePreview: value })),
    upPath: async () => setPublicData((current) => ({ ...current, path: current.path.split("/").slice(0, -1).join("/") })),
  }), [sessionState, publicData, params.username, params.repo]);

  if (publicData.notFound) {
    return (
      <main className="min-h-screen bg-[#f7f8f4]">
        <TopNav user={sessionState.user} onLogout={sessionState.logout} />
        <section className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 text-center">
          <div>
            <h1 className="text-3xl font-black">Repository not found</h1>
            <p className="mt-3 text-neutral-600">
              {params.username}/{params.repo} is private, missing, or unavailable.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (!publicData.repo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8f4]">
        <p className="font-semibold text-neutral-500">Loading repository...</p>
      </div>
    );
  }

  return <Repository state={publicState} repo={publicData.repo} username={params.username} />;
}
