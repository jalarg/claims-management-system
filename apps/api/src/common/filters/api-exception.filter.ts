import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

import {
  DamageManagementNotAllowedError,
  DamageNotFoundError,
  DomainError,
  FinishClaimPolicyViolationError,
  InvalidClaimStatusTransitionError,
  InvalidDamagePriceError,
  InvalidDamageScoreError,
} from '../../claims/domain';

interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
}

interface JsonResponse {
  status(statusCode: number): {
    json(body: ErrorResponseBody): void;
  };
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<JsonResponse>();
    const body = ApiExceptionFilter.toResponseBody(exception);

    response.status(body.statusCode).json(body);
  }

  private static toResponseBody(exception: unknown): ErrorResponseBody {
    if (exception instanceof InvalidClaimStatusTransitionError) {
      return ApiExceptionFilter.createBody(HttpStatus.CONFLICT, 'INVALID_STATE_TRANSITION', exception.message);
    }

    if (exception instanceof DamageManagementNotAllowedError) {
      return ApiExceptionFilter.createBody(HttpStatus.CONFLICT, 'DAMAGE_MANAGEMENT_NOT_ALLOWED', exception.message);
    }

    if (exception instanceof DamageNotFoundError) {
      return ApiExceptionFilter.createBody(HttpStatus.NOT_FOUND, 'NOT_FOUND', exception.message);
    }

    if (exception instanceof FinishClaimPolicyViolationError) {
      return ApiExceptionFilter.createBody(HttpStatus.UNPROCESSABLE_ENTITY, 'BUSINESS_RULE_VIOLATION', exception.message);
    }

    if (exception instanceof InvalidDamagePriceError || exception instanceof InvalidDamageScoreError) {
      return ApiExceptionFilter.createBody(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', exception.message);
    }

    if (exception instanceof HttpException) {
      return ApiExceptionFilter.fromHttpException(exception);
    }

    if (exception instanceof DomainError) {
      return ApiExceptionFilter.createBody(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', exception.message);
    }

    return ApiExceptionFilter.createBody(
      HttpStatus.INTERNAL_SERVER_ERROR,
      'INTERNAL_ERROR',
      'Unexpected server error',
    );
  }

  private static fromHttpException(exception: HttpException): ErrorResponseBody {
    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    if (ApiExceptionFilter.isErrorResponseBody(exceptionResponse)) {
      return exceptionResponse;
    }

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const response = exceptionResponse as Record<string, unknown>;

      return {
        statusCode,
        error: typeof response.error === 'string' ? response.error : exception.name,
        message: ApiExceptionFilter.toMessage(response.message, exception.message),
        details: response.details,
      };
    }

    return ApiExceptionFilter.createBody(statusCode, exception.name, exception.message);
  }

  private static isErrorResponseBody(value: unknown): value is ErrorResponseBody {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const body = value as Record<string, unknown>;

    return (
      typeof body.statusCode === 'number' && typeof body.error === 'string' && typeof body.message === 'string'
    );
  }

  private static toMessage(message: unknown, fallback: string): string {
    if (typeof message === 'string') {
      return message;
    }

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    return fallback;
  }

  private static createBody(statusCode: number, error: string, message: string): ErrorResponseBody {
    return { statusCode, error, message };
  }
}
