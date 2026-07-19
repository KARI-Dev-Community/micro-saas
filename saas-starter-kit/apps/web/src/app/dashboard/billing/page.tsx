"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlanType, SubscriptionStatus } from "@shared/enums";

export default function BillingPage() {
  const activeOrgId = useAuthStore((s) => s.activeOrgId)!;
  const { data: sub } = useQuery({
    queryKey: ["subscription", activeOrgId],
    queryFn: () => api.get<any>("/api/billing/subscription", { organizationId: activeOrgId }),
    enabled: !!activeOrgId,
  });
  const { data: invoices } = useQuery({
    queryKey: ["invoices", activeOrgId],
    queryFn: () => api.get<any[]>("/api/billing/invoices", { organizationId: activeOrgId }),
    enabled: !!activeOrgId,
  });

  const plans = [PlanType.FREE, PlanType.MONTHLY, PlanType.ANNUAL];

  async function changePlan(plan: PlanType) {
    await api.post("/api/billing/subscription/plan", { plan }, { organizationId: activeOrgId });
    location.reload();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Billing</h1>
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        {plans.map((plan) => (
          <Card key={plan}>
            <CardHeader><CardTitle className="capitalize">{plan}</CardTitle></CardHeader>
            <CardContent>
              <Badge>{sub?.plan === plan ? "Current" : ""}</Badge>
              <Button className="mt-3 w-full" variant={sub?.plan === plan ? "secondary" : "default"} disabled={sub?.plan === plan} onClick={() => changePlan(plan)}>
                {sub?.plan === plan ? "Active" : "Switch"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Invoices</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(invoices ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            invoices!.map((inv) => (
              <div key={inv.id} className="flex justify-between text-sm border-b pb-2">
                <span>{inv.number ?? inv.id.slice(0, 8)}</span>
                <span>{(inv.amountCents / 100).toFixed(2)} {inv.currency?.toUpperCase()}</span>
                <span className="text-muted-foreground">{inv.status}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
