import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';
import { IApiGlobalResponse } from 'src/common/interfaces/global.interface';

/**
 * Información del dispositivo
 */
export class DeviceInfo {
  @ApiPropertyOptional({
    description: 'Navegador utilizado',
    example: 'Chrome 120.0.0'
  })
  browser?: string;

  @ApiPropertyOptional({
    description: 'Sistema operativo',
    example: 'Windows 10'
  })
  os?: string;

  @ApiPropertyOptional({
    description: 'User Agent completo',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  })
  userAgent?: string;

  @ApiPropertyOptional({
    description: 'Nombre del dispositivo',
    example: 'PC-DESKTOP-001'
  })
  deviceName?: string;
}

/**
 * DTO para guardar/actualizar token FCM
 */
export class RegisterTokenDto {
  @ApiPropertyOptional({
    description: 'ID del documento en Firestore (si existe, se actualiza; si no, se crea uno nuevo)',
    example: 'abc123xyz789',
    type: String
  })
  id?: string;

  @ApiProperty({
    description: 'ID del usuario',
    example: 'pvega',
    type: String
  })
  userId: string;

  @ApiProperty({
    description: 'ID del sistema/frontend al que pertenece el token',
    example: 'portal-sistemas',
    type: String
  })
  systemId: string;

  @ApiProperty({
    description: 'Token FCM del dispositivo',
    example: 'eXK8j9...',
    type: String
  })
  token: string;

  @ApiPropertyOptional({
    description: 'Información adicional del dispositivo',
    type: DeviceInfo
  })
  deviceInfo?: DeviceInfo;
}

/**
 * Data del token registrado
 */
export interface TokenData {
  id: string;
  userId: string;
  systemId: string;
  token: string;
  deviceInfo?: any;
  createdAt: string;
  lastUsed: string;
  isNewRegistration: boolean;
}

/**
 * Response al guardar/actualizar token
 */
export type RegisterTokenResponse = IApiGlobalResponse<TokenData>;

/**
 * Schema de validación Joi para DeviceInfo
 */
const DeviceInfoSchema = Joi.object({
  browser: Joi.string()
    .max(100)
    .optional()
    .allow(null, '')
    .messages({
      'string.max': 'El navegador no puede tener más de 100 caracteres'
    }),
  os: Joi.string()
    .max(100)
    .optional()
    .allow(null, '')
    .messages({
      'string.max': 'El sistema operativo no puede tener más de 100 caracteres'
    }),
  userAgent: Joi.string()
    .max(500)
    .optional()
    .allow(null, '')
    .messages({
      'string.max': 'El user agent no puede tener más de 500 caracteres'
    }),
  deviceName: Joi.string()
    .max(100)
    .optional()
    .allow(null, '')
    .messages({
      'string.max': 'El nombre del dispositivo no puede tener más de 100 caracteres'
    })
});

/**
 * Schema de validación Joi para RegisterTokenDto (save-token)
 */
export const RegisterTokenSchema = Joi.object<RegisterTokenDto>({
  id: Joi.string()
    .min(1)
    .max(100)
    .optional()
    .allow(null, '')
    .messages({
      'string.min': 'El ID debe tener al menos 1 carácter',
      'string.max': 'El ID no puede tener más de 100 caracteres'
    }),
  userId: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.base': 'El ID de usuario debe ser un texto',
      'string.empty': 'El ID de usuario no puede estar vacío',
      'string.min': 'El ID de usuario debe tener al menos 1 carácter',
      'string.max': 'El ID de usuario no puede tener más de 100 caracteres',
      'any.required': 'El ID de usuario es requerido'
    }),
  systemId: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.base': 'El ID de sistema debe ser un texto',
      'string.empty': 'El ID de sistema no puede estar vacío',
      'string.min': 'El ID de sistema debe tener al menos 1 carácter',
      'string.max': 'El ID de sistema no puede tener más de 100 caracteres',
      'any.required': 'El ID de sistema es requerido'
    }),
  token: Joi.string()
    .min(10)
    .max(1000)
    .required()
    .messages({
      'string.base': 'El token debe ser un texto',
      'string.empty': 'El token no puede estar vacío',
      'string.min': 'El token debe tener al menos 10 caracteres',
      'string.max': 'El token no puede tener más de 1000 caracteres',
      'any.required': 'El token es requerido'
    }),
  deviceInfo: DeviceInfoSchema.optional()
});

