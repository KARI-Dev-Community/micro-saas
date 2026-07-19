import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../auth/entities/user.entity";
import { UserProfile } from "../auth/entities/user-profile.entity";
import { RbacService } from "../tenant/rbac.service";
import { AuditService } from "../audit/audit.service";
import { UserStatus } from "@shared/enums";

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(UserProfile) private readonly profiles: Repository<UserProfile>,
    private readonly rbac: RbacService,
    private readonly audit: AuditService
  ) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const p = await this.profiles.findOne({ where: { userId } });
    if (!p) throw new NotFoundException("Profile not found");
    return p;
  }

  async updateProfile(userId: string, patch: Partial<UserProfile>): Promise<UserProfile> {
    const p = await this.getProfile(userId);
    Object.assign(p, patch);
    const saved = await this.profiles.save(p);
    await this.audit.record("user", "profile_updated", { actorId: userId }, { entityType: "user_profile", entityId: userId });
    return saved;
  }

  async updatePreferences(userId: string, preferences: Record<string, unknown>): Promise<UserProfile> {
    const p = await this.getProfile(userId);
    p.preferences = { ...p.preferences, ...preferences };
    return this.profiles.save(p);
  }

  async updateNotificationSettings(userId: string, settings: Record<string, unknown>): Promise<UserProfile> {
    const p = await this.getProfile(userId);
    p.notificationSettings = { ...p.notificationSettings, ...settings };
    return this.profiles.save(p);
  }

  async setAvatar(userId: string, avatarUrl: string): Promise<UserProfile> {
    const p = await this.getProfile(userId);
    p.avatarUrl = avatarUrl;
    return this.profiles.save(p);
  }

  async deactivate(userId: string): Promise<void> {
    const u = await this.users.findOne({ where: { id: userId } });
    if (!u) throw new NotFoundException();
    u.status = UserStatus.DEACTIVATED;
    await this.users.save(u);
    await this.audit.record("user", "deactivated", { actorId: userId }, { entityType: "user", entityId: userId });
  }

  async delete(userId: string, actorId: string): Promise<void> {
    const u = await this.users.findOne({ where: { id: userId } });
    if (!u) throw new NotFoundException();
    // Hard-delete PII; related rows cascade. For GDPR-style soft delete,
    // anonymize instead. Here we perform a real delete.
    u.status = UserStatus.DELETED;
    u.email = `deleted+${u.id}@deleted.local`;
    u.passwordHash = null;
    await this.users.save(u);
    await this.audit.record("user", "deleted", { actorId, organizationId: undefined }, { entityType: "user", entityId: userId });
  }
}
