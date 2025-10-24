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
          error: 'No se encontraron sesiones activas para el usuario',
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

}


