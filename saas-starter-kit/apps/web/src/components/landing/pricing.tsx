"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/forever",
    description: "For individuals evaluating the kit",
    features: [
      "Up to 3 projects",
      "1 organization",
      "Auth + user management",
      "Community support",
      "Full source access",
    ],
    cta: "Get started",
    href: "/register",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For growing teams that need more",
    features: [
      "Unlimited projects",
      "Up to 5 organizations",
      "Priority support",
      "AI chat included",
      "Stripe billing integration",
      "Custom roles & permissions",
      "Activity audit logs",
    ],
    cta: "Start 14-day trial",
    href: "/register",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large organizations with specific needs",
    features: [
      "Everything in Pro",
      "Unlimited organizations",
      "Dedicated support",
      "SLA guarantee",
      "Self-hosted option",
      "Custom integrations",
      "Audit report exports",
    ],
    cta: "Contact sales",
    href: "mailto:sales@saas.dev",
    highlighted: false,
  },
];

export function LandingPricing() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  const annualDiscount = billing === "annual" ? 0.8 : 1;

  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free. Upgrade when you need more.
          </p>
        </div>

        <div className="flex justify-center gap-2 mb-10">
          <button
            onClick={() => setBilling("monthly")}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              billing === "monthly"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={cn(
              "relative rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              billing === "annual"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            Annual
            <span className="ml-1.5 inline-block rounded-full bg-green-100 text-green-700 text-xs px-1.5 py-0.5 font-medium dark:bg-green-900/30 dark:text-green-400">
              Save 20%
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => {
            const price =
              plan.price === "Custom"
                ? "Custom"
                : billing === "annual"
                  ? `$${Math.round(parseInt(plan.price.replace("$", "")) * annualDiscount)}`
                  : plan.price;
            const period = billing === "annual" ? "/year" : plan.period;

            return (
              <div
                key={plan.name}
                className={cn(
                  "relative rounded-lg border bg-card p-6 flex flex-col",
                  plan.highlighted && "border-primary shadow-lg shadow-primary/5"
                )}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                      Recommended
                    </span>
                  </div>
                )}

                <h3 className="text-lg font-semibold mt-4">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">{price}</span>
                  {period && (
                    <span className="text-sm text-muted-foreground">{period}</span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm">
                      <CheckIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      {feat}
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  <a href={plan.href}>
                    <Button
                      variant={plan.highlighted ? "default" : "outline"}
                      className="w-full"
                    >
                      {plan.cta}
                    </Button>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}