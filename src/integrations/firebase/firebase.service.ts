import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { BaseMessage } from 'firebase-admin/lib/messaging/messaging-api';
import { MulticastResult, SendNotificationResult } from './interfaces/firebase.interface';
import { FIREBASE_ADMIN } from './firebase.injectable';

@Injectable()
export class FireBaseService implements OnModuleInit {
  private readonly logger = new Logger(FireBaseService.name);

  constructor(
    @Inject(FIREBASE_ADMIN)
    private readonly firebase: {
      admin: typeof import('firebase-admin');
      db: FirebaseFirestore.Firestore;
    },
  ) {}

  async onModuleInit() {
    await this.checkFirebaseConnection();
  }

  /**
   * Verifica la inicialización del SDK de Firebase
   */
  private async checkFirebaseConnection(): Promise<boolean> {
    try {
      const projectId = this.firebase.admin.app().options.projectId;
      this.logger.log(`✅ Firebase Admin SDK inicializado correctamente para el proyecto: ${projectId}`);
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
   */
  async sendToMultipleTokens(
    tokens: string[],
    notification: BaseMessage,
  ): Promise<MulticastResult> {
    if (!tokens.length) {
      return { successCount: 0, failureCount: 0, failedTokens: [] };
    }

    try {
      const response = await this.firebase.admin.messaging().sendEachForMulticast({
        tokens,
        ...notification,
      });

      const failedTokens = response.responses
        .map((r, i) => (!r.success ? tokens[i] : null))
        .filter(Boolean) as string[];

      this.logger.log(
        `📤 Multicast enviado: ${response.successCount} exitosos, ${response.failureCount} fallidos de ${tokens.length}`,
      );

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        failedTokens,
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
   */
  async sendToSingleToken(
    token: string,
    notification: BaseMessage,
  ): Promise<SendNotificationResult> {
    try {
      const messageId = await this.firebase.admin.messaging().send({
        token,
        ...notification,
      });
      this.logger.log(`✅ Push enviado exitosamente: ${messageId}`);
      return { messageId };
    } catch (error: any) {
      this.logger.error('❌ Error enviando push a token', error);

      const invalidTokenCodes = [
        'messaging/registration-token-not-registered',
        'messaging/invalid-registration-token',
      ];

      if (invalidTokenCodes.includes(error.code)) {
        return { error: 'invalid-token' };
      }

      return { error: error.message };
    }
  }
}
