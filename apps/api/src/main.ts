import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { createApiValidationPipe } from './common/pipes/api-validation.pipe';
import { configureOpenApiDocs } from './openapi-docs';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
  });
  app.useGlobalPipes(createApiValidationPipe());
  app.useGlobalFilters(new ApiExceptionFilter());
  configureOpenApiDocs(app);
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
