"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  id: string;
  title: string;
  body: string | null;
  entityType: string;
  module: string;
}

export default function SearchPage() {
  const activeOrgId = useAuthStore((s) => s.activeOrgId)!;
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["search", activeOrgId, query],
    queryFn: () =>
      api.get<{ items: SearchResult[]; total: number }>("/api/search/global", {
        organizationId: activeOrgId,
        params: { q: query, limit: 50 },
      }),
    enabled: !!activeOrgId && query.trim().length > 0,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Search</h1>
      <div className="mb-4">
        <Input
          placeholder="Search projects, tasks, files…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Searching…</p>
          ) : !query.trim() ? (
            <p className="text-sm text-muted-foreground">Type something to search across your workspace.</p>
          ) : !data || data.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No results found.</p>
          ) : (
            <div className="space-y-2">
              {data.items.map((item) => (
                <div key={item.id} className="rounded-md border p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{item.title}</span>
                    <Badge variant="secondary" className="text-xs">{item.module}</Badge>
                    <Badge variant="outline" className="text-xs">{item.entityType}</Badge>
                  </div>
                  {item.body && <p className="text-sm text-muted-foreground line-clamp-2">{item.body}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
