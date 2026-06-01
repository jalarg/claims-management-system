import { BadRequestException, ValidationPipe } from '@nestjs/common';
import * as classTransformer from 'class-transformer';
import * as classValidator from 'class-validator';
import type { ValidationError } from 'class-validator';

interface ValidationErrorDetail {
  field: string;
  message: string;
}

export function createApiValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    validatorPackage: classValidator,
    transformerPackage: classTransformer,
    exceptionFactory: (errors: ValidationError[]) =>
      new BadRequestException({
        statusCode: 400,
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: flattenValidationErrors(errors),
      }),
  });
}

function flattenValidationErrors(errors: ValidationError[], parentPath = ''): ValidationErrorDetail[] {
  return errors.flatMap((error) => {
    const field = parentPath === '' ? error.property : `${parentPath}.${error.property}`;
    const details = Object.values(error.constraints ?? {}).map((message) => ({ field, message }));
    const childDetails = flattenValidationErrors(error.children ?? [], field);

    return [...details, ...childDetails];
  });
}
