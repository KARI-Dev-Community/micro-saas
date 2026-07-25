import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { registerAs } from "@nestjs/config";
import { DataSourceOptions } from "typeorm";
import * as path from "path";
import * as fs from "fs";

export default registerAs("database", (): DataSourceOptions => {
  const type = (process.env.DB_TYPE ?? "postgres") as "postgres" | "mysql";
  const base: Partial<TypeOrmModuleOptions> = {
    entities: [__dirname + "/../**/*.entity{.ts,.js}"],
    synchronize: process.env.DB_SYNCHRONIZE === "true",
    migrationsRun: false,
    logging: process.env.DB_LOGGING === "true",
  };

  const candidate1 = path.join(__dirname, "..", "database", "migrations");
  const candidate2 = path.join(__dirname, "..", "apps", "api", "src", "database", "migrations");
  const migrationsDir = fs.existsSync(candidate1) ? candidate1 : candidate2;
  (base as any).migrations = [`${migrationsDir}/*{.ts,.js}`];

  if (type === "postgres") {
    return {
      type: "postgres",
      host: process.env.DB_HOST ?? "localhost",
      port: parseInt(process.env.DB_PORT ?? "5432", 10),
      username: process.env.DB_USERNAME ?? "saas",
      password: process.env.DB_PASSWORD ?? "saas",
      database: process.env.DB_DATABASE ?? "saas",
      ...base,
    } as DataSourceOptions;
  }
  return {
    type: "mysql",
    host: process.env.DB_HOST ?? "localhost",
    port: parseInt(process.env.DB_PORT ?? "3306", 10),
    username: process.env.DB_USERNAME ?? "saas",
    password: process.env.DB_PASSWORD ?? "saas",
    database: process.env.DB_DATABASE ?? "saas",
    ...base,
  } as DataSourceOptions;
});
