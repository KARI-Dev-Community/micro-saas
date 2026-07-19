import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { User } from "./entities/user.entity";
import { UserProfile } from "./entities/user-profile.entity";
import { Session } from "./entities/session.entity";
import { Passkey } from "./entities/passkey.entity";
import { AuthService } from "./services/auth.service";
import { TokenService } from "./services/token.service";
import { TwoFactorService } from "./services/two-factor.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { AuthController } from "./auth.controller";
import { SecurityController } from "./security.controller";
import { GoogleController } from "./google.controller";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EmailModule } from "../email/email.module";
import { AuditModule } from "../audit/audit.module";
import { RedisModule } from "../core/redis/redis.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserProfile, Session, Passkey]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("app.jwtSecret"),
        signOptions: { expiresIn: config.get<string>("app.jwtAccessExpiresIn") },
      }),
    }),
    EmailModule,
    AuditModule,
    RedisModule,
  ],
  providers: [AuthService, TokenService, TwoFactorService, JwtStrategy],
  controllers: [AuthController, SecurityController, GoogleController],
  exports: [AuthService, TokenService, TwoFactorService],
})
export class AuthModule {}
