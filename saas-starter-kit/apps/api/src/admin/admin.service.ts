import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FeatureFlag, SystemSetting } from "./entities/admin.entity";
import { User } from "../auth/entities/user.entity";
import { Organization } from "../tenant/entities/organization.entity";
import { Subscription } from "../billing/entities/subscription.entity";
import { SubscriptionStatus } from "@shared/enums";

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(FeatureFlag) private readonly flags: Repository<FeatureFlag>,
    @InjectRepository(SystemSetting) private readonly settings: Repository<SystemSetting>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Organization) private readonly orgs: Repository<Organization>,
    @InjectRepository(Subscription) private readonly subs: Repository<Subscription>
  ) {}

  async listFeatureFlags(): Promise<FeatureFlag[]> {
    return this.flags.find();
  }

  async setFeatureFlag(key: string, enabled: boolean): Promise<FeatureFlag> {
    const flag = await this.flags.findOne({ where: { key } });
    if (!flag) throw new Error("Flag not found");
    flag.enabled = enabled;
    return this.flags.save(flag);
  }

  async listUsers(): Promise<User[]> {
    return this.users.find({ order: { createdAt: "DESC" }, take: 100 });
  }

  async listOrgs(): Promise<Organization[]> {
    return this.orgs.find({ order: { createdAt: "DESC" }, take: 100 });
  }

  async platformStats(): Promise<Record<string, number>> {
    const [users, orgs, activeSubs] = await Promise.all([
      this.users.count(),
      this.orgs.count(),
      this.subs.count({ where: { status: SubscriptionStatus.ACTIVE } }),
    ]);
    return { users, organizations: orgs, activeSubscriptions: activeSubs };
  }
}
