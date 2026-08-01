import { ApiResponse } from "@shared/response";

const TOKEN_KEY = "saas_tokens";

let refreshPromise: Promise<any> | null = null;

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export function storeTokens(tokens: Tokens) {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  }
}
export function getTokens(): Tokens | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Tokens;
  } catch {
    return null;
  }
}
export function clearTokens() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
  }
  document.cookie = "saas_access_token=; Max-Age=0; path=/";
  document.cookie = "saas_refresh_token=; Max-Age=0; path=/";
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
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const tokens = getTokens();
  if (tokens?.accessToken) headers["Authorization"] = `Bearer ${tokens.accessToken}`;
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
    credentials: "include",
  });

  if (!res.ok) {
    if (res.status === 401) {
      try {
        await refreshTokens();
        const retry = await fetch(url, { method: opts.method ?? "GET", headers, body: opts.body ? JSON.stringify(opts.body) : undefined, credentials: "include" });
        if (!retry.ok) {
          const json = await retry.json().catch(() => ({} as ApiResponse<T>));
          const message = (json && (json as any).message) || retry.statusText || "Request failed";
          const code = (json && (json as any).data && (json as any).data.code);
          throw new ApiError(message, retry.status, code);
        }
        return unwrap<T>(await retry.json());
      } catch {
        clearTokens();
        throw new ApiError("Session expired", 401);
      }
    }
    const json = await res.json().catch(() => ({} as ApiResponse<T>));
    const message = (json && (json as any).message) || res.statusText || "Request failed";
    const code = (json && (json as any).data && (json as any).data.code);
    throw new ApiError(message, res.status, code);
  }

  return unwrap<T>(await res.json());
}

async function refreshTokens(): Promise<void> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const tokens = getTokens();
    if (!tokens?.refreshToken) {
      throw new ApiError("No refresh token", 401);
    }
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      credentials: "include",
    });
    if (!res.ok) {
      throw new ApiError("Refresh failed", res.status);
    }
    const json = await res.json().catch(() => ({} as ApiResponse<Tokens>));
    const newTokens = unwrap<Tokens>(json);
    storeTokens(newTokens);
  })();
  try {
    await refreshPromise;
  } finally {
    refreshPromise = null;
  }
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
