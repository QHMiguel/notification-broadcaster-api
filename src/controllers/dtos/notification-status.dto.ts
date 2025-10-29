import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import * as Joi from 'joi';
import { NotificationStatus } from 'src/common/constants/global.constant';
import { IApiGlobalResponse } from 'src/common/interfaces/global.interface';

/**
 * DTO para actualizar el estado de una notificación
 */
export class UpdateNotificationStatusDto {
  @ApiProperty({
    description: 'ID de la notificación',
    example: 'abc123...',
    type: String
  })
  notificationId: string;

  @ApiProperty({
    description: 'Nuevo estado de la notificación',
    enum: NotificationStatus,
    example: NotificationStatus.READ
  })
  status: NotificationStatus;

  @ApiPropertyOptional({
    description: 'Metadata adicional del cambio de estado',
    example: { source: 'web', device: 'desktop' }
  })
  metadata?: Record<string, any>;
}

/**
 * Data de actualización de estado
 */
export interface NotificationStatusData {
  notificationId: string;
  previousStatus?: NotificationStatus;
  newStatus: NotificationStatus;
}

/**
 * Respuesta al actualizar estado de notificación
 */
export type UpdateNotificationStatusResponse = IApiGlobalResponse<NotificationStatusData>;

/**
 * DTO para consultar notificaciones de un usuario
 */
export class GetUserNotificationsDto {
  @ApiProperty({
    description: 'ID del usuario',
    example: 'pvega',
    type: String
  })
  userId: string;

  @ApiProperty({
    description: 'ID del sistema',
    example: 'portal-sistemas',
    type: String
  })
  systemId: string;

  @ApiPropertyOptional({
    description: 'Filtrar por estado (opcional)',
    enum: NotificationStatus,
    example: NotificationStatus.SENT
  })
  status?: NotificationStatus;

  @ApiPropertyOptional({
    description: 'Límite de resultados',
    example: 50,
    default: 50,
    type: Number
  })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Para paginación (ID de última notificación)',
    example: 'xyz789...',
    type: String
  })
  startAfter?: string;
}

/**
 * Data de notificaciones del usuario
 */
export interface UserNotificationsData {
  notifications: NotificationWithStatus[];
  hasMore: boolean;
}

/**
 * Respuesta con notificaciones del usuario
 */
export type GetUserNotificationsResponse = IApiGlobalResponse<UserNotificationsData>;

/**
 * Notificación con información de estado
 */
export interface NotificationWithStatus {
  notificationId: string;
  userId: string;
  systemId: string;
  status: NotificationStatus;
  title: string;
  body: string;
  icon?: string;
  image?: string;
  data?: Record<string, any>;
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
}

/**
 * DTO para consultar historial de estados de una notificación
 */
export class GetNotificationHistoryDto {
  @ApiProperty({
    description: 'ID de la notificación',
    example: 'abc123...',
    type: String
  })
  notificationId: string;
}

/**
 * Data del historial de notificación
 */
export interface NotificationHistoryData {
  notificationId: string;
  history: NotificationStatusHistoryItem[];
}

/**
 * Respuesta con historial de estados
 */
export type GetNotificationHistoryResponse = IApiGlobalResponse<NotificationHistoryData>;

/**
 * Item del historial de estados
 */
export interface NotificationStatusHistoryItem {
  historyId: string;
  previousStatus?: NotificationStatus;
  newStatus: NotificationStatus;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Schema de validación Joi para UpdateNotificationStatusDto
 */
export const UpdateNotificationStatusSchema = Joi.object<UpdateNotificationStatusDto>({
  notificationId: Joi.string()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.base': 'El ID de notificación debe ser un texto',
      'string.empty': 'El ID de notificación no puede estar vacío',
      'string.min': 'El ID de notificación debe tener al menos 1 carácter',
      'string.max': 'El ID de notificación no puede tener más de 200 caracteres',
      'any.required': 'El ID de notificación es requerido'
    }),
  status: Joi.string()
    .valid(...Object.values(NotificationStatus))
    .required()
    .messages({
      'any.only': `El estado debe ser uno de: ${Object.values(NotificationStatus).join(', ')}`,
      'any.required': 'El estado es requerido'
    }),
  metadata: Joi.object()
    .unknown(true)
    .optional()
    .messages({
      'object.base': 'La metadata debe ser un objeto'
    })
});

/**
 * Schema de validación Joi para GetUserNotificationsDto
 */
export const GetUserNotificationsSchema = Joi.object<GetUserNotificationsDto>({
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
  status: Joi.string()
    .valid(...Object.values(NotificationStatus))
    .optional()
    .messages({
      'any.only': `El estado debe ser uno de: ${Object.values(NotificationStatus).join(', ')}`
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .messages({
      'number.base': 'El límite debe ser un número',
      'number.integer': 'El límite debe ser un número entero',
      'number.min': 'El límite debe ser al menos 1',
      'number.max': 'El límite no puede ser mayor a 100'
    }),
  startAfter: Joi.string()
    .max(200)
    .optional()
    .allow(null, '')
    .messages({
      'string.max': 'El startAfter no puede tener más de 200 caracteres'
    })
});

/**
 * Schema de validación Joi para GetNotificationHistoryDto
 */
export const GetNotificationHistorySchema = Joi.object<GetNotificationHistoryDto>({
  notificationId: Joi.string()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.base': 'El ID de notificación debe ser un texto',
      'string.empty': 'El ID de notificación no puede estar vacío',
      'string.min': 'El ID de notificación debe tener al menos 1 carácter',
      'string.max': 'El ID de notificación no puede tener más de 200 caracteres',
      'any.required': 'El ID de notificación es requerido'
    })
});

