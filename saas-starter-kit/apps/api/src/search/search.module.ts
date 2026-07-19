import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SearchDocument } from "./entities/search-document.entity";
import { SearchService } from "./search.service";
import { SearchController } from "./search.controller";
import { TenantModule } from "../tenant/tenant.module";

@Module({
  imports: [TypeOrmModule.forFeature([SearchDocument]), TenantModule],
  providers: [SearchService],
  controllers: [SearchController],
  exports: [SearchService],
})
export class SearchModule {}
