import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FileEntity } from "./entities/file.entity";
import { FileService } from "./file.service";
import { FileController } from "./file.controller";
import { TenantModule } from "../tenant/tenant.module";
import { RedisModule } from "../core/redis/redis.module";

@Module({
  imports: [TypeOrmModule.forFeature([FileEntity]), TenantModule, RedisModule],
  providers: [FileService],
  controllers: [FileController],
  exports: [FileService],
})
export class FileModule {}
