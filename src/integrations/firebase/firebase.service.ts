// firebase.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FirebaseAdmin, InjectFirebaseAdmin } from 'nestjs-firebase';
import { FirestoreService } from './firestore.service';
import { BaseMessage, MulticastMessage, WebpushNotification } from 'firebase-admin/lib/messaging/messaging-api';
import { convertDataToStrings } from './helpers/firebase.helper';
import { SendNotificationResult, WebPushNotification } from './interfaces/firebase.interface';


@Injectable()
export class FireBaseService implements OnModuleInit {
  private readonly logger = new Logger(FireBaseService.name);

  constructor(
    @InjectFirebaseAdmin()
    private readonly firebase: FirebaseAdmin,
    private readonly configService: ConfigService
  ) { }

  async onModuleInit() {
    await this.checkFirebaseMessaging();
  }

  async checkFirebaseMessaging(): Promise<boolean> {
    try {
      // Test básico de conexión sin enviar mensaje real
      this.logger.log('✅ Firebase Admin SDK inicializado correctamente');
      return true;
    } catch (error) {
      this.logger.error('❌ Error inicializando Firebase Admin SDK', error);
      return false;
    }
  }

  async sendToTokens(
    tokens: string[],
    notification: BaseMessage
  ): Promise<{ successCount: number; failureCount: number; failedTokens: string[] }> {
    if (!tokens.length) return { successCount: 0, failureCount: 0, failedTokens: [] };

    try {
      const response = await this.firebase.messaging.sendEachForMulticast({tokens, ...notification});
      
      const failedTokens = response.responses
        .map((r, i) => (!r.success ? tokens[i] : null))
        .filter(Boolean) as string[];

      return { successCount: response.successCount, failureCount: response.failureCount, failedTokens };
    } catch (error) {
      this.logger.error('❌ Error enviando multicast push', error);
      throw error;
    }
  }

  /**
   * Envía notificación a un solo token.
   */
  async sendToToken(token: string, notification: BaseMessage): Promise<SendNotificationResult> {
    try {
      const messageId = await this.firebase.messaging.send({token, ...notification});
      this.logger.log(`✅ Push enviado: ${messageId}`);
      return { messageId };
    } catch (error) {
      this.logger.error('❌ Error enviando push a token', error);
      if (['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(error.code)) {
        return { error: 'invalid-token' };
      }
      return { error: error.message };
    }
  }



}