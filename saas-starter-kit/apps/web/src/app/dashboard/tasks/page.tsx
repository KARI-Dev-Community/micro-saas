"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeId: string | null;
  dueDate: string | null;
}

export default function TasksPage() {
  const activeOrgId = useAuthStore((s) => s.activeOrgId)!;
  const qc = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [error, setError] = useState<string | null>(null);

  const { data: projectsData } = useQuery({
    queryKey: ["projects", activeOrgId],
    queryFn: () =>
      api.get<{ items: Project[] }>("/api/projects", { organizationId: activeOrgId, params: { limit: 100 } }),
    enabled: !!activeOrgId,
  });

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ["tasks", selectedProjectId],
    queryFn: () =>
      api.get<{ items: Task[] }>(`/api/projects/${selectedProjectId}/tasks`, { organizationId: activeOrgId, params: { limit: 100 } }),
    enabled: !!selectedProjectId,
  });

  const createTask = useMutation({
    mutationFn: () =>
      api.post<Task>(`/api/projects/${selectedProjectId}/tasks`, { title: newTitle, description: newDesc, priority: newPriority }, { organizationId: activeOrgId }),
    onSuccess: () => {
      setNewTitle("");
      setNewDesc("");
      setError(null);
      qc.invalidateQueries({ queryKey: ["tasks", selectedProjectId] });
    },
    onError: (e: any) => setError(e?.message ?? "Failed to create task"),
  });

  const projects = projectsData?.items ?? [];
  const tasks = tasksData?.items ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Tasks</h1>

      <div className="mb-4">
        <label className="text-sm font-medium mb-1 block">Project</label>
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-full max-w-sm">
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedProjectId && (
        <>
          <Card className="mb-4">
            <CardHeader><CardTitle className="text-base">New task</CardTitle></CardHeader>
            <CardContent className="flex gap-2 flex-wrap">
              <Input placeholder="Task title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="max-w-xs" />
              <Input placeholder="Description (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="max-w-sm" />
              <Select value={newPriority} onValueChange={setNewPriority}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => createTask.mutate()} disabled={!newTitle.trim() || createTask.isPending}>Add</Button>
            </CardContent>
            {error && <p className="px-6 pb-4 text-sm text-destructive">{error}</p>}
          </Card>

          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks yet.</p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="text-sm font-medium">{t.title}</p>
                        {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{t.status}</Badge>
                        <Badge variant="outline">{t.priority}</Badge>
                        {t.dueDate && <span className="text-xs text-muted-foreground">{new Date(t.dueDate).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
