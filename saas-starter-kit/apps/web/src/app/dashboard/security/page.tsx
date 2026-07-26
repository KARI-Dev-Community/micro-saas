"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function SecurityPage() {
  const activeOrgId = useAuthStore((s) => s.activeOrgId)!;
  const qc = useQueryClient();
  const [tab, setTab] = useState<"2fa" | "sessions" | "passkeys" | "password">("2fa");
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);

  const { data: sessions } = useQuery({
    queryKey: ["security", "sessions"],
    queryFn: () =>
      api.get<
        { id: string; deviceName: string | null; deviceType: string | null; browser: string | null; os: string | null; ipAddress: string | null; location: string | null; current: boolean; createdAt: string; expiresAt: string }[]
      >("/api/auth/security/sessions"),
    enabled: tab === "sessions",
    refetchInterval: 30000,
  });

  const { data: passkeys } = useQuery({
    queryKey: ["security", "passkeys"],
    queryFn: () => api.get<{ id: string; deviceName: string; createdAt: string; lastUsedAt: string | null }[]>("/api/auth/security/passkeys"),
    enabled: tab === "passkeys",
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);

  const enable2fa = useMutation({
    mutationFn: () => api.post<{ secret: string }>("/api/auth/security/2fa/enable", undefined, { organizationId: activeOrgId }),
    onSuccess: (r: any) => { setTwoFaEnabled(true); alert(`2FA enabled. Secret: ${r.secret}. Scan it in your authenticator app.`); },
  });

  const confirm2fa = useMutation({
    mutationFn: (code: string) => api.post("/api/auth/security/2fa/confirm", { code }, { organizationId: activeOrgId }),
    onSuccess: () => { setTwoFaEnabled(true); qc.invalidateQueries({ queryKey: ["security", "sessions"] }); qc.invalidateQueries({ queryKey: ["security", "passkeys"] }); },
  });

  const disable2fa = useMutation({
    mutationFn: () => api.post("/api/auth/security/2fa/disable", undefined, { organizationId: activeOrgId }),
    onSuccess: () => { setTwoFaEnabled(false); qc.invalidateQueries({ queryKey: ["security", "sessions"] }); qc.invalidateQueries({ queryKey: ["security", "passkeys"] }); },
  });

  const revokeSession = useMutation({
    mutationFn: (id: string) => api.del(`/api/auth/security/sessions/${id}`, { organizationId: activeOrgId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["security", "sessions"] }); },
  });

  const revokeOthers = useMutation({
    mutationFn: () => api.del("/api/auth/security/sessions", { organizationId: activeOrgId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["security", "sessions"] }); },
  });

  const removePasskey = useMutation({
    mutationFn: (id: string) => api.del(`/api/auth/security/passkeys/${id}`, { organizationId: activeOrgId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["security", "passkeys"] }); },
  });

  const changePassword = useMutation({
    mutationFn: () => api.post("/api/auth/change-password", { current: currentPassword, next: nextPassword }),
    onSuccess: () => { setCurrentPassword(""); setNextPassword(""); setPwError(null); },
    onError: (e: any) => setPwError(e?.message ?? "Failed"),
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Security</h1>

      <div className="flex gap-2 mb-4 border-b">
        {(["2fa", "sessions", "passkeys", "password"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm capitalize ${tab === t ? "border-b-2 border-foreground font-medium" : "text-muted-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "2fa" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Two-factor authentication</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Status: <Badge variant={twoFaEnabled ? "default" : "secondary"}>{twoFaEnabled ? "Enabled" : "Disabled"}</Badge>
            </p>
            {!twoFaEnabled ? (
              <Button onClick={() => enable2fa.mutate()} disabled={enable2fa.isPending}>Enable 2FA</Button>
            ) : (
              <div className="flex gap-2">
                <Input id="2fa-code" placeholder="Enter code to confirm" className="max-w-xs" />
                <Button onClick={() => { const code = (document.getElementById("2fa-code") as HTMLInputElement)?.value; if (code) confirm2fa.mutate(code); }} disabled={confirm2fa.isPending}>Confirm</Button>
                <Button variant="destructive" onClick={() => disable2fa.mutate()} disabled={disable2fa.isPending}>Disable 2FA</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "sessions" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Active sessions</CardTitle>
              <Button variant="outline" size="sm" onClick={() => revokeOthers.mutate()} disabled={revokeOthers.isPending}>Revoke others</Button>
            </div>
          </CardHeader>
          <CardContent>
            {!sessions || sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active sessions.</p>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Device</TableHead><TableHead>Browser</TableHead><TableHead>IP</TableHead><TableHead>Current</TableHead><TableHead>Expires</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {sessions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.deviceName ?? s.deviceType ?? "Unknown"}</TableCell>
                      <TableCell>{s.browser ?? "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{s.ipAddress ?? "-"}</TableCell>
                      <TableCell>{s.current ? <Badge variant="default">Current</Badge> : "-"}</TableCell>
                      <TableCell className="text-xs">{s.expiresAt ? new Date(s.expiresAt).toLocaleString() : "-"}</TableCell>
                      <TableCell>
                        {!s.current && (
                          <Button variant="ghost" size="sm" onClick={() => revokeSession.mutate(s.id)} disabled={revokeSession.isPending}>Revoke</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "passkeys" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Passkeys</CardTitle></CardHeader>
          <CardContent>
            {!passkeys || passkeys.length === 0 ? (
              <p className="text-sm text-muted-foreground">No passkeys registered.</p>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Device</TableHead><TableHead>Created</TableHead><TableHead>Last used</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {passkeys.map((pk) => (
                    <TableRow key={pk.id}>
                      <TableCell className="font-medium">{pk.deviceName}</TableCell>
                      <TableCell>{new Date(pk.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{pk.lastUsedAt ? new Date(pk.lastUsedAt).toLocaleString() : "Never"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => removePasskey.mutate(pk.id)} disabled={removePasskey.isPending}>Remove</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "password" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Change password</CardTitle></CardHeader>
          <CardContent className="space-y-3 max-w-sm">
            <Input type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            <Input type="password" placeholder="New password" value={nextPassword} onChange={(e) => setNextPassword(e.target.value)} />
            <Button onClick={() => changePassword.mutate()} disabled={!currentPassword || !nextPassword || changePassword.isPending}>
              {changePassword.isPending ? "Changing…" : "Change password"}
            </Button>
            {pwError && <p className="text-sm text-destructive">{pwError}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
