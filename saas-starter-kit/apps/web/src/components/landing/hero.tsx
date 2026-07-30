import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28 lg:py-36">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-sm font-medium text-secondary-foreground mb-8">
          <span className="text-primary">★</span> Production-ready from day one
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1]">
          Build your multi-tenant SaaS{" "}
          <span className="text-primary">in days</span>, not months.
        </h1>

        <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground leading-relaxed">
          The starter kit with auth, RBAC, billing, AI, and project management
          — scoped to every organization out of the box.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register">
            <Button size="lg" className="w-full sm:w-auto">
              Start free trial
            </Button>
          </Link>
          <Link href="https://github.com/kariDev/saas-starter-kit">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              View docs
            </Button>
          </Link>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          No credit card required. Free for individuals.
        </p>
      </div>
    </section>
  );
}
