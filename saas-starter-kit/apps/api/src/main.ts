import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { RbacSeeder } from "./tenant/rbac.seeder";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(process.env.API_PREFIX ?? "api");
  app.enableCors({ origin: process.env.FRONTEND_URL ?? "*", credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    })
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle("SaaS Starter Kit API")
    .setDescription("Multi-tenant SaaS boilerplate (NestJS)")
    .setVersion("1.0")
    .addBearerAuth()
    .addApiKey({ type: "apiKey", name: "x-organization-id", in: "header" }, "organization")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  // Seed RBAC roles + permissions on boot.
  const seeder = app.get(RbacSeeder);
  await seeder.seed();

  await app.listen(process.env.PORT ?? 3001);
  console.log(`API listening on :${process.env.PORT ?? 3001} (docs at /docs)`);
}

bootstrap();
