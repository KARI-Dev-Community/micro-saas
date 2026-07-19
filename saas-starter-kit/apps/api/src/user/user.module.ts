import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../auth/entities/user.entity";
import { UserProfile } from "../auth/entities/user-profile.entity";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";
import { TenantModule } from "../tenant/tenant.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [TypeOrmModule.forFeature([User, UserProfile]), TenantModule, AuditModule],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
