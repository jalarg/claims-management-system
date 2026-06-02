import type { INestApplication } from '@nestjs/common';
import type { Express, Request, Response } from 'express';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import swaggerUi = require('swagger-ui-express');

export const openApiContractPath = resolve(
  __dirname,
  '..',
  '..',
  '..',
  'docs',
  'openapi.yaml',
);

export function configureOpenApiDocs(
  app: INestApplication,
  contractPath = openApiContractPath,
): void {
  const openApiYaml = loadOpenApiContract(contractPath);
  const expressApp = app.getHttpAdapter().getInstance() as Express;
  const swaggerUiHandler = swaggerUi.setup(undefined, {
    customSiteTitle: 'Claims Management API Docs',
    swaggerOptions: {
      url: '/docs/openapi.yaml',
    },
  });

  expressApp.get('/docs/openapi.yaml', (_request: Request, response: Response) => {
    response.type('application/yaml').send(openApiYaml);
  });
  expressApp.get('/docs', swaggerUiHandler);
  expressApp.use('/docs', swaggerUi.serve, swaggerUiHandler);
}

function loadOpenApiContract(contractPath: string): string {
  try {
    return readFileSync(contractPath, 'utf8');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(
      `Unable to load OpenAPI contract from ${contractPath}: ${message}`,
    );
  }
}
