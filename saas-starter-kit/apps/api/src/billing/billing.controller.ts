import { Controller, Get, Post, Patch, Body, Param, UseGuards, Query } from "@nestjs/common";
import { JwtAuthGuard, AuthUser, CurrentOrganization } from "../core/guards/jwt-auth.guard";
import { PermissionGuard, Permissions } from "../core/guards/permission.guard";
import { AccessTokenPayload } from "../auth/services/token.service";
import { BillingService } from "./billing.service";
import { PlanType } from "@shared/enums";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

class ChangePlanDto {
  @ApiProperty({ enum: PlanType }) @IsEnum(PlanType) plan!: PlanType;
  @ApiProperty({ required: false }) @IsOptional() @IsString() couponCode?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() provider?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() providerSubscriptionId?: string;
  @ApiProperty({ required: false }) @IsOptional() amountCents?: number;
}

@Controller("billing")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get("subscription")
  @Permissions("org.billing.read")
  async subscription(@CurrentOrganization() orgId: string) {
    return this.billing.getSubscription(orgId!);
  }

  @Post("subscription/plan")
  @Permissions("org.billing.manage")
  async changePlan(@CurrentOrganization() orgId: string, @AuthUser() user: AccessTokenPayload, @Body() dto: ChangePlanDto) {
    return this.billing.changePlan({ organizationId: orgId!, plan: dto.plan, actorId: user.sub, couponCode: dto.couponCode, provider: dto.provider, providerSubscriptionId: dto.providerSubscriptionId, amountCents: dto.amountCents });
  }

  @Post("subscription/cancel")
  @Permissions("org.billing.manage")
  async cancel(@CurrentOrganization() orgId: string, @AuthUser() user: AccessTokenPayload, @Body() body: { atPeriodEnd?: boolean }) {
    return this.billing.cancel({ organizationId: orgId!, actorId: user.sub, atPeriodEnd: body?.atPeriodEnd });
  }

  @Get("invoices")
  @Permissions("org.billing.read")
  async invoices(@CurrentOrganization() orgId: string) {
    return this.billing.listInvoices(orgId!);
  }

  @Get("coupons")
  @Permissions("platform.billing.manage")
  async coupons() {
    return this.billing.listCoupons();
  }

  @Post("coupons")
  @Permissions("platform.billing.manage")
  async createCoupon(@Body() body: any) {
    return this.billing.createCoupon(body);
  }
}
