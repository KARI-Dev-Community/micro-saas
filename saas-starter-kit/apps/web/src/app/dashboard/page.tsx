"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardOverview() {
  const activeOrgId = useAuthStore((s) => s.activeOrgId)!;
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "org", activeOrgId],
    queryFn: () => api.get<{ projects: number; tasks: number; openTasks: number }>("/api/dashboard/org", { organizationId: activeOrgId }),
    enabled: !!activeOrgId,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Projects</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{isLoading ? "…" : data?.projects ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Tasks</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{isLoading ? "…" : data?.tasks ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Open tasks</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{isLoading ? "…" : data?.openTasks ?? 0}</CardContent></Card>
      </div>
    </div>
  );
}
