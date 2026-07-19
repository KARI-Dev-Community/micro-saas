"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string | Date;
}

interface ProjectsPanelProps {
  initialProjects: Project[];
  initialLimit: number | null;
  plan: "free" | "pro";
}

export function ProjectsPanel({
  initialProjects,
  initialLimit,
  plan,
}: ProjectsPanelProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const limit = plan === "pro" ? null : initialLimit;
  const atLimit = limit !== null && projects.length >= limit;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (atLimit) {
      setError(
        `Free plan is limited to ${limit} projects. Upgrade to Pro for unlimited.`
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setLoading(false);
        return;
      }

      setProjects((prev) => [data.project, ...prev]);
      setName("");
      setDescription("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 border border-gray-200 rounded-2xl p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold">Your projects</h2>
          <p className="mt-1 text-sm text-gray-600">
            {plan === "pro"
              ? "Pro plan — unlimited projects."
              : `Free plan — ${projects.length}${
                  limit !== null ? ` / ${limit}` : ""
                } projects used.`}
          </p>
        </div>
        {plan !== "pro" && (
          <span className="text-xs font-medium bg-brand/10 text-brand px-2.5 py-1 rounded-full">
            Free tier
          </span>
        )}
      </div>

      <form onSubmit={handleCreate} className="mt-4 flex flex-col sm:flex-row gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
          maxLength={255}
          disabled={atLimit}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-60"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          disabled={atLimit}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || atLimit || !name.trim()}
          className="bg-brand text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-dark transition-colors disabled:opacity-60 whitespace-nowrap"
        >
          {loading ? "Adding…" : "Add project"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {atLimit && plan !== "pro" && (
        <p className="mt-3 text-sm text-gray-600">
          You&apos;ve reached the free limit.{" "}
          <a href="#pricing" className="text-brand font-medium hover:underline">
            Upgrade to Pro
          </a>{" "}
          for unlimited projects.
        </p>
      )}

      <ul className="mt-5 divide-y divide-gray-100">
        {projects.length === 0 && (
          <li className="py-6 text-center text-sm text-gray-500">
            No projects yet. Create your first one above.
          </li>
        )}
        {projects.map((project) => (
          <li key={project.id} className="py-3">
            <p className="font-medium">{project.name}</p>
            {project.description && (
              <p className="text-sm text-gray-600">{project.description}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
