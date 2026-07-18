import { query } from "@/lib/db";
import { randomUUID } from "crypto";

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
  try {
    // Increment atomically (INSERT ... ON DUPLICATE KEY UPDATE), then read
    // the new count back for this month.
    await query(
      `insert into usage_counters (id, user_id, feature, period_start, count)
         values (:id, :userId, :feature, curdate(), 1)
       on duplicate key update count = count + 1`,
      { id: randomUUID(), userId, feature }
    );

    const [rows] = await query<{ count: number }[]>(
      `select count from usage_counters
         where user_id = :userId and feature = :feature and period_start = curdate()
         limit 1`,
      { userId, feature }
    );

    const count = rows[0]?.count ?? 0;
    return { allowed: count <= limit, count };
  } catch (error) {
    // Fail open — don't block the user's action because usage tracking
    // broke. Log this to Sentry/your monitoring in production.
    console.error("Usage tracking failed", error);
    return { allowed: true, count: 0 };
  }
}
