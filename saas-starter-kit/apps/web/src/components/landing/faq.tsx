"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "What exactly do I get with the starter kit?",
    a: "A fully scaffolded multi-tenant SaaS app: NestJS API with auth (JWT + 2FA), RBAC, project/task management, billing (Stripe), AI chat integration, file uploads, audit logging, BullMQ background jobs, and a Next.js dashboard frontend. It includes Docker Compose for local development and production deployment guidance.",
  },
  {
    q: "Can I use this for a client project?",
    a: "Yes. The starter kit is designed to be customized. You own the code and can extend it with your own modules, themes, and business logic. The license permits commercial use.",
  },
  {
    q: "How does the free plan work?",
    a: "The Free plan covers unlimited individual use with up to 3 projects and 1 organization. It includes the full feature set — the limits are just organizational caps, not technical ones.",
  },
  {
    q: "Do I need to know NestJS or Next.js to use this?",
    a: "Familiarity with TypeScript and React/NestJS helps, but the kit is designed to be approachable. Every module is documented with the templates in the AGENTS.md and docs/ directory. You can extend it by copying the module template patterns.",
  },
  {
    q: "What payment methods do you accept?",
    a: "Pro and Enterprise plans are billed via Stripe. You can manage subscriptions, apply coupons, and view invoices from the dashboard billing page. The Free plan requires no payment method.",
  },
];

export function LandingFaq() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section id="faq" className="py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need to know before signing up.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((f) => {
            const isOpen = open === f.q;
            return (
              <div key={f.q} className="rounded-lg border bg-card">
                <button
                  className="flex w-full items-center justify-between p-5 text-left"
                  onClick={() => setOpen(isOpen ? null : f.q)}
                  aria-expanded={isOpen}
                >
                  <span className="font-medium pr-4">{f.q}</span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5">
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}