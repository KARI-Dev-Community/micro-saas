// Centralized API client. Uses the standard response envelope:
// { success, message, data, meta }. Auth tokens are stored in localStorage
// and attached as Bearer; the active organization id is sent via the
// `x-organization-id` header for tenant-scoped requests.
import { ApiResponse } from "@shared/response";

const TOKEN_KEY = "saas_tokens";

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export function storeTokens(tokens: Tokens) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}
export function getTokens(): Tokens | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(TOKEN_KEY);
  return raw ? JSON.parse(raw) : null;
}
export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  organizationId?: string;
  params?: Record<string, string | number | undefined>;
}

export class ApiError extends Error {
  code?: string;
  status: number;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: RequestOptions = {}
): Promise<T> {
  const tokens = getTokens();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (tokens) headers["Authorization"] = `Bearer ${tokens.accessToken}`;
  if (opts.organizationId) headers["x-organization-id"] = opts.organizationId;

  let url = path;
  if (opts.params) {
    const qs = new URLSearchParams(
      Object.entries(opts.params)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => [k, String(v)])
    ).toString();
    if (qs) url += `?${qs}`;
  }

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 401 && tokens?.refreshToken) {
    // Attempt refresh once.
    try {
      const refreshed = await refreshTokens(tokens.refreshToken);
      storeTokens(refreshed);
      headers["Authorization"] = `Bearer ${refreshed.accessToken}`;
      const retry = await fetch(url, { method: opts.method ?? "GET", headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
      return unwrap<T>(await retry.json());
    } catch {
      clearTokens();
      throw new ApiError("Session expired", 401);
    }
  }

  return unwrap<T>(await res.json());
}

async function refreshTokens(refreshToken: string): Promise<Tokens> {
  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new ApiError("Refresh failed", res.status);
  return res.json();
}

function unwrap<T>(json: ApiResponse<T>): T {
  if (json && typeof json === "object" && "success" in json) {
    if (!json.success) {
      throw new ApiError(json.message, 400, (json.data as any)?.code);
    }
    return json.data as T;
  }
  return json as T;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => apiFetch<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => apiFetch<T>(path, { ...opts, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) => apiFetch<T>(path, { ...opts, method: "PATCH", body }),
  del: <T>(path: string, opts?: RequestOptions) => apiFetch<T>(path, { ...opts, method: "DELETE" }),
};
