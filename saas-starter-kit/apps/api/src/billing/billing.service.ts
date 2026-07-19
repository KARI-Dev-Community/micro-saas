import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Subscription } from "./entities/subscription.entity";
import { Invoice } from "./entities/invoice.entity";
import { Coupon } from "./entities/coupon.entity";
import { RbacService } from "../tenant/rbac.service";
import { AuditService } from "../audit/audit.service";
import { PlanType, SubscriptionStatus } from "@shared/enums";
import { BusinessException } from "../core/exception/business.exception";

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Subscription) private readonly subs: Repository<Subscription>,
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(Coupon) private readonly coupons: Repository<Coupon>,
    private readonly rbac: RbacService,
    private readonly audit: AuditService
  ) {}

  async getSubscription(organizationId: string): Promise<Subscription> {
    let sub = await this.subs.find({ where: { organizationId } });
    if (!sub.length) {
      sub = [await this.subs.save(this.subs.create({ organizationId, plan: PlanType.FREE, status: SubscriptionStatus.ACTIVE }))];
    }
    return sub[0];
  }

  async changePlan(input: {
    organizationId: string;
    plan: PlanType;
    actorId: string;
    provider?: string;
    providerSubscriptionId?: string;
    amountCents?: number;
    currency?: string;
    couponCode?: string;
    currentPeriodEnd?: Date;
  }): Promise<Subscription> {
    await this.rbac.assertPermission(input.actorId, input.organizationId, "org.billing.manage");
    const sub = await this.getSubscription(input.organizationId);
    const old = { ...sub };
    if (input.couponCode) {
      const coupon = await this.coupons.findOne({ where: { code: input.couponCode, isActive: true } });
      if (!coupon) throw new BusinessException("Invalid coupon", "COUPON_INVALID");
    }
    Object.assign(sub, {
      plan: input.plan,
      status:
        input.plan === PlanType.FREE ? SubscriptionStatus.ACTIVE : SubscriptionStatus.ACTIVE,
      provider: input.provider ?? sub.provider,
      providerSubscriptionId: input.providerSubscriptionId ?? sub.providerSubscriptionId,
      amountCents: input.amountCents ?? sub.amountCents,
      currency: input.currency ?? sub.currency,
      couponCode: input.couponCode ?? sub.couponCode,
      currentPeriodEnd: input.currentPeriodEnd ?? sub.currentPeriodEnd,
    });
    const saved = await this.subs.save(sub);
    await this.audit.record("billing", "plan_changed", { actorId: input.actorId, organizationId: input.organizationId }, {
      entityType: "subscription",
      entityId: saved.id,
      oldValue: old,
      newValue: { plan: saved.plan, status: saved.status },
    });
    return saved;
  }

  async cancel(input: { organizationId: string; actorId: string; atPeriodEnd?: boolean }): Promise<Subscription> {
    await this.rbac.assertPermission(input.actorId, input.organizationId, "org.billing.manage");
    const sub = await this.getSubscription(input.organizationId);
    sub.cancelAtPeriodEnd = input.atPeriodEnd ?? true;
    if (!input.atPeriodEnd) sub.status = SubscriptionStatus.CANCELED;
    sub.canceledAt = new Date();
    return this.subs.save(sub);
  }

  async listInvoices(organizationId: string): Promise<Invoice[]> {
    return this.invoices.find({ where: { organizationId }, order: { createdAt: "DESC" } });
  }

  async addInvoice(inv: Partial<Invoice>): Promise<Invoice> {
    return this.invoices.save(this.invoices.create(inv));
  }

  async listCoupons(): Promise<Coupon[]> {
    return this.coupons.find({ order: { createdAt: "DESC" } });
  }

  async createCoupon(input: Partial<Coupon>): Promise<Coupon> {
    return this.coupons.save(this.coupons.create(input));
  }

  async applyCoupon(code: string): Promise<Coupon> {
    const coupon = await this.coupons.findOne({ where: { code, isActive: true } });
    if (!coupon) throw new BusinessException("Coupon not found", "COUPON_INVALID");
    if (coupon.expiresAt && coupon.expiresAt < new Date())
      throw new BusinessException("Coupon expired", "COUPON_EXPIRED");
    if (coupon.maxRedemptions && coupon.redemptions >= coupon.maxRedemptions)
      throw new BusinessException("Coupon exhausted", "COUPON_EXHAUSTED");
    coupon.redemptions += 1;
    return this.coupons.save(coupon);
  }
}
