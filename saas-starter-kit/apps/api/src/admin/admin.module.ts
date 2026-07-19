import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FeatureFlag, SystemSetting } from "./entities/admin.entity";
import { AdminService } from "./admin.service";
import { AdminController } from "./admin.controller";
import { TenantModule } from "../tenant/tenant.module";
import { BillingModule } from "../billing/billing.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([FeatureFlag, SystemSetting]),
    TenantModule,
    BillingModule,
  ],
  providers: [AdminService],
  controllers: [AdminController],
  exports: [AdminService],
})
export class AdminModule {}
