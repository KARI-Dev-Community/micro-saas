import { getSessionUser } from "@/lib/auth";
import { getSubscriptionByUserId } from "@/lib/profile";
import { listProjectsByUserId } from "@/lib/projects";
import { CheckoutButton } from "@/components/checkout-button";
import { ManageBillingButton } from "@/components/manage-billing-button";
import { BillplzCheckoutButton } from "@/components/billplz-checkout-button";
import { ProjectsPanel } from "@/components/projects-panel";

const FREE_PROJECT_LIMIT = Number(process.env.FREE_PROJECT_LIMIT ?? 3);

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const subscription = await getSubscriptionByUserId(user.id);

  const isActive =
    subscription?.status === "active" || subscription?.status === "trialing";
  const isBillplz = subscription?.payment_provider === "billplz";

  const projects = await listProjectsByUserId(user.id);
  const plan: "free" | "pro" = isActive ? "pro" : "free";
  const limit = isActive ? null : FREE_PROJECT_LIMIT;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-gray-600">
        This is where your product's actual functionality lives.
      </p>

      <div className="mt-8 border border-gray-200 rounded-2xl p-6">
        <h2 className="font-semibold">Subscription</h2>

        {isActive ? (
          <>
            <p className="mt-2 text-gray-600">
              You're on the Pro plan
              {isBillplz ? " (paid via FPX/Billplz)" : ""}.
              {subscription?.current_period_end && (
                <>
                  {" "}
                  {isBillplz ? "Access until" : "Renews"}{" "}
                  {new Date(
                    subscription.current_period_end
                  ).toLocaleDateString()}
                  .
                </>
              )}
            </p>
            <div className="mt-4 flex gap-3">
              {isBillplz ? (
                <BillplzCheckoutButton />
              ) : (
                <ManageBillingButton />
              )}
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-gray-600">
              You're on the free plan. Upgrade to unlock everything.
            </p>
            <div className="mt-4 flex gap-3">
              <CheckoutButton />
              <BillplzCheckoutButton />
            </div>
          </>
        )}
      </div>

      <ProjectsPanel
        initialProjects={projects}
        initialLimit={limit}
        plan={plan}
      />
    </div>
  );
}
