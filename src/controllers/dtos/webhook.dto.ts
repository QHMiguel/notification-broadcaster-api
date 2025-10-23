export interface RecipientInfo {
  type: 'user' | 'group' | 'broadcast';
  id: string;
}

export interface NotificationData {
  title?: string;
  body?: string;
  message?: string;
  icon?: string;
  image?: string;
  data?: Record<string, any>;
}

export interface SenderInfo {
  id?: string;
  name?: string;
}

export interface WebhookMessageData {
  messageId: string;
  recipient: RecipientInfo;
  notification: NotificationData;
  sender?: SenderInfo;
}

export interface PubSubMessage {
  data: string; // base64
  messageId?: string;
  publishTime?: string;
}

export interface WebhookPubSubDto {
  message: PubSubMessage;
  subscription?: string;
}

