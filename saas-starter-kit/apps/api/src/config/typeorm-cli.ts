// CLI DataSource for `typeorm migration:run | generate`.
import { DataSource } from "typeorm";
import { ConfigService } from "@nestjs/config";
import * as appConfig from "./app.config";
import * as dbConfig from "./database.config";

const configService = new ConfigService({
  app: appConfig.default(),
  database: dbConfig.default(),
});

const options = configService.get<import("typeorm").DataSourceOptions>("database")!;
const mutable = options as Record<string, any>;
mutable.entities = [__dirname + "/../**/*.entity{.ts,.js}"];
mutable.migrations = [__dirname + "/../database/migrations/*{.ts,.js}"];

export const AppDataSource = new DataSource(mutable as import("typeorm").DataSourceOptions);
