"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});
type Form = z.infer<typeof schema>;

export function RegisterForm() {
  const router = useRouter();
  const { register, handleSubmit, formState } = useForm<Form>({ resolver: zodResolver(schema) });
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(values: Form) {
    setError(null);
    try {
      await api.post("/api/auth/register", values);
      router.push("/login?registered=1");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Registration failed");
    }
  }

  return (
    <Card className="w-full max-w-sm mx-auto mt-16">
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>Start your free trial.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" {...register("firstName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" {...register("lastName")} />
            </div>
          </div>
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
            {formState.isSubmitting ? "Creating…" : "Create account"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-center text-muted-foreground">
          Already have an account? <a href="/login" className="hover:underline">Sign in</a>
        </p>
      </CardContent>
    </Card>
  );
}

