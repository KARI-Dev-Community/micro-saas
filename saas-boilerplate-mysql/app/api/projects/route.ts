import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getSubscriptionByUserId } from "@/lib/profile";
import { listProjectsByUserId, createProject } from "@/lib/projects";
import { checkRateLimit } from "@/lib/rate-limit";

const FREE_PROJECT_LIMIT = Number(process.env.FREE_PROJECT_LIMIT ?? 3);

function isPro(subscriptionStatus: string | null | undefined): boolean {
  return subscriptionStatus === "active" || subscriptionStatus === "trialing";
}

// GET /api/projects — list the authenticated user's projects.
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const projects = await listProjectsByUserId(user.id);
  const subscription = await getSubscriptionByUserId(user.id);
  const limit = isPro(subscription?.status) ? null : FREE_PROJECT_LIMIT;

  return NextResponse.json({ projects, limit, plan: isPro(subscription?.status) ? "pro" : "free" });
}

// POST /api/projects — create a project. Free users are capped at
// FREE_PROJECT_LIMIT; Pro users are unlimited.
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rateLimitResponse = await checkRateLimit(user.id);
  if (rateLimitResponse) return rateLimitResponse;

  const subscription = await getSubscriptionByUserId(user.id);
  const pro = isPro(subscription?.status);

  if (!pro) {
    const count = await listProjectsByUserId(user.id);
    if (count.length >= FREE_PROJECT_LIMIT) {
      return NextResponse.json(
        {
          error: `Free plan is limited to ${FREE_PROJECT_LIMIT} projects. Upgrade to Pro for unlimited.`,
          code: "LIMIT_REACHED",
          limit: FREE_PROJECT_LIMIT,
        },
        { status: 402 }
      );
    }
  }

  let body: { name?: unknown; description?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : null;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (name.length > 255) {
    return NextResponse.json({ error: "Name is too long" }, { status: 400 });
  }

  const project = await createProject(user.id, name, description);
  return NextResponse.json({ project }, { status: 201 });
}
