import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { AccessTokenPayload } from "../services/token.service";

function getCookie(req: any, name: string): string | null {
  const raw = req?.headers?.cookie;
  if (!raw) return null;
  const match = raw.split(";").some((c: string) => c.trim().startsWith(name + "="));
  if (!match) return null;
  const m = raw.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: any) => {
          if (!req) return null;
          const authHeader = req.headers?.authorization;
          if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
          return getCookie(req, "saas_access_token");
        },
      ]),
      secretOrKey: config.getOrThrow<string>("app.jwtSecret"),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AccessTokenPayload> {
    return payload;
  }
}
