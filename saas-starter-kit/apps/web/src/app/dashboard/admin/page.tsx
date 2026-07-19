"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AdminPage() {
  const activeOrgId = useAuthStore((s) => s.activeOrgId)!;
  const { data: stats } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => api.get<{ users: number; organizations: number; activeSubscriptions: number }>("/api/admin/stats"),
  });
  const { data: orgs } = useQuery({
    queryKey: ["admin", "orgs"],
    queryFn: () => api.get<any[]>("/api/admin/organizations"),
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Platform Admin</h1>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Users</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats?.users ?? "…"}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Organizations</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats?.organizations ?? "…"}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Active subs</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats?.activeSubscriptions ?? "…"}</CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Organizations</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Name</TableHead></TableRow></TableHeader>
            <TableBody>
              {(orgs ?? []).map((o) => (
                <TableRow key={o.id}><TableCell className="font-mono text-xs">{o.id}</TableCell><TableCell>{o.name}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
