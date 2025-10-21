export interface WebPushNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, any>;
}

export interface SendNotificationResult {
  messageId?: string;
  error?: string;
}