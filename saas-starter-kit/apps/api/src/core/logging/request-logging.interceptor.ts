import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { ApiResponse } from "@shared/response";

// Logs method, path, status, and latency for every request (request logging).
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("Request");

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== "http") return next.handle();
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const start = Date.now();
    const { method, url } = req;

    return next.handle().pipe(
      tap({
        next: () => {
          const latency = Date.now() - start;
          this.logger.log(`${method} ${url} -> ${res.statusCode} (${latency}ms)`);
        },
        error: (err: any) => {
          const latency = Date.now() - start;
          const status = err?.status ?? 500;
          this.logger.error(`${method} ${url} -> ${status} (${latency}ms) ${err?.message ?? ""}`);
        },
      })
    );
  }
}
