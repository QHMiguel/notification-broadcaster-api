export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  data?: Record<string, any>;
}

export interface SendNotificationDto {
  userId: string;
  systemId: string;        // Sistema/frontend que envía la notificación
  notification: NotificationPayload;
}

export interface SendNotificationResponse {
  success: boolean;
  notificationId?: string; // ID de la notificación creada
  sent: number;
  failed: number;
  totalTokens: number;
  message?: string;
  error?: string;
}

