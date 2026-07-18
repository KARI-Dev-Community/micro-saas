import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Increments the usage counter for (user, feature) this calendar month
 * and reports whether they're still under the limit. Use this to gate
 * any capped free-tier action once you know what your product does —
 * e.g. "3 projects free", "10 exports/month".
 *
 * Example:
 *   const { allowed, count } = await checkUsageLimit(user.id, "exports", 10);
 *   if (!allowed) return NextResponse.json({ error: "Limit reached" }, { status: 402 });
 */
export async function checkUsageLimit(
  userId: string,
  feature: string,
  limit: number
): Promise<{ allowed: boolean; count: number }> {
  const admin = createAdminClient();

  const { data: count, error } = await admin.rpc("increment_usage", {
    p_user_id: userId,
    p_feature: feature,
  });

  if (error) {
    // Fail open — don't block the user's action because usage tracking
    // broke. Log this to Sentry/your monitoring in production.
    console.error("Usage tracking failed", error);
    return { allowed: true, count: 0 };
  }

  return { allowed: count <= limit, count };
}
