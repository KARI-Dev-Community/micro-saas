import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Lock, BarChart3, Settings2, Database, Zap } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Multi-tenant auth & RBAC",
    description:
      "JWT-based auth with role-based access control. Scope every query to the right organization automatically.",
  },
  {
    icon: BarChart3,
    title: "Billing & subscriptions",
    description:
      "Stripe-powered subscriptions with free trials, coupon codes, invoicing, and usage tracking built in.",
  },
  {
    icon: Zap,
    title: "AI integration",
    description:
      "Embed AI chat, manage prompts, and track token usage and cost — all scoped to your organization.",
  },
  {
    icon: Settings2,
    title: "Project management",
    description:
      "Projects, tasks, comments, and activity timelines. Ships ready so you don't have to build it twice.",
  },
  {
    icon: Lock,
    title: "Security first",
    description:
      "2FA (TOTP + passkeys), session management, password reset flows, and audit logging out of the box.",
  },
  {
    icon: Database,
    title: "Type-safe & extensible",
    description:
      "TypeORM entities with generated migrations. Extend with your own modules using the documented template.",
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to ship
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            A complete foundation — not a blank slate. Every layer is pre-built
            so you focus on your product, not the boilerplate.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} className="group hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
