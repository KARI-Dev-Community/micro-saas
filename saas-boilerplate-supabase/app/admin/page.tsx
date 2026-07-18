import { createAdminClient } from "@/lib/supabase/admin";

const CURRENCY_LABEL: Record<string, string> = {
  usd: "$",
  myr: "RM",
};

function formatAmount(cents: number, currency: string) {
  const symbol = CURRENCY_LABEL[currency] ?? currency.toUpperCase() + " ";
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

export default async function AdminPage() {
  const admin = createAdminClient();

  const { data: subscriptions } = await admin
    .from("subscriptions")
    .select(
      "user_id, payment_provider, status, amount_cents, currency, current_period_end, created_at"
    )
    .order("created_at", { ascending: false });

  const all = subscriptions ?? [];
  const active = all.filter(
    (s) => s.status === "active" || s.status === "trialing"
  );

  // MRR grouped by currency — don't sum across currencies, since a
  // MYR total and a USD total aren't the same number.
  const mrrByCurrency: Record<string, number> = {};
  for (const sub of active) {
    const currency = sub.currency ?? "usd";
    mrrByCurrency[currency] =
      (mrrByCurrency[currency] ?? 0) + (sub.amount_cents ?? 0);
  }

  const byProvider: Record<string, number> = {};
  for (const sub of active) {
    byProvider[sub.payment_provider] = (byProvider[sub.payment_provider] ?? 0) + 1;
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const newThisMonth = all.filter(
    (s) => new Date(s.created_at) >= startOfMonth
  ).length;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Revenue</h1>
      <p className="mt-1 text-gray-600">
        Pulled directly from your subscriptions table.
      </p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-gray-200 rounded-2xl p-6">
          <p className="text-sm text-gray-500">MRR</p>
          {Object.keys(mrrByCurrency).length === 0 ? (
            <p className="mt-1 text-3xl font-bold">–</p>
          ) : (
            Object.entries(mrrByCurrency).map(([currency, cents]) => (
              <p key={currency} className="mt-1 text-3xl font-bold">
                {formatAmount(cents, currency)}
                <span className="text-sm font-normal text-gray-500 ml-1">
                  /mo
                </span>
              </p>
            ))
          )}
        </div>

        <div className="border border-gray-200 rounded-2xl p-6">
          <p className="text-sm text-gray-500">Active subscribers</p>
          <p className="mt-1 text-3xl font-bold">{active.length}</p>
        </div>

        <div className="border border-gray-200 rounded-2xl p-6">
          <p className="text-sm text-gray-500">New this month</p>
          <p className="mt-1 text-3xl font-bold">{newThisMonth}</p>
        </div>
      </div>

      <div className="mt-6 border border-gray-200 rounded-2xl p-6">
        <p className="text-sm text-gray-500">By payment provider</p>
        <div className="mt-2 flex gap-6">
          {Object.entries(byProvider).length === 0 && (
            <p className="text-gray-400 text-sm">No active subscribers yet</p>
          )}
          {Object.entries(byProvider).map(([provider, count]) => (
            <p key={provider}>
              <span className="font-semibold">{count}</span>{" "}
              <span className="text-gray-500 text-sm">{provider}</span>
            </p>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-semibold mb-3">Recent subscriptions</h2>
        <div className="border border-gray-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Provider</th>
                <th className="text-left px-4 py-2 font-medium">Amount</th>
                <th className="text-left px-4 py-2 font-medium">Period end</th>
              </tr>
            </thead>
            <tbody>
              {all.slice(0, 25).map((sub, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-4 py-2">{sub.status}</td>
                  <td className="px-4 py-2">{sub.payment_provider}</td>
                  <td className="px-4 py-2">
                    {sub.amount_cents
                      ? formatAmount(sub.amount_cents, sub.currency ?? "usd")
                      : "–"}
                  </td>
                  <td className="px-4 py-2">
                    {sub.current_period_end
                      ? new Date(sub.current_period_end).toLocaleDateString()
                      : "–"}
                  </td>
                </tr>
              ))}
              {all.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                    No subscriptions yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
