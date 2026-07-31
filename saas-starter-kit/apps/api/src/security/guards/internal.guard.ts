import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { Request } from "express";
import { createHmac, timingSafeEqual } from "crypto";

export const INTERNAL_SIGNATURE_HEADER = "x-internal-signature";
export const INTERNAL_TIMESTAMP_HEADER = "x-internal-timestamp";

@Injectable()
export class InternalRequestGuard implements CanActivate {
  private readonly logger = new Logger("InternalGuard");

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    const signature = req.headers[INTERNAL_SIGNATURE_HEADER] as string | undefined;
    const timestamp = req.headers[INTERNAL_TIMESTAMP_HEADER] as string | undefined;

    if (!signature || !timestamp) {
      throw new UnauthorizedException("Missing internal request signature");
    }

    const secret = process.env.INTERNAL_SIGNING_SECRET;
    if (!secret) {
      this.logger.warn("INTERNAL_SIGNING_SECRET not set; internal guard disabled");
      return true;
    }

    const now = Date.now();
    const ts = parseInt(timestamp, 10);
    const tolerance = parseInt(process.env.INTERNAL_TOLERANCE_MS ?? "300000", 10);

    if (Math.abs(now - ts) > tolerance) {
      throw new UnauthorizedException("Internal request timestamp expired");
    }

    const method = req.method;
    const url = req.originalUrl;
    const body = JSON.stringify(req.body ?? {});
    const message = `${method}:${url}:${timestamp}:${body}`;

    const expected = createHmac("sha256", secret).update(message).digest("hex");

    try {
      const sigBuffer = Buffer.from(signature, "hex");
      const expectedBuffer = Buffer.from(expected, "hex");
      if (sigBuffer.length !== expectedBuffer.length) {
        throw new UnauthorizedException("Invalid internal signature");
      }
      if (!timingSafeEqual(sigBuffer, expectedBuffer)) {
        throw new UnauthorizedException("Invalid internal signature");
      }
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException("Invalid internal signature");
    }

    this.logger.log(`Internal request verified: ${method} ${url}`);
    return true;
  }
}