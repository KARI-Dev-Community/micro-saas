import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
  env: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "3001", 10),
  apiPrefix: process.env.API_PREFIX ?? "api",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  jwtSecret: process.env.JWT_SECRET!,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "30d",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  db: {
    type: (process.env.DB_TYPE ?? "postgres") as "postgres" | "mysql",
    host: process.env.DB_HOST ?? "localhost",
    port: parseInt(process.env.DB_PORT ?? "5432", 10),
    username: process.env.DB_USERNAME ?? "saas",
    password: process.env.DB_PASSWORD ?? "saas",
    database: process.env.DB_DATABASE ?? "saas",
    synchronize: process.env.DB_SYNCHRONIZE === "true",
  },
  redis: {
    host: process.env.REDIS_HOST ?? "localhost",
    port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
    password: process.env.REDIS_PASSWORD ?? undefined,
  },
  email: {
    from: process.env.EMAIL_FROM ?? "no-reply@saas.dev",
    // Provide SMTP or a transactional provider in production.
    provider: process.env.EMAIL_PROVIDER ?? "console",
  },
  ai: {
    openaiApiKey: process.env.OPENAI_API_KEY ?? "",
    chatModel: process.env.AI_CHAT_MODEL ?? "gpt-4o-mini",
  },
  billing: {
    // Stripe (or your provider). Webhooks keep subscription state in sync.
    stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    freeProjectLimit: parseInt(process.env.FREE_PROJECT_LIMIT ?? "3", 10),
  },
  storage: {
    provider: process.env.STORAGE_PROVIDER ?? "local",
    localDir: process.env.STORAGE_LOCAL_DIR ?? "./uploads",
    baseUrl: process.env.STORAGE_BASE_URL ?? "http://localhost:3001/files",
  },
}));
