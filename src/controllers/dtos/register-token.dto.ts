export interface DeviceInfo {
  browser?: string;
  os?: string;
  userAgent?: string;
  deviceName?: string;
}

export interface RegisterTokenDto {
  userId: string;
  systemId: string;        // Sistema/frontend al que pertenece el token
  token: string;
  deviceInfo?: DeviceInfo;
}

export interface RegisterTokenResponse {
  success: boolean;
  message?: string;
  error?: string;
}

