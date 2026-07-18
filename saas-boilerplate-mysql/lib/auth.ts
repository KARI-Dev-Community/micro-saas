import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { query } from "@/lib/db";

// ---------------------------------------------------------------------------
// Auth
//
// This boilerplate uses its own email/password auth backed by MySQL, instead
// of a hosted provider. A signed JWT (HS256) is stored in an httpOnly cookie
// named `session`. Sessions are stateless — there's no server-side session
// table — so "sign out" just clears the cookie.
//
// This module is server-only. Client components must never import it; they
// talk to the server via the `app/auth/callback` route and the
// `SignOutButton` instead.
// ---------------------------------------------------------------------------

const SESSION_COOKIE = "session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. Generate one with `openssl rand -base64 32`."
    );
  }
  return new TextEncoder().encode(secret);
}

export interface SessionUser {
  id: string;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function createUser(
  email: string,
  password: string
): Promise<{ id: string; email: string }> {
  const id = randomUUID();
  const passwordHash = await hashPassword(password);
  await query(
    `insert into profiles (id, email, password_hash) values (:id, :email, :passwordHash)`,
    { id, email, passwordHash }
  );
  return { id, email };
}

export async function getUserByEmail(
  email: string
): Promise<{ id: string; email: string; password_hash: string } | null> {
  const [rows] = await query<{ id: string; email: string; password_hash: string }[]>(
    `select id, email, password_hash from profiles where email = :email limit 1`,
    { email }
  );
  return rows[0] ?? null;
}

// Sets the session cookie. Call from a Route Handler or Server Action.
export async function setSession(user: SessionUser): Promise<void> {
  const token = await createSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// Reads and verifies the session cookie. Returns null if absent/invalid.
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || typeof payload.email !== "string") return null;
    return { id: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

export { SESSION_COOKIE };
