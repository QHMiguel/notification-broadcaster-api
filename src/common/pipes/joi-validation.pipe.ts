import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import * as Joi from 'joi';

@Injectable()
export class JoiValidationPipe implements PipeTransform {
  constructor(private schema: Joi.ObjectSchema) {}

  transform(value: any, metadata: ArgumentMetadata) {
    const { error, value: validatedValue } = this.schema.validate(value, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      throw new BadRequestException({
        message: 'Errores de validación',
        errors: errorMessages
      });
    }

    return validatedValue;
  }
}

/**
 * Factory function para crear pipes de validación Joi más fácilmente
 */
export function createJoiValidationPipe(schema: Joi.ObjectSchema) {
  return new JoiValidationPipe(schema);
}
