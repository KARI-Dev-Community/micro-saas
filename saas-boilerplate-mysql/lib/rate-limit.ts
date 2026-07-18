import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Only initialize if Upstash env vars are set, so the boilerplate still
// runs locally without a Redis instance — rate limiting just no-ops.
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Generic limiter: 10 requests per minute per identifier (IP or user ID).
// Tune per-route by creating additional instances with a different
// `prefix` and window if some endpoints need stricter limits.
export const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      prefix: "rl",
      analytics: true,
    })
  : null;

/**
 * Call at the top of a route handler. Returns null if the request should
 * proceed, or a 429 Response if it's been rate limited. No-ops (always
 * allows) when Upstash isn't configured, so this is safe to leave in
 * during local development.
 */
export async function checkRateLimit(identifier: string) {
  if (!ratelimit) return null;

  const { success, limit, remaining, reset } = await ratelimit.limit(
    identifier
  );

  if (!success) {
    return new Response(
      JSON.stringify({ error: "Too many requests, please slow down." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(reset),
        },
      }
    );
  }

  return null;
}
