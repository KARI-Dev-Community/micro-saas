import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ApiResponse } from "@shared/response";

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
  code?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("HttpException");

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let code: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as ErrorBody | string;
      if (typeof res === "string") {
        message = res;
      } else {
        message = Array.isArray(res.message) ? res.message.join(", ") : res.message;
        code = res.code;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url} -> ${status}: ${message}`);
    }

    const body: ApiResponse = {
      success: false,
      message,
      data: code ? { code } : null,
      meta: null,
    };

    response.status(status).json(body);
  }
}
