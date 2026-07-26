"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsPage() {
  const activeOrgId = useAuthStore((s) => s.activeOrgId)!;

  const { data: revenue, isLoading: revenueLoading } = useQuery({
    queryKey: ["analytics", "revenue", activeOrgId],
    queryFn: () => api.get<any>("/api/dashboard/revenue", { organizationId: activeOrgId }),
    enabled: !!activeOrgId,
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["analytics", "users", activeOrgId],
    queryFn: () => api.get<any>("/api/dashboard/users", { organizationId: activeOrgId }),
    enabled: !!activeOrgId,
  });

  const { data: aiSpend, isLoading: aiLoading } = useQuery({
    queryKey: ["analytics", "ai-spend", activeOrgId],
    queryFn: () => api.get<any>("/api/dashboard/ai-spend", { organizationId: activeOrgId }),
    enabled: !!activeOrgId,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Analytics</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Revenue</CardTitle></CardHeader>
          <CardContent>
            {revenueLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <div className="text-2xl font-bold">
                {typeof revenue?.mrr === "number" ? `$${(revenue.mrr / 100).toFixed(2)}` : revenue?.mrr ?? "—"}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">{revenue?.currency ?? ""}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Users</CardTitle></CardHeader>
          <CardContent>
            {usersLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <div className="text-2xl font-bold">{users?.activeUsers ?? users?.total ?? "—"}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Active this period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">AI spend</CardTitle></CardHeader>
          <CardContent>
            {aiLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <div className="text-2xl font-bold">
                {typeof aiSpend?.totalCost === "number" ? `$${aiSpend.totalCost.toFixed(2)}` : "—"}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">{aiSpend?.requests ?? 0} requests</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
