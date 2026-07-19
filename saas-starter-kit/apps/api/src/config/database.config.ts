import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { registerAs } from "@nestjs/config";
import { DataSourceOptions } from "typeorm";

export default registerAs("database", (): DataSourceOptions => {
  const type = (process.env.DB_TYPE ?? "postgres") as "postgres" | "mysql";
  const base: Partial<TypeOrmModuleOptions> = {
    entities: [__dirname + "/../**/*.entity{.ts,.js}"],
    migrations: [__dirname + "/../database/migrations/*{.ts,.js}"],
    synchronize: process.env.DB_SYNCHRONIZE === "true",
    migrationsRun: false,
    logging: process.env.DB_LOGGING === "true",
  };
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
