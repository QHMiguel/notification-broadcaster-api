import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';
import { IApiGlobalResponse } from 'src/common/interfaces/global.interface';

/**
 * Payload de notificación
 */
export class NotificationPayload {
  @ApiProperty({
    description: 'Título de la notificación',
    example: '¡Hola Usuario!',
    type: String
  })
  title: string;

  @ApiProperty({
    description: 'Cuerpo/contenido de la notificación',
    example: 'Esta es una notificación de prueba 🚀',
    type: String
  })
  body: string;

  @ApiPropertyOptional({
    description: 'URL del ícono de la notificación',
    example: 'https://via.placeholder.com/128',
    default: 'https://via.placeholder.com/128'
  })
  icon?: string;

  @ApiPropertyOptional({
    description: 'URL de imagen adicional para la notificación',
    example: 'https://via.placeholder.com/512x256'
  })
  image?: string;

  @ApiPropertyOptional({
    description: 'Datos adicionales de la notificación',
    example: {
      type: 'info',
      priority: 'medium',
      category: 'general'
    }
  })
  data?: {
    type?: string;
    priority?: string;
    category?: string;
    [key: string]: any;
  };
}

/**
 * DTO para enviar notificación
 */
export class SendNotificationDto {
  @ApiProperty({
    description: 'ID del usuario destinatario',
    example: 'pvega',
    type: String
  })
  userId: string;

  @ApiProperty({
    description: 'ID del sistema que envía la notificación',
    example: 'portal-sistemas',
    type: String
  })
  systemId: string;

  @ApiProperty({
    description: 'Contenido de la notificación',
    type: NotificationPayload
  })
  notification: NotificationPayload;
}

/**
 * Data del envío de notificación
 */
export interface NotificationSendData {
  notificationId: string;
  sent: number;
  failed: number;
  totalTokens: number;
}

/**
 * Response al enviar notificación
 */
export type SendNotificationResponse = IApiGlobalResponse<NotificationSendData>;

/**
 * Schema de validación Joi para NotificationPayload
 */
const NotificationPayloadSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.base': 'El título debe ser un texto',
      'string.empty': 'El título no puede estar vacío',
      'string.min': 'El título debe tener al menos 1 carácter',
      'string.max': 'El título no puede tener más de 200 caracteres',
      'any.required': 'El título es requerido'
    }),
  body: Joi.string()
    .min(1)
    .max(500)
    .required()
    .messages({
      'string.base': 'El cuerpo debe ser un texto',
      'string.empty': 'El cuerpo no puede estar vacío',
      'string.min': 'El cuerpo debe tener al menos 1 carácter',
      'string.max': 'El cuerpo no puede tener más de 500 caracteres',
      'any.required': 'El cuerpo es requerido'
    }),
  icon: Joi.string()
    .uri()
    .optional()
    .default('https://via.placeholder.com/128')
    .messages({
      'string.uri': 'El ícono debe ser una URL válida'
    }),
  image: Joi.string()
    .uri()
    .allow(null, '')
    .optional()
    .messages({
      'string.uri': 'La imagen debe ser una URL válida'
    }),
  data: Joi.object({
    type: Joi.string()
      .valid('info', 'warning', 'error', 'success')
      .optional()
      .default('info')
      .messages({
        'any.only': 'El tipo debe ser: info, warning, error o success'
      }),
    priority: Joi.string()
      .valid('low', 'medium', 'high', 'urgent')
      .optional()
      .default('medium')
      .messages({
        'any.only': 'La prioridad debe ser: low, medium, high o urgent'
      }),
    category: Joi.string()
      .valid('general', 'alert', 'reminder', 'promotion', 'system')
      .optional()
      .default('general')
      .messages({
        'any.only': 'La categoría debe ser: general, alert, reminder, promotion o system'
      })
  })
    .unknown(true)
    .optional()
    .default({ type: 'info', priority: 'medium', category: 'general' })
});

/**
 * Schema de validación Joi para SendNotificationDto
 */
export const SendNotificationSchema = Joi.object<SendNotificationDto>({
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
  notification: NotificationPayloadSchema.required()
    .messages({
      'any.required': 'La notificación es requerida'
    })
});

