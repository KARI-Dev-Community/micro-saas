"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
type Form = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const { register, handleSubmit, formState } = useForm<Form>({ resolver: zodResolver(schema) });
  const [error, setError] = useState<string | null>(null);
  const [twoFactor, setTwoFactor] = useState<{ userId: string } | null>(null);

  async function onSubmit(values: Form) {
    setError(null);
    try {
      const res = await api.post<{ accessToken: string; refreshToken: string; expiresIn: number; user: any }>("/api/auth/login", values);
      if ((res as any).twoFactorRequired) {
        setTwoFactor({ userId: (res as any).userId });
        return;
      }
      const r = res as any;
      setSession({ accessToken: r.accessToken, refreshToken: r.refreshToken, expiresIn: r.expiresIn }, r.user, r.user.permissions ?? []);
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Login failed");
    }
  }

  return (
    <Card className="w-full max-w-sm mx-auto mt-20">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Welcome back to your workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...register("password")} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <div className="mt-4 flex justify-between text-sm">
          <a href="/forgot-password" className="text-muted-foreground hover:underline">Forgot password?</a>
          <a href="/register" className="text-muted-foreground hover:underline">Create account</a>
        </div>
        <div className="mt-4">
          <a href="/api/auth/google/login" className="block w-full text-center border rounded-md py-2 text-sm hover:bg-accent">
            Continue with Google
          </a>
        </div>
        {twoFactor && (
          <p className="mt-4 text-sm text-center text-muted-foreground">2FA required. Complete the TOTP step in the app.</p>
        )}
      </CardContent>
    </Card>
  );
}
