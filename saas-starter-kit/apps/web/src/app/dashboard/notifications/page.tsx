"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Notification {
  id: string;
  title: string;
  body: string | null;
  status: string;
  category: string | null;
  link: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const activeOrgId = useAuthStore((s) => s.activeOrgId)!;
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", activeOrgId],
    queryFn: () => api.get<Notification[]>("/api/notifications", { organizationId: activeOrgId }),
    enabled: !!activeOrgId,
    refetchInterval: 30000,
  });

  const unreadCountQuery = useQuery({
    queryKey: ["notifications", "unread-count", activeOrgId],
    queryFn: () => api.get<{ count: number }>("/api/notifications/unread-count", { organizationId: activeOrgId }),
    enabled: !!activeOrgId,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/api/notifications/${id}/read`, undefined, { organizationId: activeOrgId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications", activeOrgId] }); qc.invalidateQueries({ queryKey: ["notifications", "unread-count", activeOrgId] }); },
  });

  const markAllRead = useMutation({
    mutationFn: () => api.post("/api/notifications/read-all", undefined, { organizationId: activeOrgId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications", activeOrgId] }); qc.invalidateQueries({ queryKey: ["notifications", "unread-count", activeOrgId] }); },
  });

  const notifications = data ?? [];
  const unread = unreadCountQuery.data?.count ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{unread} unread</span>
          <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()} disabled={unread === 0 || markAllRead.isPending}>
            Mark all read
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start justify-between rounded-md border p-3 ${n.status === "unread" ? "bg-muted/50" : ""}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.category && <Badge variant="secondary" className="text-xs">{n.category}</Badge>}
                    </div>
                    {n.body && <p className="text-sm text-muted-foreground mt-1">{n.body}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {n.link && (
                      <a href={n.link} className="text-xs text-blue-600 hover:underline">
                        Open
                      </a>
                    )}
                    {n.status === "unread" && (
                      <Button variant="ghost" size="sm" onClick={() => markRead.mutate(n.id)} disabled={markRead.isPending}>
                        Read
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
