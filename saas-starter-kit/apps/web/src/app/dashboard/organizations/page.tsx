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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Organization {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
}

interface Member {
  id: string;
  userId: string;
  email: string;
  role: string;
  status: string;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export default function OrganizationsPage() {
  const activeOrgId = useAuthStore((s) => s.activeOrgId)!;
  const qc = useQueryClient();

  const { data: orgs } = useQuery({
    queryKey: ["organizations", "mine"],
    queryFn: () => api.get<Organization[]>("/api/organizations/mine"),
  });

  const { data: members } = useQuery({
    queryKey: ["organizations", activeOrgId, "members"],
    queryFn: () => api.get<Member[]>(`/api/organizations/${activeOrgId}/members`, { organizationId: activeOrgId }),
    enabled: !!activeOrgId,
  });

  const { data: workspaces } = useQuery({
    queryKey: ["organizations", activeOrgId, "workspaces"],
    queryFn: () => api.get<Workspace[]>(`/api/organizations/${activeOrgId}/workspaces`, { organizationId: activeOrgId }),
    enabled: !!activeOrgId,
  });

  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [wsName, setWsName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [selectedWsId, setSelectedWsId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const createOrg = useMutation({
    mutationFn: () => api.post<Organization>("/api/organizations", { name: createName, slug: createSlug }, { organizationId: activeOrgId }),
    onSuccess: () => { setCreateName(""); setCreateSlug(""); setError(null); qc.invalidateQueries({ queryKey: ["organizations", "mine"] }); },
    onError: (e: any) => setError(e?.message ?? "Failed to create organization"),
  });

  const inviteMember = useMutation({
    mutationFn: () => api.post(`/api/organizations/${activeOrgId}/members/invite`, { email: inviteEmail, role: inviteRole }, { organizationId: activeOrgId }),
    onSuccess: () => { setInviteEmail(""); setInviteRole("member"); setInviteSuccess(true); qc.invalidateQueries({ queryKey: ["organizations", activeOrgId, "members"] }); },
    onError: (e: any) => setError(e?.message ?? "Failed to invite"),
  });

  const createWorkspace = useMutation({
    mutationFn: () => api.post<Workspace>(`/api/organizations/${activeOrgId}/workspaces`, { name: wsName }, { organizationId: activeOrgId }),
    onSuccess: () => { setWsName(""); qc.invalidateQueries({ queryKey: ["organizations", activeOrgId, "workspaces"] }); },
    onError: (e: any) => setError(e?.message ?? "Failed to create workspace"),
  });

  const createTeam = useMutation({
    mutationFn: () => api.post(`/api/organizations/${activeOrgId}/teams`, { workspaceId: selectedWsId, name: teamName }, { organizationId: activeOrgId }),
    onSuccess: () => { setTeamName(""); setSelectedWsId(""); qc.invalidateQueries({ queryKey: ["organizations", activeOrgId, "workspaces"] }); },
    onError: (e: any) => setError(e?.message ?? "Failed to create team"),
  });

  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [editName, setEditName] = useState("");

  const updateOrg = useMutation({
    mutationFn: () => api.patch(`/api/organizations/${activeOrgId}`, { name: editName }, { organizationId: activeOrgId }),
    onSuccess: () => { setEditingOrg(null); qc.invalidateQueries({ queryKey: ["organizations", "mine"] }); },
  });

  const removeMember = useMutation({
    mutationFn: (mid: string) => api.del(`/api/organizations/${activeOrgId}/members/${mid}`, { organizationId: activeOrgId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["organizations", activeOrgId, "members"] }),
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Organizations</h1>

      <Card className="mb-4">
        <CardHeader><CardTitle className="text-base">My organizations</CardTitle></CardHeader>
        <CardContent>
          {!orgs || orgs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No organizations yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Slug</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {orgs.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.name}</TableCell>
                    <TableCell>{o.slug}</TableCell>
                    <TableCell><Badge variant={o.isActive ? "default" : "secondary"}>{o.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingOrg(o); setEditName(o.name); }}>Edit</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editingOrg && (
        <Card className="mb-4">
          <CardHeader><CardTitle className="text-base">Edit organization</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="max-w-sm" />
            <Button onClick={() => updateOrg.mutate()} disabled={updateOrg.isPending}>Save</Button>
            <Button variant="ghost" onClick={() => setEditingOrg(null)}>Cancel</Button>
          </CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardHeader><CardTitle className="text-base">Create organization</CardTitle></CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          <Input placeholder="Name" value={createName} onChange={(e) => setCreateName(e.target.value)} className="max-w-xs" />
          <Input placeholder="Slug" value={createSlug} onChange={(e) => setCreateSlug(e.target.value)} className="max-w-xs" />
          <Button onClick={() => createOrg.mutate()} disabled={!createName.trim() || createOrg.isPending}>Create</Button>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle className="text-base">Invite member</CardTitle></CardHeader>
        <CardContent className="flex gap-2 flex-wrap items-end">
          <Input placeholder="Email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="max-w-xs" />
          <Select value={inviteRole} onValueChange={setInviteRole}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => inviteMember.mutate()} disabled={!inviteEmail.trim() || inviteMember.isPending}>Invite</Button>
        </CardContent>
        {inviteSuccess && <p className="px-6 pb-4 text-sm text-green-600">Invitation sent.</p>}
      </Card>

      {members && members.length > 0 && (
        <Card className="mb-4">
          <CardHeader><CardTitle className="text-base">Members</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.email}</TableCell>
                    <TableCell><Badge variant="secondary">{m.role}</Badge></TableCell>
                    <TableCell>{m.status}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => removeMember.mutate(m.id)} disabled={removeMember.isPending}>Remove</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardHeader><CardTitle className="text-base">Workspaces</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {!workspaces || workspaces.length === 0 ? (
            <p className="text-sm text-muted-foreground">No workspaces yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Slug</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {workspaces.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell>{w.slug}</TableCell>
                    <TableCell><Badge variant={w.isActive ? "default" : "secondary"}>{w.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="flex gap-2">
            <Input placeholder="Workspace name" value={wsName} onChange={(e) => setWsName(e.target.value)} className="max-w-xs" />
            <Button onClick={() => createWorkspace.mutate()} disabled={!wsName.trim() || createWorkspace.isPending}>Add workspace</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Teams</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <Select value={selectedWsId} onValueChange={setSelectedWsId}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Select workspace" /></SelectTrigger>
              <SelectContent>
                {workspaces?.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Team name" value={teamName} onChange={(e) => setTeamName(e.target.value)} className="max-w-xs" />
            <Button onClick={() => createTeam.mutate()} disabled={!selectedWsId || !teamName.trim() || createTeam.isPending}>Add team</Button>
          </div>
        </CardContent>
      </Card>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
    </div>
  );
}
