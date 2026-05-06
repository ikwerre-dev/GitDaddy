"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Add01Icon, BookOpen01Icon, CodeFolderIcon } from "@hugeicons/core-free-icons";
import { useGitDaddy } from "../../../hooks/useGitDaddy";
import { Icon } from "../../../components/Icon";
import { Button, Input, Message, Panel, Select } from "../../../components/ui";
import { TopNav } from "../../../components/TopNav";
import { Sidebar } from "../../../components/Sidebar";

export default function NewRepositoryPage() {
  const router = useRouter();
  const state = useGitDaddy();
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const parsedName = useMemo(() => parseRepoName(title), [title]);
  const repoName = name || parsedName;

  if (!state.token || !state.user) return null;

  return (
    <main className="min-h-screen bg-[#f7f8f4] font-['Space_Grotesk','Inter',ui-sans-serif,system-ui] text-[#1f2328]">
      <div className="flex min-h-screen">
        <Sidebar user={state.user} />
        <div className="min-w-0 flex-1">
          <TopNav user={state.user} onLogout={state.logout} />
          <section className="px-3 py-5 sm:px-5 lg:px-8">
            <Message>{state.message}</Message>
            <div className="mx-auto w-full max-w-3xl">
            <Panel className="relative overflow-hidden p-4 sm:p-8">
              <div className="absolute right-0 top-0 h-24 w-28 [background-image:radial-gradient(circle,#1f2328_1px,transparent_1px)] [background-size:9px_9px] opacity-20" aria-hidden="true" />
              <div className="relative z-10 mb-6 flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-md border border-neutral-950 bg-[#1f2328] text-white shadow-[2px_2px_0_#1f2328]">
                  <Icon icon={Add01Icon} size={20} />
                </div>
                <div>
                  <h1 className="text-2xl font-black">Create repository</h1>
                  <p className="mt-1 text-sm font-semibold text-neutral-500">
                    Add the repo title, description, visibility, and optional README commit.
                  </p>
                </div>
              </div>

              <form
                className="relative z-10 grid gap-5"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const data = Object.fromEntries(new FormData(event.currentTarget));
                  data.name = repoName;
                  delete data.title;
                  data.add_readme = data.add_readme === "on";
                  const created = await state.createRepo(data);
                  if (created) router.push(`/${state.owner}/${created.name}`);
                }}
              >
                <div className="grid gap-2">
                  <label className="text-sm font-black">Repository title</label>
                  <Input
                    className="h-10"
                    name="title"
                    placeholder="My Awesome Project"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                  />
                  <p className="text-xs font-semibold text-neutral-500">
                    Parsed name: <span className="font-black text-[#1f2328]">{repoName || "repository-name"}</span>
                  </p>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-black">Repository name</label>
                  <Input
                    className="h-10"
                    name="name"
                    placeholder={parsedName || "repository-name"}
                    value={name}
                    onChange={(event) => setName(parseRepoName(event.target.value))}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-black">Description</label>
                  <textarea
                    className="min-h-28 rounded-md border border-neutral-950 bg-white px-3 py-2 text-sm font-semibold outline-none shadow-[2px_2px_0_#1f2328] placeholder:text-neutral-400"
                    name="description"
                    placeholder="What is this repository for?"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-black">Visibility</label>
                  <Select name="visibility" defaultValue="private" className="h-10">
                    <option value="private">Private - Only you and collaborators can see it</option>
                    <option value="public">Public - Anyone can see it</option>
                  </Select>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-md border border-neutral-950 bg-[#f7f8f4] p-3 text-sm font-semibold shadow-[2px_2px_0_#1f2328]">
                  <input className="mt-1 h-4 w-4 accent-[#1f2328]" name="add_readme" type="checkbox" defaultChecked />
                  <span>
                    <span className="flex items-center gap-2 font-black">
                      <Icon icon={BookOpen01Icon} size={16} />
                      Add README commit
                    </span>
                    <span className="mt-1 block text-neutral-500">
                      Creates README.md and commits it to the main branch.
                    </span>
                  </span>
                </label>

                <div className="flex justify-end border-t border-neutral-950 pt-5">
                  <Button className="h-10 w-full sm:w-auto" disabled={state.busy || !repoName} type="submit" variant="primary">
                    <Icon icon={CodeFolderIcon} size={16} />
                    Create repository
                  </Button>
                </div>
              </form>
            </Panel>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function parseRepoName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
