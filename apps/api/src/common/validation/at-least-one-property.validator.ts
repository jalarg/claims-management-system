import { ValidatorConstraint, Validate } from 'class-validator';
import type { ValidationArguments, ValidatorConstraintInterface, ValidationOptions } from 'class-validator';

@ValidatorConstraint({ name: 'atLeastOneProperty', async: false })
class AtLeastOnePropertyConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const propertyNames = args.constraints.filter((constraint): constraint is string => typeof constraint === 'string');
    const object = args.object as Record<string, unknown>;

    return propertyNames.some((propertyName) => object[propertyName] !== undefined);
  }

  defaultMessage(args: ValidationArguments): string {
    return `At least one of ${args.constraints.join(', ')} must be provided`;
  }
}

export function AtLeastOneProperty(
  propertyNames: readonly string[],
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return Validate(AtLeastOnePropertyConstraint, [...propertyNames], validationOptions);
}
