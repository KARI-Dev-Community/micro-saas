"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";

function OAuthCallbackInner() {
  const router = useRouter();
  const params = new URLSearchParams(globalThis.location?.search ?? "");
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    const access = params.get("access");
    const refresh = params.get("refresh");
    if (!access || !refresh) {
      router.push("/login?error=oauth");
      return;
    }

    api
      .get<{ id: string; email: string; permissions: string[] }>("/api/auth/me")
      .then((me) => {
        setSession({ accessToken: "", refreshToken: "", expiresIn: 900 }, { id: me.id, email: me.email }, me.permissions ?? []);
        router.push("/dashboard");
      })
      .catch(() => router.push("/login?error=oauth"));
  }, [params, router, setSession]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-sm text-muted-foreground">Completing sign-in…</p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-sm text-muted-foreground">Loading…</p></div>}>
      <OAuthCallbackInner />
    </Suspense>
  );
}
