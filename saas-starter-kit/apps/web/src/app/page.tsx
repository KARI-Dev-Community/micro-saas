import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="max-w-3xl mx-auto text-center py-24">
      <h1 className="text-4xl font-bold tracking-tight">Ship your multi-tenant SaaS fast</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        NestJS + Next.js starter kit with auth, RBAC, billing, AI, and more.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/register"><Button>Start free</Button></Link>
        <Link href="/login"><Button variant="outline">Sign in</Button></Link>
      </div>
    </main>
  );
}
