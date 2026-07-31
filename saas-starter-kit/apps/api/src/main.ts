import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { RbacSeeder } from "./tenant/rbac.seeder";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(process.env.API_PREFIX ?? "api");

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? "*",
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-organization-id",
      "x-csrf-token",
      "x-internal-signature",
      "x-internal-timestamp",
    ],
    exposedHeaders: ["x-request-id"],
  });

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          fontSrc: ["'self'", "data:"],
          connectSrc: ["'self'", "https:"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      hsts: {
        maxAge: parseInt(process.env.HSTS_MAX_AGE ?? "31536000", 10),
        includeSubDomains: process.env.HSTS_INCLUDE_SUBDOMAINS !== "false",
        preload: process.env.HSTS_PRELOAD === "true",
      },
      xContentTypeOptions: true,
      xFrameOptions: { action: "deny" },
      xXssProtection: true,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      hidePoweredBy: true,
    })
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  const config = new DocumentBuilder()
    .setTitle("SaaS Starter Kit API")
    .setDescription("Multi-tenant SaaS boilerplate (NestJS)")
    .setVersion("1.0")
    .addBearerAuth()
    .addApiKey(
      { type: "apiKey", name: "x-organization-id", in: "header" },
      "organization"
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  const seeder = app.get(RbacSeeder);
  await seeder.seed();

  await app.listen(process.env.PORT ?? 3001);
  console.log(`API listening on :${process.env.PORT ?? 3001} (docs at /docs)`);
}

bootstrap();