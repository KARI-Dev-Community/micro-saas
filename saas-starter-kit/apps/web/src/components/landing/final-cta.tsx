import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingCta() {
  return (
    <section className="py-20 sm:py-28 bg-primary text-primary-foreground">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Ready to ship your SaaS?
        </h2>
        <p className="mt-4 text-lg text-primary-foreground/80">
          Start with the Free plan today. No credit card. Upgrade when you&apos;re ready.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register">
            <Button variant="secondary" size="lg">
              Get started free
            </Button>
          </Link>
          <Link href="mailto:hello@saas.dev">
            <Button
              variant="outline"
              size="lg"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
            >
              Talk to sales
            </Button>
          </Link>
        </div>
        <p className="mt-6 text-sm text-primary-foreground/60">
          14-day free trial on Pro. Cancel anytime.
        </p>
      </div>
    </section>
  );
}