"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { Can, hasPermission } from "@/lib/rbac";
import { Permission } from "@shared/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Project { id: string; name: string; description: string | null; status: string; }

export default function ProjectsPage() {
  const activeOrgId = useAuthStore((s) => s.activeOrgId)!;
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["projects", activeOrgId],
    queryFn: () =>
      api.get<{ items: Project[]; total: number; page: number; limit: number; totalPages: number }>("/api/projects", {
        organizationId: activeOrgId,
        params: { limit: 50 },
      }),
    enabled: !!activeOrgId,
  });

  const create = useMutation({
    mutationFn: () => api.post<Project>("/api/projects", { name, description: desc }, { organizationId: activeOrgId }),
    onSuccess: () => { setName(""); setDesc(""); setError(null); qc.invalidateQueries({ queryKey: ["projects", activeOrgId] }); },
    onError: (e: any) => setError(e?.message ?? "Failed to create project"),
  });

  const projects = data?.items ?? [];
  const canCreate = hasPermission(Permission.PROJECT_CREATE);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Projects</h1>

      <Can permission={Permission.PROJECT_CREATE}>
        <Card className="mb-4">
          <CardHeader><CardTitle className="text-base">New project</CardTitle></CardHeader>
          <CardContent className="flex gap-2 flex-wrap">
            <Input placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs" />
            <Input placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} className="max-w-sm" />
            <Button onClick={() => create.mutate()} disabled={!name.trim() || create.isPending}>Add</Button>
          </CardContent>
          {error && <p className="px-6 pb-4 text-sm text-destructive">{error}</p>}
        </Card>
      </Can>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Description</TableHead></TableRow></TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell><Badge variant="secondary">{p.status}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{p.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
