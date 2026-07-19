import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ApiResponse } from "@shared/response";

// Wraps every successful controller return value in the standard envelope:
// { success, message, data, meta }.
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((payload) => {
        if (
          payload &&
          typeof payload === "object" &&
          "success" in payload &&
          "message" in payload
        ) {
          return payload as ApiResponse;
        }
        return { success: true, message: "Success", data: payload ?? null, meta: null };
      })
    );
  }
}
