export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  data?: Record<string, any>;
}

export interface SendNotificationDto {
  userId: string;
  notification: NotificationPayload;
}

export interface SendNotificationResponse {
  success: boolean;
  sent: number;
  failed: number;
  totalTokens: number;
  message?: string;
  error?: string;
}

