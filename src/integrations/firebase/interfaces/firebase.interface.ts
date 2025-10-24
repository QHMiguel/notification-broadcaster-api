export interface SendNotificationResult {
  messageId?: string;
  error?: string;
}

export interface MulticastResult {
  successCount: number;
  failureCount: number;
  failedTokens: string[];
}
