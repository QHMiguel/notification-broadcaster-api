export interface UnregisterTokenDto {
  token: string;
}

export interface UnregisterTokenResponse {
  success: boolean;
  message?: string;
  error?: string;
}

