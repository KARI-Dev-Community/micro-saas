import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const INTERNAL_SECRET = process.env.INTERNAL_SIGNING_SECRET ?? "";

export async function GET(request: NextRequest) {
  return proxyRequest(request);
}

export async function POST(request: NextRequest) {
  return proxyRequest(request);
}

export async function PATCH(request: NextRequest) {
  return proxyRequest(request);
}

export async function PUT(request: NextRequest) {
  return proxyRequest(request);
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request);
}

export async function OPTIONS(request: NextRequest) {
  return proxyRequest(request);
}

async function proxyRequest(request: NextRequest): Promise<NextResponse> {
  const path = request.nextUrl.pathname.replace("/api/gateway", "");
  const targetUrl = `${API_BASE}${path}`;

  const accessToken = request.cookies.get("saas_access_token")?.value;
  const organizationId = request.cookies.get("saas_org_id")?.value;

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("x-organization-id", organizationId ?? "");

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (INTERNAL_SECRET) {
    const timestamp = Date.now().toString();
    const body =
      request.method !== "GET" && request.method !== "HEAD"
        ? await request.text()
        : "";
    const message = `${request.method}:${path}:${timestamp}:${body ?? ""}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(INTERNAL_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(message)
    );
    const signature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    headers.set("x-internal-signature", signature);
    headers.set("x-internal-timestamp", timestamp);
  }

  const queryString = request.nextUrl.search;
  const fetchUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;

  const response = await fetch(fetchUrl, {
    method: request.method,
    headers,
    body:
      request.method !== "GET" && request.method !== "HEAD"
        ? await request.text()
        : undefined,
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.set("x-gateway-proxy", "nextjs");

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}