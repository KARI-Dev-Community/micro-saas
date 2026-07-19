import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { randomUUID } from "crypto";
import * as bcrypt from "bcryptjs";
import { User } from "../entities/user.entity";
import { UserProfile } from "../entities/user-profile.entity";
import { Session } from "../entities/session.entity";
import { TokenService, TokenPair } from "./token.service";
import { EmailService } from "../../email/email.service";
import { AuditService } from "../../audit/audit.service";
import { RedisService } from "../../core/redis/redis.service";
import * as jwt from "jsonwebtoken";
import { ConfigService } from "@nestjs/config";
import { AuthProvider, UserStatus, TwoFactorMethod } from "@shared/enums";

export interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(UserProfile) private readonly profiles: Repository<UserProfile>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    private readonly token: TokenService,
    private readonly email: EmailService,
    private readonly audit: AuditService,
    private readonly redis: RedisService,
    private readonly config: ConfigService
  ) {}

  private async hashPassword(pw: string): Promise<string> {
    return bcrypt.hash(pw, 10);
  }

  async register(input: RegisterInput, ctx: { ip: string; ua: string }): Promise<User> {
    const email = input.email.toLowerCase().trim();
    const existing = await this.users.findOne({ where: { email } });
    if (existing) throw new ConflictException("Email already registered");

    const user = this.users.create({
      email,
      passwordHash: await this.hashPassword(input.password),
      provider: AuthProvider.EMAIL,
      status: UserStatus.PENDING,
      emailVerified: false,
    });
    await this.users.save(user);

    await this.profiles.save(
      this.profiles.create({
        userId: user.id,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        notificationSettings: {
          email: true,
          inApp: true,
          productUpdates: true,
          securityAlerts: true,
        },
      })
    );

    await this.sendVerificationEmail(user);
    await this.audit.record("auth", "register", { actorId: user.id, ipAddress: ctx.ip, userAgent: ctx.ua }, {
      entityType: "user",
      entityId: user.id,
    });
    return user;
  }

  async sendVerificationEmail(user: User): Promise<void> {
    const token = randomUUID();
    user.emailVerificationToken = token;
    user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 3600 * 1000);
    await this.users.save(user);
    const link = `${this.config.get("app.frontendUrl")}/verify-email?token=${token}`;
    await this.email.send({ to: user.email, subject: "Verify your email", template: "verify_email", context: { link } });
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.users.findOne({ where: { emailVerificationToken: token } });
    if (!user || (user.emailVerificationExpiresAt && user.emailVerificationExpiresAt < new Date())) {
      throw new BadRequestException("Invalid or expired verification token");
    }
    user.emailVerified = true;
    user.status = UserStatus.ACTIVE;
    user.emailVerificationToken = null;
    await this.users.save(user);
    await this.audit.record("auth", "email_verified", { actorId: user.id }, { entityType: "user", entityId: user.id });
  }

  async login(
    email: string,
    password: string,
    ctx: { ip: string; ua: string; device?: string }
  ): Promise<TokenPair & { user: User }> {
    const user = await this.users.findOne({ where: { email: email.toLowerCase().trim() } });
    if (!user || !user.passwordHash) throw new UnauthorizedError();
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      await this.audit.record("auth", "login_failed", { actorId: user.id, ipAddress: ctx.ip }, { entityType: "user", entityId: user.id });
      throw new UnauthorizedError();
    }
    if (user.status === UserStatus.SUSPENDED) throw new BadRequestException("Account suspended");
    if (user.twoFactorEnabled && user.twoFactorMethod !== TwoFactorMethod.NONE) {
      // Require a 2FA step before issuing tokens. Return a challenge marker.
      throw new TwoFactorRequiredError(user.id);
    }
    const tokens = await this.issueTokens(user, ctx);
    await this.audit.record("auth", "login", { actorId: user.id, ipAddress: ctx.ip, userAgent: ctx.ua }, { entityType: "user", entityId: user.id });
    return { ...tokens, user };
  }

  // Issues access + refresh tokens and persists a Session row + Redis refresh key.
  async issueTokens(
    user: User,
    ctx: { ip: string; ua: string; device?: string },
    organizationId?: string,
    perms: string[] = []
  ): Promise<TokenPair> {
    const tokens = await this.token.signAccessToken(user, perms, organizationId);
    const refreshPayload = jwt.decode(tokens.refreshToken) as { jti: string } | null;
    const jti = refreshPayload?.jti;
    if (!jti) throw new UnauthorizedError();
    const session = this.sessions.create({
      userId: user.id,
      tokenId: jti,
      ipAddress: ctx.ip,
      userAgent: ctx.ua,
      deviceName: ctx.device,
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      isActive: true,
      current: true,
    });
    await this.sessions.save(session);
    // Store refresh token hash in Redis for fast revocation.
    await this.redis.set(`refresh:${jti}`, user.id, 30 * 24 * 3600);
    return tokens;
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, this.config.getOrThrow("app.jwtSecret"));
    } catch {
      throw new UnauthorizedError();
    }
    const session = await this.sessions.findOne({ where: { tokenId: decoded.jti, isActive: true } });
    if (!session) throw new UnauthorizedError();
    const redisUid = await this.redis.get(`refresh:${decoded.jti}`);
    if (!redisUid) throw new UnauthorizedError();
    const user = await this.users.findOne({ where: { id: decoded.sub } });
    if (!user) throw new UnauthorizedError();
    await this.sessions.update({ tokenId: decoded.jti }, { current: false });
    return this.issueTokens(user, { ip: session.ipAddress ?? "0.0.0.0", ua: session.userAgent ?? "" }, user.id);
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const decoded = jwt.verify(refreshToken, this.config.getOrThrow("app.jwtSecret")) as { jti: string };
      await this.sessions.update({ tokenId: decoded.jti }, { isActive: false, current: false });
      await this.redis.del(`refresh:${decoded.jti}`);
    } catch {
      /* ignore */
    }
  }

  async logoutAll(userId: string): Promise<void> {
    const sessions = await this.sessions.find({ where: { userId, isActive: true } });
    await this.sessions.update({ userId, isActive: true }, { isActive: false, current: false });
    for (const s of sessions) await this.redis.del(`refresh:${s.tokenId}`);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findOne({ where: { email: email.toLowerCase().trim() } });
    if (!user) return; // do not reveal existence
    user.passwordResetToken = randomUUID();
    user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.users.save(user);
    const link = `${this.config.get("app.frontendUrl")}/reset-password?token=${user.passwordResetToken}`;
    await this.email.send({ to: user.email, subject: "Reset your password", template: "forgot_password", context: { link } });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.users.findOne({ where: { passwordResetToken: token } });
    if (!user || (user.passwordResetExpiresAt && user.passwordResetExpiresAt < new Date())) {
      throw new BadRequestException("Invalid or expired reset token");
    }
    user.passwordHash = await this.hashPassword(newPassword);
    user.passwordResetToken = null;
    user.passwordResetExpiresAt = null;
    await this.users.save(user);
    await this.audit.record("auth", "password_reset", { actorId: user.id }, { entityType: "user", entityId: user.id });
  }

  async changePassword(userId: string, current: string, next: string): Promise<void> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || !user.passwordHash) throw new NotFoundException("User not found");
    const ok = await bcrypt.compare(current, user.passwordHash);
    if (!ok) throw new BadRequestException("Current password is incorrect");
    user.passwordHash = await this.hashPassword(next);
    await this.users.save(user);
    await this.audit.record("auth", "password_changed", { actorId: userId }, { entityType: "user", entityId: userId });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email: email.toLowerCase().trim() } });
  }
}

class UnauthorizedError extends BadRequestException {
  constructor() {
    super("Invalid credentials");
  }
}

export class TwoFactorRequiredError extends BadRequestException {
  constructor(public readonly userId: string) {
    super("Two-factor authentication required");
  }
}
