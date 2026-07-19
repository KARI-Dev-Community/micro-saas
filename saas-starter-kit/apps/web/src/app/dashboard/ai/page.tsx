"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/input";

export default function AiPage() {
  const activeOrgId = useAuthStore((s) => s.activeOrgId)!;
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState("");

  const chat = useMutation({
    mutationFn: () => api.post<{ reply: string }>("/api/ai/chat", { prompt }, { organizationId: activeOrgId }),
    onSuccess: (r) => { setReply(r.reply); setPrompt(""); },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">AI Assistant</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Chat</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {reply && <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">{reply}</div>}
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ask anything…" className="min-h-24" />
          <Button onClick={() => chat.mutate()} disabled={!prompt.trim() || chat.isPending}>
            {chat.isPending ? "Thinking…" : "Send"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
