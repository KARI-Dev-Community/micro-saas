import {
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AccessTokenPayload } from "../../auth/services/token.service";

// Validates the Bearer access token and attaches `request.user`.
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  handleRequest<TUser = any>(err: any, user: any, _info: any, context: ExecutionContext): TUser {
    if (err || !user) {
      throw new UnauthorizedException("Authentication required");
    }
    return user as TUser;
  }
}

// Current authenticated user (JWT payload).
export const AuthUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccessTokenPayload => {
    const req = ctx.switchToHttp().getRequest();
    if (!req.user) throw new UnauthorizedException();
    return req.user;
  }
);

// Active organization id, from header `x-organization-id` or JWT claim.
export const CurrentOrganization = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest();
    return (req.headers["x-organization-id"] as string) || req.user?.organizationId;
  }
);
