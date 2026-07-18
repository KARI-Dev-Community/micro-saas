import { NextResponse } from "next/server";
import { getUserByEmail, verifyPassword, setSession } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const profile = await getUserByEmail(email);
  if (!profile) {
    // Don't reveal whether the email exists — same message either way.
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const ok = await verifyPassword(password, profile.password_hash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await setSession({ id: profile.id, email: profile.email });

  return NextResponse.json({ ok: true });
}
