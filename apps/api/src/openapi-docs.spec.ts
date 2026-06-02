import type { INestApplication } from '@nestjs/common';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { configureOpenApiDocs } from './openapi-docs';

describe('configureOpenApiDocs', () => {
  let tempDir: string;
  let contractPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'claims-openapi-'));
    contractPath = join(tempDir, 'openapi.yaml');
    writeFileSync(contractPath, 'openapi: 3.0.3\ninfo:\n  title: Test\n');
  });

  afterEach(() => {
    rmSync(tempDir, { force: true, recursive: true });
  });

  it('registers Swagger UI and serves the existing OpenAPI YAML', () => {
    const expressApp = { get: jest.fn(), use: jest.fn() };
    const app = {
      getHttpAdapter: () => ({ getInstance: () => expressApp }),
    } as unknown as INestApplication;

    configureOpenApiDocs(app, contractPath);

    expect(expressApp.get).toHaveBeenCalledTimes(2);
    expect(expressApp.use).toHaveBeenCalledTimes(1);
    expect(expressApp.get.mock.calls[0][0]).toBe('/docs/openapi.yaml');
    expect(typeof expressApp.get.mock.calls[0][1]).toBe('function');
    expect(expressApp.get.mock.calls[1][0]).toBe('/docs');
    expect(typeof expressApp.get.mock.calls[1][1]).toBe('function');
    expect(expressApp.use.mock.calls[0][0]).toBe('/docs');
    expect(expressApp.use.mock.calls[0][1]).toBeDefined();
    expect(typeof expressApp.use.mock.calls[0][2]).toBe('function');

    const yamlHandler = expressApp.get.mock.calls[0][1] as (
      request: unknown,
      response: { type: jest.Mock; send: jest.Mock },
    ) => void;
    const response = {
      type: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    yamlHandler({}, response);

    expect(response.type).toHaveBeenCalledWith('application/yaml');
    expect(response.send).toHaveBeenCalledWith(
      'openapi: 3.0.3\ninfo:\n  title: Test\n',
    );
  });

  it('fails clearly when the OpenAPI YAML cannot be loaded', () => {
    expect(() =>
      configureOpenApiDocs(
        {
          getHttpAdapter: () => ({ getInstance: () => ({ get: jest.fn() }) }),
        } as unknown as INestApplication,
        join(tempDir, 'missing.yaml'),
      ),
    ).toThrow(/Unable to load OpenAPI contract/);
  });
});
