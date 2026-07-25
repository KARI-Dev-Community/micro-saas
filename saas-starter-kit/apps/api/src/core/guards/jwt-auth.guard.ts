import {
  createParamDecorator,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { AccessTokenPayload } from "../../auth/services/token.service";

/** Mark a route/controller as public (skips global JwtAuthGuard). */
export const Public = () => SetMetadata("public", true);

// Validates the Bearer access token and attaches `request.user`.
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride("public", [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  handleRequest<TUser = any>(err: any, user: any, _info: any, _context: ExecutionContext): TUser {
    if (err || !user) {
      throw new UnauthorizedException("Authentication required");
    }
    return user as TUser;
  }
}

// Current authenticated user (JWT payload).
/** Extract the authenticated user from the request. */
export const AuthUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccessTokenPayload => {
    const req = ctx.switchToHttp().getRequest();
    if (!req.user) throw new UnauthorizedException();
    return req.user;
  }
);

// Active organization id, from header `x-organization-id` or JWT claim.
/** Resolve the active organization id from header or JWT claim. */
export const CurrentOrganization = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest();
    return (req.headers["x-organization-id"] as string) || req.user?.organizationId;
  }
);
