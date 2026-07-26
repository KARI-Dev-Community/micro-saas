"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Suspense } from "react";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8),
});
type Form = z.infer<typeof schema>;

function ResetPasswordInner() {
  const router = useRouter();
  const params = new URLSearchParams(globalThis.location?.search ?? "");
  const { register, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { token: params.get("token") ?? "" },
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(values: Form) {
    setError(null);
    try {
      await api.post("/api/auth/reset-password", values);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Reset failed");
    }
  }

  return (
    <Card className="w-full max-w-sm mx-auto mt-20">
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>Enter the code from your email and choose a new password.</CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <p className="text-sm text-green-600">Password updated. Redirecting to login…</p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Reset token</Label>
              <Input id="token" {...register("token")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" {...register("password")} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? "Resetting…" : "Reset password"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-sm text-muted-foreground">Loading…</p></div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
