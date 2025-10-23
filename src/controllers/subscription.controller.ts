import { Injectable, Logger } from '@nestjs/common';
import { FirestoreService } from 'src/integrations/firebase/firestore.service';
import { FireBaseService } from 'src/integrations/firebase/firebase.service';
import {
  RegisterTokenDto,
  RegisterTokenResponse,
} from './dtos/register-token.dto';
import {
  UnregisterTokenDto,
  UnregisterTokenResponse,
} from './dtos/unregister-token.dto';
import {
  SendNotificationDto,
  SendNotificationResponse,
} from './dtos/send-notification.dto';
import {
  WebhookPubSubDto,
  WebhookMessageData,
} from './dtos/webhook.dto';

/**
 * Controlador para gestión de suscripciones y notificaciones push
 * Coordina la lógica entre Firestore (almacenamiento) y Firebase (FCM)
 */
@Injectable()
export class SubscriptionController {
  private readonly logger = new Logger(SubscriptionController.name);

  constructor(
    private readonly firestore: FirestoreService,
    private readonly firebase: FireBaseService,
  ) {}

  /**
   * POST /subscription/send-notification
   * Envía notificación a todos los dispositivos de un usuario
   */
  async sendNotification(dto: SendNotificationDto): Promise<SendNotificationResponse> {
    const { userId, notification } = dto;

    try {
      this.logger.log(`📤 Enviando notificación a usuario: ${userId}`);

      // 1. Obtener todos los tokens del usuario desde Firestore
      const userTokens = await this.firestore.getUserTokens(userId);

      if (userTokens.length === 0) {
        this.logger.warn(`⚠️ Usuario ${userId} no tiene tokens registrados`);
        return {
          success: false,
          sent: 0,
          failed: 0,
          totalTokens: 0,
          error: 'No se encontraron tokens para el usuario',
        };
      }

      this.logger.log(`📱 Se encontraron ${userTokens.length} tokens para el usuario ${userId}`);

      // 2. Preparar el mensaje FCM
      const fcmMessage = {
        notification: {
          title: notification.title,
          body: notification.body,
          ...(notification.icon && { imageUrl: notification.icon }),
        },
        webpush: notification.image ? {
          notification: {
            image: notification.image,
          },
        } : undefined,
        data: notification.data 
          ? Object.fromEntries(
              Object.entries(notification.data).map(([key, value]) => [
                key,
                typeof value === 'string' ? value : JSON.stringify(value),
              ])
            )
          : undefined,
      };

      // 3. Enviar notificación a todos los tokens usando Firebase
      const result = await this.firebase.sendToMultipleTokens(userTokens, fcmMessage);

      // 4. Limpiar tokens inválidos de Firestore
      if (result.failedTokens.length > 0) {
        await this.firestore.removeInvalidTokens(userId, result.failedTokens);
        this.logger.log(`🧹 ${result.failedTokens.length} tokens inválidos eliminados`);
      }

      this.logger.log(
        `✅ Notificación enviada: ${result.successCount} exitosos, ${result.failureCount} fallidos`
      );

      return {
        success: result.successCount > 0,
        sent: result.successCount,
        failed: result.failureCount,
        totalTokens: userTokens.length,
        message: `Notificación enviada a ${result.successCount} de ${userTokens.length} dispositivos`,
      };
    } catch (error: any) {
      this.logger.error(`❌ Error enviando notificación a usuario ${userId}`, error);
      return {
        success: false,
        sent: 0,
        failed: 0,
        totalTokens: 0,
        error: error.message || 'Error desconocido',
      };
    }
  }

  /**
   * POST /subscription/subscription-handler
   * Recibe mensajes de Pub/Sub y envía notificaciones FCM
   */
  async subscriptionHandler(body: WebhookPubSubDto, req?: any): Promise<string> {
    try {
      this.logWebhookRequest('subscription-handler', body, req);

      const { message } = body;
      if (!message?.data) {
        this.logger.warn('❌ Mensaje inválido: falta campo data');
        return 'ERROR: Invalid message format';
      }

      // Decodificar mensaje base64
      const decodedString = Buffer.from(message.data, 'base64').toString('utf-8');
      this.logger.log(`📩 Mensaje decodificado: ${decodedString.substring(0, 200)}...`);

      const messageData: WebhookMessageData = JSON.parse(decodedString);
      
      await this.processWebhookMessage(messageData);

      return 'OK';
    } catch (error: any) {
      this.logger.error('Error en subscription-handler', error?.stack || String(error));
      return 'ERROR';
    }
  }

  /**
   * POST /subscription/subscription-handler-plain
   * Recibe mensajes JSON planos (sin base64)
   */
  async subscriptionHandlerPlain(body: WebhookMessageData, req?: any): Promise<string> {
    try {
      this.logWebhookRequest('subscription-handler-plain', body, req);

      const { messageId, recipient } = body;

      if (!messageId || !recipient) {
        this.logger.warn('❌ Payload inválido: falta messageId o recipient');
        return 'ERROR: Invalid message format';
      }

      await this.processWebhookMessage(body);

      return 'OK';
    } catch (error: any) {
      this.logger.error('Error en subscription-handler-plain', error?.stack || String(error));
      return 'ERROR';
    }
  }

  /**
   * POST /subscription/register-token
   * Registra un token FCM para un usuario
   */
  async registerToken(dto: RegisterTokenDto): Promise<RegisterTokenResponse> {
    const { userId, token, deviceInfo } = dto;

    try {
      if (!userId || !token) {
        return {
          success: false,
          error: 'Faltan campos requeridos: userId, token',
        };
      }

      await this.firestore.saveUserToken(userId, token, deviceInfo);
      this.logger.log(`✅ Token FCM registrado para usuario ${userId}`);

      return {
        success: true,
        message: 'Token registrado exitosamente',
      };
    } catch (error: any) {
      this.logger.error(`❌ Error registrando token para usuario ${userId}`, error);
      return {
        success: false,
        error: error.message || 'Error desconocido',
      };
    }
  }

  /**
   * POST /subscription/unregister-token
   * Elimina un token FCM
   */
  async unregisterToken(dto: UnregisterTokenDto): Promise<UnregisterTokenResponse> {
    const { token } = dto;

    try {
      if (!token) {
        return {
          success: false,
          error: 'Falta campo requerido: token',
        };
      }

      await this.firestore.removeUserToken(token);
      this.logger.log(`🗑️ Token FCM eliminado: ${token.substring(0, 20)}...`);

      return {
        success: true,
        message: 'Token eliminado exitosamente',
      };
    } catch (error: any) {
      this.logger.error('❌ Error eliminando token FCM', error);
      return {
        success: false,
        error: error.message || 'Error desconocido',
      };
    }
  }

  // =============================================
  // MÉTODOS PRIVADOS HELPER
  // =============================================

  /**
   * Procesa un mensaje webhook y envía las notificaciones correspondientes
   */
  private async processWebhookMessage(messageData: WebhookMessageData): Promise<void> {
    const { messageId, recipient, notification, sender } = messageData;

    this.logger.log(`📬 [${messageId}] Procesando mensaje`);
    this.logger.log(`   └─ Destinatario: ${recipient?.type}:${recipient?.id}`);
    this.logger.log(`   └─ Notificación: ${notification?.title || 'Sin título'}`);

    // Obtener tokens según el tipo de destinatario
    const tokens = await this.getTokensByRecipient(recipient);

    if (tokens.length === 0) {
      this.logger.warn(`⚠️ No hay tokens para ${recipient?.type}:${recipient?.id}`);
      return;
    }

    // Preparar notificación FCM
    const fcmMessage = {
      notification: {
        title: notification?.title || 'Nueva notificación',
        body: notification?.body || notification?.message || '',
      },
      webpush: notification?.image ? {
        notification: {
          image: notification.image,
        },
      } : undefined,
      data: {
        messageId,
        senderId: sender?.id || '',
        senderName: sender?.name || '',
        timestamp: new Date().toISOString(),
        ...(notification?.data && this.convertDataToStrings(notification.data)),
      },
    };

    // Enviar notificación
    const result = await this.firebase.sendToMultipleTokens(tokens, fcmMessage);

    this.logger.log(
      `📤 [${messageId}] Push enviado: ${result.successCount} exitosos, ${result.failureCount} fallidos`
    );

    // Marcar como entregado si se envió al menos a un dispositivo
    if (result.successCount > 0) {
      await this.firestore.markAsDelivered(messageId);
      this.logger.log(`✓ [${messageId}] Marcado como entregado`);
    }

    // Limpiar tokens inválidos
    if (result.failedTokens.length > 0 && recipient.type === 'user') {
      await this.firestore.removeInvalidTokens(recipient.id, result.failedTokens);
    }
  }

  /**
   * Obtiene tokens según el tipo de destinatario
   */
  private async getTokensByRecipient(recipient: any): Promise<string[]> {
    const { type, id } = recipient;

    switch (type) {
      case 'user':
        return await this.firestore.getUserTokens(id);
      
      case 'group':
        return await this.firestore.getGroupTokens(id);
      
      case 'broadcast':
        return await this.firestore.getAllTokens();
      
      default:
        this.logger.warn(`⚠️ Tipo de destinatario desconocido: ${type}`);
        return [];
    }
  }

  /**
   * Convierte todos los valores de un objeto a strings (requerido por FCM)
   */
  private convertDataToStrings(data: Record<string, any>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        typeof value === 'string' ? value : JSON.stringify(value),
      ])
    );
  }

  /**
   * Log detallado de request webhook
   */
  private logWebhookRequest(endpoint: string, body: any, req?: any): void {
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.logger.log(`🌐 WEBHOOK REQUEST: /subscription/${endpoint}`);
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (req) {
      const { method, url, headers, socket } = req;
      const ipOrigin = headers?.['x-forwarded-for'] || socket?.remoteAddress || 'unknown';
      const userAgent = headers?.['user-agent'] || 'N/A';

      this.logger.log(`📍 ${method} ${url}`);
      this.logger.log(`🌍 IP: ${ipOrigin}`);
      this.logger.log(`🔑 User-Agent: ${userAgent}`);

      const relevantHeaders = ['content-type', 'authorization', 'x-api-key'];
      const foundHeaders = relevantHeaders
        .filter((h) => headers?.[h])
        .map((h) => `${h}: ${headers[h]}`);

      if (foundHeaders.length > 0) {
        this.logger.log(`📋 Headers: ${foundHeaders.join(', ')}`);
      }
    }

    const bodyStr = JSON.stringify(body);
    const bodyPreview = bodyStr.length > 500 ? `${bodyStr.substring(0, 500)}...` : bodyStr;
    this.logger.log(`📦 Body: ${bodyPreview}`);
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}


