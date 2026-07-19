import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Subscription } from "./entities/subscription.entity";
import { Invoice } from "./entities/invoice.entity";
import { Coupon } from "./entities/coupon.entity";
import { BillingService } from "./billing.service";
import { BillingController } from "./billing.controller";
import { TenantModule } from "../tenant/tenant.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, Invoice, Coupon]),
    TenantModule,
    AuditModule,
  ],
  providers: [BillingService],
  controllers: [BillingController],
  exports: [BillingService],
})
export class BillingModule {}
