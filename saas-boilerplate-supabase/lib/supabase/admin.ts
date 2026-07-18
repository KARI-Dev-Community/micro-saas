import { createClient } from "@supabase/supabase-js";

// SERVER-ONLY. Bypasses Row Level Security — never import this in
// client components or expose the service role key to the browser.
// Used for privileged writes, e.g. updating subscription status
// from a Stripe webhook where there's no logged-in user session.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
