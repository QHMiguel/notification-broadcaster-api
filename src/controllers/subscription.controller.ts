import { Injectable, Logger } from '@nestjs/common';
import { FirestoreService } from 'src/integrations/firebase/firestore.service';
import { FireBaseService } from 'src/integrations/firebase/firebase.service';
import { NotificationStatus } from 'src/common/constants/global.constant';
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
  UpdateNotificationStatusDto,
  UpdateNotificationStatusResponse,
  GetUserNotificationsDto,
  GetUserNotificationsResponse,
  GetNotificationHistoryDto,
  GetNotificationHistoryResponse,
  NotificationWithStatus,
  NotificationStatusHistoryItem,
} from './dtos/notification-status.dto';

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
   * Envía notificación a todos los dispositivos de un usuario en un sistema
   */
  async sendNotification(dto: SendNotificationDto): Promise<SendNotificationResponse> {
    const { userId, systemId, notification } = dto;

    try {
      this.logger.log(`📤 Enviando notificación a usuario: ${userId} en sistema: ${systemId}`);

      // 1. Crear registro de notificación en Firestore (estado: PENDING)
      const notificationId = await this.firestore.createNotification({
        userId,
        systemId,
        title: notification.title,
        body: notification.body,
        icon: notification.icon,
        image: notification.image,
        data: notification.data,
      });

      // 2. Obtener todos los tokens del usuario en el sistema desde Firestore
      const userTokens = await this.firestore.getUserTokens(userId, systemId);

      if (userTokens.length === 0) {
        this.logger.warn(`⚠️ Usuario ${userId} no tiene tokens registrados en sistema ${systemId}`);
        
        // Actualizar notificación como FAILED
        await this.firestore.updateNotificationStatus(notificationId, NotificationStatus.FAILED);
        
        return {
          success: false,
          notificationId,
          sent: 0,
          failed: 0,
          totalTokens: 0,
          error: 'No se encontraron sesiones activas para el usuario en este sistema',
        };
      }

      this.logger.log(`📱 Se encontraron ${userTokens.length} tokens para el usuario ${userId}`);

      // 3. Preparar el mensaje FCM
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
          ? {
              ...Object.fromEntries(
                Object.entries(notification.data).map(([key, value]) => [
                  key,
                  typeof value === 'string' ? value : JSON.stringify(value),
                ])
              ),
              notificationId, // Agregar ID de notificación para seguimiento
            }
          : { notificationId },
      };

      // 4. Enviar notificación a todos los tokens usando Firebase
      const result = await this.firebase.sendToMultipleTokens(userTokens, fcmMessage);

      // 5. Actualizar contadores de la notificación
      await this.firestore.updateNotificationCounts(
        notificationId,
        userTokens.length,
        result.successCount,
        result.failureCount,
      );

      // 6. Actualizar estado según resultado
      if (result.successCount > 0) {
        await this.firestore.updateNotificationStatus(notificationId, NotificationStatus.SENT);
      } else {
        await this.firestore.updateNotificationStatus(notificationId, NotificationStatus.FAILED);
      }

      // 7. Limpiar tokens inválidos de Firestore
      if (result.failedTokens.length > 0) {
        await this.firestore.removeInvalidTokens(result.failedTokens);
        this.logger.log(`🧹 ${result.failedTokens.length} tokens inválidos eliminados`);
      }

      this.logger.log(
        `✅ Notificación enviada: ${result.successCount} exitosos, ${result.failureCount} fallidos`
      );

      return {
        success: result.successCount > 0,
        notificationId,
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
   * Registra un token FCM para un usuario en un sistema
   */
  async registerToken(dto: RegisterTokenDto): Promise<RegisterTokenResponse> {
    const { userId, systemId, token, deviceInfo } = dto;

    try {
      if (!userId || !systemId || !token) {
        return {
          success: false,
          error: 'Faltan campos requeridos: userId, systemId, token',
        };
      }

      await this.firestore.saveUserToken(userId, systemId, token, deviceInfo);
      this.logger.log(`✅ Token FCM registrado para usuario ${userId} en sistema ${systemId}`);

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

  /**
   * POST /subscription/update-notification-status
   * Actualiza el estado de una notificación (enviado, entregado, leído)
   */
  async updateNotificationStatus(dto: UpdateNotificationStatusDto): Promise<UpdateNotificationStatusResponse> {
    const { notificationId, status, metadata } = dto;

    try {
      if (!notificationId || !status) {
        return {
          success: false,
          notificationId: notificationId || '',
          newStatus: status,
          error: 'Faltan campos requeridos: notificationId, status',
        };
      }

      const result = await this.firestore.updateNotificationStatus(notificationId, status, metadata);

      if (!result.success) {
        return {
          success: false,
          notificationId,
          newStatus: status,
          error: 'Notificación no encontrada',
        };
      }

      this.logger.log(`✅ Estado de notificación ${notificationId} actualizado a ${status}`);

      return {
        success: true,
        notificationId,
        previousStatus: result.previousStatus,
        newStatus: status,
        message: `Estado actualizado exitosamente`,
      };
    } catch (error: any) {
      this.logger.error(`❌ Error actualizando estado de notificación ${notificationId}`, error);
      return {
        success: false,
        notificationId: notificationId || '',
        newStatus: status,
        error: error.message || 'Error desconocido',
      };
    }
  }

  /**
   * POST /subscription/get-user-notifications
   * Obtiene las notificaciones de un usuario en un sistema
   */
  async getUserNotifications(dto: GetUserNotificationsDto): Promise<GetUserNotificationsResponse> {
    const { userId, systemId, status, limit = 50, startAfter } = dto;

    try {
      if (!userId || !systemId) {
        return {
          success: false,
          notifications: [],
          total: 0,
          hasMore: false,
          error: 'Faltan campos requeridos: userId, systemId',
        };
      }

      const result = await this.firestore.getUserNotifications(
        userId,
        systemId,
        status,
        limit,
        startAfter,
      );

      const notifications: NotificationWithStatus[] = result.notifications.map(notif => ({
        notificationId: notif.notificationId,
        userId: notif.userId,
        systemId: notif.systemId,
        status: notif.status,
        title: notif.title,
        body: notif.body,
        icon: notif.icon,
        image: notif.image,
        data: notif.data,
        createdAt: notif.createdAt.toDate().toISOString(),
        sentAt: notif.sentAt?.toDate().toISOString(),
        deliveredAt: notif.deliveredAt?.toDate().toISOString(),
        readAt: notif.readAt?.toDate().toISOString(),
      }));

      this.logger.log(`✅ ${notifications.length} notificaciones obtenidas para usuario ${userId}`);

      return {
        success: true,
        notifications,
        total: notifications.length,
        hasMore: result.hasMore,
      };
    } catch (error: any) {
      this.logger.error(`❌ Error obteniendo notificaciones de usuario ${userId}`, error);
      return {
        success: false,
        notifications: [],
        total: 0,
        hasMore: false,
        error: error.message || 'Error desconocido',
      };
    }
  }

  /**
   * POST /subscription/get-notification-history
   * Obtiene el historial de estados de una notificación
   */
  async getNotificationHistory(dto: GetNotificationHistoryDto): Promise<GetNotificationHistoryResponse> {
    const { notificationId } = dto;

    try {
      if (!notificationId) {
        return {
          success: false,
          notificationId: '',
          history: [],
          error: 'Falta campo requerido: notificationId',
        };
      }

      const history = await this.firestore.getNotificationStatusHistory(notificationId);

      const historyItems: NotificationStatusHistoryItem[] = history.map(item => ({
        historyId: item.historyId,
        previousStatus: item.previousStatus,
        newStatus: item.newStatus,
        timestamp: item.timestamp.toDate().toISOString(),
        metadata: item.metadata,
      }));

      this.logger.log(`✅ Historial de notificación ${notificationId} obtenido (${historyItems.length} registros)`);

      return {
        success: true,
        notificationId,
        history: historyItems,
      };
    } catch (error: any) {
      this.logger.error(`❌ Error obteniendo historial de notificación ${notificationId}`, error);
      return {
        success: false,
        notificationId: notificationId || '',
        history: [],
        error: error.message || 'Error desconocido',
      };
    }
  }
}
