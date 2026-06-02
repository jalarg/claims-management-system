import { BadRequestException } from '@nestjs/common';
import type { ArgumentMetadata } from '@nestjs/common';

import { createApiValidationPipe } from '../../common/pipes/api-validation.pipe';
import { DamageSeverity } from '../domain';
import { CreateDamageDto } from './create-damage.dto';
import { UpdateClaimDto } from './update-claim.dto';
import { UpdateDamageDto } from './update-damage.dto';

const updateClaimMetadata = {
  type: 'body',
  metatype: UpdateClaimDto,
  data: '',
} satisfies ArgumentMetadata;

const updateDamageMetadata = {
  type: 'body',
  metatype: UpdateDamageDto,
  data: '',
} satisfies ArgumentMetadata;

const createDamageMetadata = {
  type: 'body',
  metatype: CreateDamageDto,
  data: '',
} satisfies ArgumentMetadata;

async function captureValidationError(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
  const pipe = createApiValidationPipe();

  try {
    await pipe.transform(value, metadata);
  } catch (error) {
    return error;
  }

  return undefined;
}

describe('Update DTO validation', () => {
  it('rejects empty claim update bodies', async () => {
    const error = await captureValidationError({}, updateClaimMetadata);

    expect(error).toBeInstanceOf(BadRequestException);
  });

  it('rejects totalAmount in claim update bodies', async () => {
    const error = await captureValidationError({ totalAmount: 100 }, updateClaimMetadata);

    expect(error).toBeInstanceOf(BadRequestException);
  });

  it('accepts claim update bodies with title or description', async () => {
    const pipe = createApiValidationPipe();

    const result = await pipe.transform({ title: 'Updated claim' }, updateClaimMetadata);

    expect(result).toEqual({ title: 'Updated claim' });
  });

  it('rejects empty damage update bodies', async () => {
    const error = await captureValidationError({}, updateDamageMetadata);

    expect(error).toBeInstanceOf(BadRequestException);
  });

  it('rejects unknown properties in damage update bodies', async () => {
    const error = await captureValidationError({ unexpected: true }, updateDamageMetadata);

    expect(error).toBeInstanceOf(BadRequestException);
  });

  it('accepts damage update bodies with allowed damage fields', async () => {
    const pipe = createApiValidationPipe();

    const result = await pipe.transform(
      {
        part: 'Door',
        severity: DamageSeverity.Low,
        imageUrl: 'https://example.com/door.jpg',
        price: 125,
        score: 5,
      },
      updateDamageMetadata,
    );

    expect(result).toEqual({
      part: 'Door',
      severity: DamageSeverity.Low,
      imageUrl: 'https://example.com/door.jpg',
      price: 125,
      score: 5,
    });
  });

  it('transforms numeric create damage fields before validation', async () => {
    const pipe = createApiValidationPipe();

    const result = await pipe.transform(
      {
        part: 'Door',
        severity: DamageSeverity.Low,
        imageUrl: 'https://example.com/door.jpg',
        price: '125.5',
        score: '5',
      },
      createDamageMetadata,
    );

    expect(result).toEqual({
      part: 'Door',
      severity: DamageSeverity.Low,
      imageUrl: 'https://example.com/door.jpg',
      price: 125.5,
      score: 5,
    });
  });
});
