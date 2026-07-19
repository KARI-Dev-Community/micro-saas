import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RbacService } from "../../tenant/rbac.service";
import { AccessTokenPayload } from "../../auth/services/token.service";

export const PERMISSIONS_KEY = "permissions";
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const REQUIRE_ALL = "requireAll";
export const PermissionMode = (mode: "all" | "any") => SetMetadata(REQUIRE_ALL, mode === "all");

// Enforces RBAC: resolves the user's permissions for the active org and
// checks them against the @Permissions() metadata. Super Admin bypasses.
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbac: RbacService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as AccessTokenPayload;
    if (!user) throw new UnauthorizedException();

    const organizationId =
      (req.headers["x-organization-id"] as string) || user.organizationId;
    if (!organizationId) {
      throw new ForbiddenException("No active organization context");
    }

    const mode = this.reflector.getAllAndOverride<boolean>(REQUIRE_ALL, [
      context.getHandler(),
      context.getClass(),
    ]);

    const { role, permissions } = await this.rbac.getUserPermissions(user.sub, organizationId);

    if (role === ("super_admin" as any)) return true;

    const ok = mode
      ? required.every((p) => permissions.includes(p))
      : required.some((p) => permissions.includes(p));

    if (!ok) {
      throw new ForbiddenException(
        `Missing required permission(s): ${required.join(", ")}`
      );
    }
    return true;
  }
}
