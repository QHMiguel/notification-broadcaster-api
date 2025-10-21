import { Injectable, Logger } from '@nestjs/common';
import { FirestoreService } from 'src/integrations/firebase/firestore.service';
import { FireBaseService } from 'src/integrations/firebase/firebase.service';

@Injectable()
export class SubscriptionController {
  private readonly logger = new Logger('SubscriptionController');

  constructor(
    private readonly firestore: FirestoreService,
    private readonly firebase: FireBaseService,
  ) {}

  /**
   * POST /subscription/subscription-handler
   * Recibe mensajes push de Pub/Sub y envía notificaciones FCM Web
   */
  async subscriptionHandler(body: any, req?: any): Promise<string> {
    try {
      // Log del request completo
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.log('🌐 WEBHOOK REQUEST RECIBIDO: /subscription/subscription-handler');
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      if (req) {
        this.logger.log(`📍 URL: ${req.method} ${req.url}`);
        this.logger.log(`🌍 IP Origen: ${req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'}`);
        this.logger.log(`🔑 User-Agent: ${req.headers?.['user-agent'] || 'N/A'}`);
        
        // Headers relevantes de Pub/Sub
        const relevantHeaders = [
          'content-type',
          'authorization',
          'x-cloud-trace-context',
          'x-goog-resource-id',
          'x-goog-resource-state',
          'x-goog-message-number',
        ];
        
        this.logger.log('📋 Headers importantes:');
        relevantHeaders.forEach(header => {
          const value = req.headers?.[header];
          if (value) {
            this.logger.log(`   └─ ${header}: ${value}`);
          }
        });
      }
      
      this.logger.log(`📦 Body: ${JSON.stringify(body)}`);
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const { message } = body || {};
      if (!message || !message.data) {
        this.logger.warn('❌ Mensaje inválido recibido (sin data)');
        return 'ERROR: Invalid message format';
      }

      // Decodificar mensaje de base64
      const decodedString = Buffer.from(message.data, 'base64').toString('utf-8');
      this.logger.log(`📩 Mensaje base64 recibido: ${message.data.substring(0, 100)}...`);
      this.logger.log(`📝 Mensaje decodificado: ${decodedString}`);

      const messageData = JSON.parse(decodedString);
      const { messageId, recipient, notification, sender } = messageData;

      // Log detallado del contenido
      this.logger.log(`📬 [${messageId}] Procesando mensaje`);
      this.logger.log(`   └─ Destinatario: ${recipient?.type}:${recipient?.id}`);
      this.logger.log(`   └─ Notificación: ${JSON.stringify(notification)}`);
      this.logger.log(`   └─ Remitente: ${JSON.stringify(sender)}`);

      // Preparar datos de la notificación FCM Web
      const pushNotification = {
        title: notification?.title || 'Nueva notificación',
        body: notification?.body || notification?.message || '',
        icon: notification?.icon,
        image: notification?.image,
        data: {
          messageId,
          senderId: sender?.id,
          senderName: sender?.name,
          timestamp: new Date().toISOString(),
          ...notification?.data,
        },
      };

      // Enviar push notification según el tipo de recipient
      const result = await this.firebase.sendNotificationByRecipient(recipient, pushNotification);
      
      this.logger.log(
        `📤 [${messageId}] Push FCM enviado: ${result.sent} exitosos, ${result.failed} fallidos para ${recipient?.type}:${recipient?.id}`
      );

      if (result.sent > 0) {
        await this.firestore.markAsDelivered(messageId);
        this.logger.log(`✓ [${messageId}] Marcado como entregado en Firestore`);
      } else {
        this.logger.warn(`⚠️ No se pudo enviar a ningún dispositivo para ${recipient?.type}:${recipient?.id}`);
      }

      return 'OK';
    } catch (error: any) {
      this.logger.error('Error en subscription-handler', error?.stack || String(error));
      // ACK igualmente para evitar reintentos en Pub/Sub
      return 'ERROR';
    }
  }

  /**
   * POST /subscription/subscription-handler-plain
   * Recibe mensajes JSON planos (sin base64) y envía notificaciones FCM Web
   */
  async subscriptionHandlerPlain(body: any, req?: any): Promise<string> {
    try {
      // Log del request completo
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.log('🌐 WEBHOOK REQUEST RECIBIDO: /subscription/subscription-handler-plain');
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      if (req) {
        this.logger.log(`📍 URL: ${req.method} ${req.url}`);
        this.logger.log(`🌍 IP Origen: ${req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'}`);
        this.logger.log(`🔑 User-Agent: ${req.headers?.['user-agent'] || 'N/A'}`);
        
        // Headers relevantes
        const relevantHeaders = [
          'content-type',
          'content-length',
          'authorization',
          'x-api-key',
          'x-request-id',
        ];
        
        this.logger.log('📋 Headers importantes:');
        relevantHeaders.forEach(header => {
          const value = req.headers?.[header];
          if (value) {
            this.logger.log(`   └─ ${header}: ${value}`);
          }
        });
      }
      
      this.logger.log(`📦 Body: ${JSON.stringify(body)}`);
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const { messageId, recipient, notification, sender } = body || {};

      if (!messageId || !recipient) {
        this.logger.warn('❌ Payload inválido (plain): falta messageId o recipient');
        return 'ERROR: Invalid message format';
      }

      // Log detallado del contenido
      this.logger.log(`📬 [${messageId}] Procesando mensaje PLAIN`);
      this.logger.log(`   └─ Destinatario: ${recipient?.type}:${recipient?.id}`);
      this.logger.log(`   └─ Notificación: ${JSON.stringify(notification)}`);
      this.logger.log(`   └─ Remitente: ${JSON.stringify(sender)}`);

      // Preparar datos de la notificación FCM Web
      const pushNotification = {
        title: notification?.title || 'Nueva notificación',
        body: notification?.body || notification?.message || '',
        icon: notification?.icon,
        image: notification?.image,
        data: {
          messageId,
          senderId: sender?.id,
          senderName: sender?.name,
          timestamp: new Date().toISOString(),
          ...notification?.data,
        },
      };

      // Enviar push notification según el tipo de recipient
      const result = await this.firebase.sendNotificationByRecipient(recipient, pushNotification);
      
      this.logger.log(
        `📤 [${messageId}] Push FCM enviado (plain): ${result.sent} exitosos, ${result.failed} fallidos para ${recipient?.type}:${recipient?.id}`
      );

      if (result.sent > 0) {
        await this.firestore.markAsDelivered(messageId);
        this.logger.log(`✓ [${messageId}] Marcado como entregado en Firestore`);
      } else {
        this.logger.warn(`⚠️ No se pudo enviar a ningún dispositivo para ${recipient?.type}:${recipient?.id}`);
      }

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
  async registerToken(body: any): Promise<any> {
    try {
      const { userId, token, deviceInfo } = body;

      if (!userId || !token) {
        return {
          success: false,
          error: 'Missing required fields: userId, token'
        };
      }

      await this.firestore.saveUserToken(userId, token, deviceInfo);
      
      this.logger.log(`✅ Token FCM registrado para usuario ${userId}`);
      
      return {
        success: true,
        message: 'Token registered successfully'
      };
    } catch (error: any) {
      this.logger.error('Error registrando token FCM', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * POST /subscription/unregister-token
   * Elimina un token FCM
   */
  async unregisterToken(body: any): Promise<any> {
    try {
      const { token } = body;

      if (!token) {
        return {
          success: false,
          error: 'Missing required field: token'
        };
      }

      await this.firestore.removeUserToken(token);
      
      this.logger.log(`🗑️ Token FCM eliminado`);
      
      return {
        success: true,
        message: 'Token unregistered successfully'
      };
    } catch (error: any) {
      this.logger.error('Error eliminando token FCM', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}


