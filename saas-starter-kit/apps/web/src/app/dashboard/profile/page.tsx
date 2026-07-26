"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ProfilePage() {
  const activeOrgId = useAuthStore((s) => s.activeOrgId)!;
  const qc = useQueryClient();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => api.get<{ firstName: string | null; lastName: string | null; phone: string | null }>("/api/users/me/profile"),
  });

  const update = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      api.patch("/api/users/me/profile", patch, { organizationId: activeOrgId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", "me"] });
      setError(null);
    },
    onError: (e: any) => setError(e?.message ?? "Failed to update profile"),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Profile</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Your profile</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="First name" defaultValue={data?.firstName ?? ""} onChange={(e) => setFirst(e.target.value)} />
            <Input placeholder="Last name" defaultValue={data?.lastName ?? ""} onChange={(e) => setLast(e.target.value)} />
          </div>
          <Input placeholder="Phone" defaultValue={data?.phone ?? ""} onChange={(e) => setPhone(e.target.value)} />
          <Button onClick={() => update.mutate({ firstName: first || null, lastName: last || null, phone: phone || null })}>
            Save
          </Button>
          {error && <p className="px-6 pb-4 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
