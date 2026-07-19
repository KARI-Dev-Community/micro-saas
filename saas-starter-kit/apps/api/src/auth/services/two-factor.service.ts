import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as speakeasy from "speakeasy";
import { User } from "../entities/user.entity";
import { Passkey } from "../entities/passkey.entity";
import { TwoFactorMethod } from "@shared/enums";
import { AuditService } from "../../audit/audit.service";

// TOTP (authenticator apps) + WebAuthn passkey management.
// NOTE: WebAuthn challenge/verify uses @simplewebauthn in production;
// this module provides the storage + challenge scaffolding.
@Injectable()
export class TwoFactorService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Passkey) private readonly passkeys: Repository<Passkey>,
    private readonly audit: AuditService
  ) {}

  async enableTotp(userId: string): Promise<{ secret: string; otpauth: string }> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException("User not found");
    const secret = speakeasy.generateSecret({ name: `SaaS (${user.email})` });
    user.twoFactorSecret = secret.base32;
    await this.users.save(user);
    return { secret: secret.base32, otpauth: secret.otpauth_url! };
  }

  async confirmTotp(userId: string, code: string): Promise<void> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) throw new BadRequestException("TOTP not initialized");
    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: code,
      window: 1,
    });
    if (!valid) throw new BadRequestException("Invalid code");
    user.twoFactorEnabled = true;
    user.twoFactorMethod = TwoFactorMethod.TOTP;
    await this.users.save(user);
    await this.audit.record("security", "2fa_enabled", { actorId: userId }, { entityType: "user", entityId: userId });
  }

  async verifyTotp(userId: string, code: string): Promise<boolean> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) return false;
    return speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: "base32", token: code, window: 1 });
  }

  async disableTotp(userId: string): Promise<void> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) return;
    user.twoFactorEnabled = false;
    user.twoFactorMethod = TwoFactorMethod.NONE;
    user.twoFactorSecret = null;
    await this.users.save(user);
  }

  // --- Passkeys (WebAuthn) ---
  async registerPasskey(input: {
    userId: string;
    credentialId: string;
    publicKey: string;
    counter: number;
    deviceName?: string;
    transports?: string;
  }): Promise<Passkey> {
    const pk = this.passkeys.create(input);
    const saved = await this.passkeys.save(pk);
    await this.audit.record("security", "passkey_added", { actorId: input.userId }, { entityType: "passkey", entityId: saved.id });
    return saved;
  }

  async listPasskeys(userId: string): Promise<Passkey[]> {
    return this.passkeys.find({ where: { userId } });
  }

  async removePasskey(userId: string, id: string): Promise<void> {
    await this.passkeys.delete({ id, userId });
  }

  async findPasskeyByCredential(credentialId: string): Promise<Passkey | null> {
    return this.passkeys.findOne({ where: { credentialId } });
  }
}
