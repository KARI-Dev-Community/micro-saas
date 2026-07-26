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

interface FileItem {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  visibility: string;
  url: string | null;
  createdAt: string;
}

export default function FilesPage() {
  const activeOrgId = useAuthStore((s) => s.activeOrgId)!;
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState("private");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["files", activeOrgId],
    queryFn: () => api.get<FileItem[]>("/api/files", { organizationId: activeOrgId }),
    enabled: !!activeOrgId,
  });

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) return;
      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      return api.post<FileItem>(
        "/api/files/upload",
        { base64, fileName: file.name, mimeType: file.type, sizeBytes: file.size, visibility },
        { organizationId: activeOrgId }
      );
    },
    onSuccess: () => {
      setFile(null);
      setError(null);
      qc.invalidateQueries({ queryKey: ["files", activeOrgId] });
    },
    onError: (e: any) => setError(e?.message ?? "Upload failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/api/files/${id}`, { organizationId: activeOrgId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files", activeOrgId] }),
  });

  const presign = useMutation({
    mutationFn: (id: string) => api.get<{ url: string }>(`/api/files/${id}/presign`, { organizationId: activeOrgId }),
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Files</h1>

      <Card className="mb-4">
        <CardHeader><CardTitle className="text-base">Upload file</CardTitle></CardHeader>
        <CardContent className="flex gap-2 flex-wrap items-end">
          <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="max-w-sm" />
          <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="border rounded-md px-2 py-1 text-sm">
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
          <Button onClick={() => upload.mutate()} disabled={!file || upload.isPending}>Upload</Button>
        </CardContent>
        {error && <p className="px-6 pb-4 text-sm text-destructive">{error}</p>}
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Size</TableHead><TableHead>Visibility</TableHead><TableHead>Uploaded</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {data.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.fileName}</TableCell>
                    <TableCell className="text-xs">{f.mimeType}</TableCell>
                    <TableCell className="text-xs">{(f.sizeBytes / 1024).toFixed(1)} KB</TableCell>
                    <TableCell><Badge variant={f.visibility === "public" ? "default" : "secondary"}>{f.visibility}</Badge></TableCell>
                    <TableCell className="text-xs">{new Date(f.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => presign.mutate(f.id)} disabled={presign.isPending}>Download</Button>
                      <Button variant="ghost" size="sm" onClick={() => remove.mutate(f.id)} disabled={remove.isPending}>Delete</Button>
                    </TableCell>
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
