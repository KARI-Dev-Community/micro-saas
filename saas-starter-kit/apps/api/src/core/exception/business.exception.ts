import { HttpException, HttpStatus } from "@nestjs/common";

// Thrown for domain-specific failures that should surface a clean error
// code to the client (e.g. LIMIT_REACHED, EMAIL_TAKEN).
export class BusinessException extends HttpException {
  constructor(message: string, public readonly code?: string, status = HttpStatus.BAD_REQUEST) {
    super(
      { statusCode: status, message, error: "BusinessError", code },
      status
    );
  }
}
