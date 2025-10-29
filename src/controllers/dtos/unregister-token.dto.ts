import { ApiProperty } from '@nestjs/swagger';
import * as Joi from 'joi';
import { IApiGlobalResponse } from 'src/common/interfaces/global.interface';

/**
 * DTO para eliminar token FCM
 */
export class UnregisterTokenDto {
  @ApiProperty({
    description: 'ID del documento en Firestore (preferido)',
    example: 'abc123xyz789',
    type: String,
    required: false
  })
  id?: string;

  @ApiProperty({
    description: 'Token FCM a eliminar (alternativo si no se tiene el ID)',
    example: 'eXK8j9...',
    type: String,
    required: false
  })
  token?: string;
}

/**
 * Response al eliminar token
 */
export type UnregisterTokenResponse = IApiGlobalResponse<null>;

/**
 * Schema de validación Joi para UnregisterTokenDto
 */
export const UnregisterTokenSchema = Joi.object<UnregisterTokenDto>({
  id: Joi.string()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'El ID debe tener al menos 1 carácter',
      'string.max': 'El ID no puede tener más de 100 caracteres'
    }),
  token: Joi.string()
    .min(10)
    .max(1000)
    .optional()
    .messages({
      'string.min': 'El token debe tener al menos 10 caracteres',
      'string.max': 'El token no puede tener más de 1000 caracteres'
    })
}).or('id', 'token').messages({
  'object.missing': 'Debe proporcionar al menos un id o token'
});

