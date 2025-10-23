import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { FirebaseAdmin, InjectFirebaseAdmin } from 'nestjs-firebase';
import { BaseMessage } from 'firebase-admin/lib/messaging/messaging-api';

export interface SendNotificationResult {
  messageId?: string;
  error?: string;
}

export interface MulticastResult {
  successCount: number;
  failureCount: number;
  failedTokens: string[];
}

/**
 * Servicio para envío de notificaciones FCM (Firebase Cloud Messaging)
 * Responsabilidad única: envío de notificaciones push
 */
@Injectable()
export class FireBaseService implements OnModuleInit {
  private readonly logger = new Logger(FireBaseService.name);

  constructor(
    @InjectFirebaseAdmin()
    private readonly firebase: FirebaseAdmin,
  ) {}

  async onModuleInit() {
    await this.checkFirebaseMessaging();
  }

  /**
   * Verifica la inicialización del SDK de Firebase
   */
  private async checkFirebaseMessaging(): Promise<boolean> {
    try {
      this.logger.log('✅ Firebase Admin SDK inicializado correctamente');
      return true;
    } catch (error) {
      this.logger.error('❌ Error inicializando Firebase Admin SDK', error);
      return false;
    }
  }

  /**
   * Envía notificación a múltiples tokens
   * @param tokens Lista de tokens FCM
   * @param notification Mensaje de notificación
   * @returns Resultado del envío con conteo de éxitos y fallos
   */
  async sendToMultipleTokens(
    tokens: string[],
    notification: BaseMessage
  ): Promise<MulticastResult> {
    if (!tokens.length) {
      return { successCount: 0, failureCount: 0, failedTokens: [] };
    }

    try {
      const response = await this.firebase.messaging.sendEachForMulticast({
        tokens,
        ...notification
      });
      
      const failedTokens = response.responses
        .map((r, i) => (!r.success ? tokens[i] : null))
        .filter(Boolean) as string[];

      this.logger.log(
        `📤 Multicast enviado: ${response.successCount} exitosos, ${response.failureCount} fallidos de ${tokens.length} tokens`
      );

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        failedTokens
      };
    } catch (error) {
      this.logger.error('❌ Error enviando multicast push', error);
      throw error;
    }
  }

  /**
   * Envía notificación a un solo token
   * @param token Token FCM del dispositivo
   * @param notification Mensaje de notificación
   * @returns Resultado del envío
   */
  async sendToSingleToken(token: string, notification: BaseMessage): Promise<SendNotificationResult> {
    try {
      const messageId = await this.firebase.messaging.send({ token, ...notification });
      this.logger.log(`✅ Push enviado exitosamente: ${messageId}`);
      return { messageId };
    } catch (error: any) {
      this.logger.error('❌ Error enviando push a token', error);
      
      const invalidTokenCodes = [
        'messaging/registration-token-not-registered',
        'messaging/invalid-registration-token'
      ];
      
      if (invalidTokenCodes.includes(error.code)) {
        return { error: 'invalid-token' };
      }
      
      return { error: error.message };
    }
  }
}