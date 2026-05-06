"use client";

export const apiBase = process.env.NEXT_PUBLIC_GITDADDY_API_URL || "http://localhost:8080";
export const tokenKey = "gitdaddy_token";
export const userKey = "gitdaddy_user";

export async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  const response = await fetch(`${apiBase}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const gitdaddyApi = {
  register: (body) => request("/api/register", { method: "POST", body }),
  login: (body) => request("/api/login", { method: "POST", body }),
  logout: (token) => request("/api/logout", { method: "POST", token }),
  stats: (token) => request("/api/stats", { token }),
  repos: (token) => request("/api/repos", { token }),
  createRepo: (token, body) => request("/api/repos", { method: "POST", token, body }),
  repo: (token, owner, repo) => request(`/api/repos/${owner}/${repo}`, { token }),
  updateRepo: (token, owner, repo, body) => request(`/api/repos/${owner}/${repo}`, { method: "PATCH", token, body }),
  deleteRepo: (token, owner, repo) => request(`/api/repos/${owner}/${repo}`, { method: "DELETE", token }),
  branches: (token, owner, repo) => request(`/api/repos/${owner}/${repo}/branches`, { token }),
  createBranch: (token, owner, repo, body) => request(`/api/repos/${owner}/${repo}/branches`, { method: "POST", token, body }),
  commits: (token, owner, repo, ref = "HEAD") => request(`/api/repos/${owner}/${repo}/commits?ref=${encodeURIComponent(ref)}`, { token }),
  tree: (token, owner, repo, ref = "HEAD", path = "") =>
    request(`/api/repos/${owner}/${repo}/tree?ref=${encodeURIComponent(ref)}&path=${encodeURIComponent(path)}`, { token }),
  file: (token, owner, repo, ref = "HEAD", path = "") =>
    request(`/api/repos/${owner}/${repo}/file?ref=${encodeURIComponent(ref)}&path=${encodeURIComponent(path)}`, { token }),
  diff: (token, owner, repo, commit) => request(`/api/repos/${owner}/${repo}/diff?commit=${encodeURIComponent(commit)}`, { token }),
  repoStats: (token, owner, repo) => request(`/api/repos/${owner}/${repo}/stats`, { token }),
  pulls: (token, owner, repo) => request(`/api/repos/${owner}/${repo}/pulls`, { token }),
  createPull: (token, owner, repo, body) => request(`/api/repos/${owner}/${repo}/pulls`, { method: "POST", token, body }),
};
