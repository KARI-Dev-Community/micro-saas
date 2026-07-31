import { registerAs } from "@nestjs/config";

export default registerAs("security", () => ({
  cors: {
    allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    allowCredentials: true,
  },
  csrf: {
    enabled: process.env.CSRF_ENABLED !== "false",
    cookieName: process.env.CSRF_COOKIE_NAME ?? "__Host-csrf-token",
    cookieSecure: process.env.NODE_ENV === "production",
    cookieSameSite: "strict" as const,
    cookieHttpOnly: true,
  },
  rateLimit: {
    globalTtl: parseInt(process.env.RATE_LIMIT_TTL ?? "60000", 10),
    globalLimit: parseInt(process.env.RATE_LIMIT_GLOBAL_LIMIT ?? "120", 10),
    authTtl: parseInt(process.env.RATE_LIMIT_AUTH_TTL ?? "60000", 10),
    authLimit: parseInt(process.env.RATE_LIMIT_AUTH_LIMIT ?? "10", 10),
    strictTtl: parseInt(process.env.RATE_LIMIT_STRICT_TTL ?? "60000", 10),
    strictLimit: parseInt(process.env.RATE_LIMIT_STRICT_LIMIT ?? "30", 10),
  },
  headers: {
    hstsMaxAge: parseInt(process.env.HSTS_MAX_AGE ?? "31536000", 10),
    hstsIncludeSubdomains: process.env.HSTS_INCLUDE_SUBDOMAINS !== "false",
    hstsPreload: process.env.HSTS_PRELOAD === "true",
    cspPolicy:
      process.env.CSP_POLICY ??
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    xContentTypeOptions: "nosniff",
    xFrameOptions: "DENY",
    xXssProtection: "1; mode=block",
    referrerPolicy: "strict-origin-when-cross-origin",
    permissionsPolicy: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  internal: {
    signingSecret: process.env.INTERNAL_SIGNING_SECRET ?? "",
    header: "x-internal-signature",
    timestampHeader: "x-internal-timestamp",
    toleranceMs: parseInt(process.env.INTERNAL_TOLERANCE_MS ?? "300000", 10),
  },
  session: {
    deviceBinding: process.env.SESSION_DEVICE_BINDING === "true",
    idleTimeoutMs: parseInt(process.env.SESSION_IDLE_TIMEOUT_MS ?? "1800000", 10),
    absoluteTimeoutMs: parseInt(process.env.SESSION_ABSOLUTE_TIMEOUT_MS ?? "86400000", 10),
    redisKeyPrefix: "session:",
  },
  upload: {
    maxFileSizeBytes: parseInt(process.env.UPLOAD_MAX_FILE_SIZE ?? "10485760", 10),
    allowedMimeTypes: (process.env.UPLOAD_ALLOWED_MIME_TYPES ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    magicByteValidation: process.env.UPLOAD_MAGIC_BYTE_VALIDATION !== "false",
    malwareScanEnabled: process.env.UPLOAD_MALWARE_SCAN === "true",
  },
  pii: {
    maskEmail: true,
    maskPhone: true,
    maskIp: true,
    logBodyMaxBytes: parseInt(process.env.LOG_BODY_MAX_BYTES ?? "1024", 10),
    excludeFields: (process.env.LOG_PII_EXCLUDE_FIELDS ?? "password,token,secret,key,authorization,cookie")
      .split(",")
      .map((s) => s.trim()),
  },
  killSwitch: {
    enabled: process.env.KILL_SWITCH_ENABLED === "true",
    endpoints: (process.env.KILL_SWITCH_ENDPOINTS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  },
}));