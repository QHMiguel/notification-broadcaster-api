import { NotificationStatus } from 'src/common/constants/global.constant';

/**
 * DTO para actualizar el estado de una notificación
 */
export interface UpdateNotificationStatusDto {
  notificationId: string;
  status: NotificationStatus;
  metadata?: Record<string, any>;  // Metadata adicional del cambio
}

/**
 * Respuesta al actualizar estado de notificación
 */
export interface UpdateNotificationStatusResponse {
  success: boolean;
  notificationId: string;
  previousStatus?: NotificationStatus;
  newStatus: NotificationStatus;
  message?: string;
  error?: string;
}

/**
 * DTO para consultar notificaciones de un usuario
 */
export interface GetUserNotificationsDto {
  userId: string;
  systemId: string;
  status?: NotificationStatus;  // Filtrar por estado (opcional)
  limit?: number;               // Límite de resultados (default: 50)
  startAfter?: string;          // Para paginación
}

/**
 * Respuesta con notificaciones del usuario
 */
export interface GetUserNotificationsResponse {
  success: boolean;
  notifications: NotificationWithStatus[];
  total: number;
  hasMore: boolean;
  error?: string;
}

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
export interface GetNotificationHistoryDto {
  notificationId: string;
}

/**
 * Respuesta con historial de estados
 */
export interface GetNotificationHistoryResponse {
  success: boolean;
  notificationId: string;
  history: NotificationStatusHistoryItem[];
  error?: string;
}

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

