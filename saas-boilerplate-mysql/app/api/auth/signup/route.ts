import { NextResponse } from "next/server";
import { createUser, setSession } from "@/lib/auth";
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
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  try {
    const user = await createUser(email, password);
    await setSession({ id: user.id, email: user.email });

    // Fire-and-forget — don't block the response on email delivery.
    sendWelcomeEmail(user.email).catch((err) =>
      console.error("Failed to send welcome email", err)
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    // Duplicate entry on the unique email column.
    if (err?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "An account with that email already exists" },
        { status: 409 }
      );
    }
    console.error("Signup failed", err);
    return NextResponse.json({ error: "Could not create account" }, { status: 500 });
  }
}
