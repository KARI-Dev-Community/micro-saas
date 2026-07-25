// CLI DataSource for `typeorm migration:run | generate`.
import { DataSource } from "typeorm";
import { ConfigService } from "@nestjs/config";
import * as appConfig from "./app.config";
import * as dbConfig from "./database.config";
import * as path from "path";
import * as fs from "fs";

const configService = new ConfigService({
  app: appConfig.default(),
  database: dbConfig.default(),
});

const options = configService.get<import("typeorm").DataSourceOptions>("database")!;
const mutable = options as Record<string, any>;
mutable.entities = [__dirname + "/../**/*.entity{.ts,.js}"];

const candidate1 = path.join(__dirname, "..", "database", "migrations");
const candidate2 = path.join(__dirname, "..", "apps", "api", "src", "database", "migrations");
const migrationsDir = fs.existsSync(candidate1) ? candidate1 : candidate2;
mutable.migrations = [`${migrationsDir}/*{.ts,.js}`];

export const AppDataSource = new DataSource(mutable as import("typeorm").DataSourceOptions);
