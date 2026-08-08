import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/verify-email",
  "/api/auth/google/login",
  "/api/auth/google/callback",
  "/api/auth/refresh",
  "/api/health",
  "/docs",
  "/api/docs",
];

const AUTH_COOKIE_NAME = "saas_access_token";
const REFRESH_COOKIE_NAME = "saas_refresh_token";

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function isStaticAsset(pathname: string): boolean {
  return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|map|json)$/.test(
    pathname
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return handleGatewayRequest(request);
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const isDashboard = pathname.startsWith("/dashboard");
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/oauth");

  const accessToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

  if (!accessToken && !refreshToken) {
    if (isDashboard) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  if (isAuthPage && accessToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isDashboard && !accessToken && refreshToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Referrer-Policy",
    "strict-origin-when-cross-origin"
  );
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (pathname.startsWith("/dashboard")) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    response.headers.set("Pragma", "no-cache");
  }

  return response;
}

async function handleGatewayRequest(request: NextRequest): Promise<NextResponse> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const path = request.nextUrl.pathname.replace("/api/gateway", "");
  const targetUrl = `${apiBase}${path}${request.nextUrl.search}`;

  const accessToken =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const organizationId =
    request.headers.get("x-organization-id") ??
    request.cookies.get("saas_org_id")?.value;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (organizationId) headers["x-organization-id"] = organizationId;
  if (accessToken) headers["authorization"] = `Bearer ${accessToken}`;

  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) headers["cookie"] = cookieHeader;

  const isBodyMethod = request.method !== "GET" && request.method !== "HEAD";
  const body = isBodyMethod ? await request.text() : undefined;

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.set("x-gateway-proxy", "nextjs");

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};