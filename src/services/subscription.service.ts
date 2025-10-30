import { Injectable, Logger } from '@nestjs/common';
import { FirestoreService } from 'src/integrations/firebase/firestore.service';
import { FireBaseService } from 'src/integrations/firebase/firebase.service';
import { NotificationStatus } from 'src/common/constants/global.constant';
import {
  RegisterTokenDto,
  RegisterTokenResponse,
} from 'src/controllers/dtos/register-token.dto';
import {
  UnregisterTokenDto,
  UnregisterTokenResponse,
} from 'src/controllers/dtos/unregister-token.dto';
import {
  SendNotificationDto,
  SendNotificationResponse,
} from 'src/controllers/dtos/send-notification.dto';
import {
  UpdateNotificationStatusDto,
  UpdateNotificationStatusResponse,
  GetUserNotificationsDto,
  GetUserNotificationsResponse,
  GetNotificationHistoryDto,
  GetNotificationHistoryResponse,
  NotificationWithStatus,
  NotificationStatusHistoryItem,
} from 'src/controllers/dtos/notification-status.dto';

/**
 * Service para gestión de suscripciones y notificaciones push
 * Contiene toda la lógica de negocio
 */
@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly firestore: FirestoreService,
    private readonly firebase: FireBaseService,
  ) {}

  /**
   * Envía notificación a todos los dispositivos de un usuario en un sistema
   */
  async sendNotification(dto: SendNotificationDto): Promise<SendNotificationResponse> {
    const { userId, systemId, notification } = dto;

    try {
      this.logger.log(`📤 Enviando notificación a usuario: ${userId} en sistema: ${systemId}`);

      const notificationId = await this.firestore.createNotification({...dto, ...notification});

      // 2. Obtener todos los tokens del usuario en el sistema desde Firestore
      const userTokens = await this.firestore.getUserTokens(userId, systemId);

      if (userTokens.length === 0) {
        this.logger.warn(`⚠️ Usuario ${userId} no tiene tokens registrados en sistema ${systemId}`);
        
        await this.firestore.updateNotificationStatus(notificationId, NotificationStatus.FAILED);
        
        return {
          status: false,
          message: 'No se encontraron sesiones activas para el usuario en este sistema',
        };
      }

      this.logger.log(`📱 Se encontraron ${userTokens.length} tokens para el usuario ${userId}`);

      // 3. Preparar el mensaje FCM
      const fcmMessage = {
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.icon, // Icon ya viene con valor por defecto de Joi
        },
        webpush: notification.image ? {
          notification: {
            image: notification.image,
          },
        } : undefined,
        data: {
          ...Object.fromEntries(
            Object.entries(notification.data || {}).map(([key, value]) => [
              key,
              typeof value === 'string' ? value : JSON.stringify(value),
            ])
          ),
          notificationId, // Agregar ID de notificación para seguimiento
        },
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
        status: result.successCount > 0,
        message: `Notificación enviada a ${result.successCount} de ${userTokens.length} dispositivos`,
        data: {
          notificationId,
          sent: result.successCount,
          failed: result.failureCount,
          totalTokens: userTokens.length,
        },
      };
    } catch (error: any) {
      this.logger.error(`❌ Error enviando notificación a usuario ${userId}`, error);
      return {
        status: false,
        message: error.message || 'Error desconocido',
      };
    }
  }

  /**
   * Guarda/actualiza un token FCM para un usuario en un sistema
   */
  async registerToken(dto: RegisterTokenDto): Promise<RegisterTokenResponse> {
    const { id, userId, systemId, token, deviceInfo } = dto;

    try {
      const { id: docId, isNewRegistration, data } = await this.firestore.saveUserToken(
        id,
        userId, 
        systemId, 
        token, 
        deviceInfo
      );
      
      const action = isNewRegistration ? 'registrado' : 'actualizado';
      this.logger.log(`✅ Token FCM ${action} para usuario ${userId} en sistema ${systemId}`);

      return {
        status: true,
        message: `Token ${action} exitosamente`,
        data: {
          id: docId,
          userId: data.userId,
          systemId: data.systemId,
          token: data.token,
          deviceInfo: data.deviceInfo,
          createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
          lastUsed: data.lastUsed?.toDate?.().toISOString() || new Date().toISOString(),
          isNewRegistration,
        },
      };
    } catch (error: any) {
      this.logger.error(`❌ Error guardando token para usuario ${userId}`, error);
      return {
        status: false,
        message: error.message || 'Error desconocido',
      };
    }
  }

  /**
   * Elimina un token FCM
   */
  async unregisterToken(dto: UnregisterTokenDto): Promise<UnregisterTokenResponse> {
    const { id, token } = dto;

    try {
      await this.firestore.removeUserToken(id, token);
      
      const identifier = id ? `ID: ${id.substring(0, 20)}...` : `token: ${token?.substring(0, 20)}...`;
      this.logger.log(`🗑️ Token FCM eliminado (${identifier})`);

      return {
        status: true,
        message: 'Token eliminado exitosamente',
        data: null,
      };
    } catch (error: any) {
      this.logger.error('❌ Error eliminando token FCM', error);
      return {
        status: false,
        message: error.message || 'Error desconocido',
      };
    }
  }

  /**
   * Actualiza el estado de una notificación (enviado, entregado, leído)
   */
  async updateNotificationStatus(dto: UpdateNotificationStatusDto): Promise<UpdateNotificationStatusResponse> {
    const { notificationId, status, metadata } = dto;

    try {
      const result = await this.firestore.updateNotificationStatus(notificationId, status, metadata);

      if (!result.success) {
        return {
          status: false,
          message: 'Notificación no encontrada',
        };
      }

      this.logger.log(`✅ Estado de notificación ${notificationId} actualizado a ${status}`);

      return {
        status: true,
        message: 'Estado actualizado exitosamente',
        data: {
          notificationId,
          previousStatus: result.previousStatus,
          newStatus: status,
        },
      };
    } catch (error: any) {
      this.logger.error(`❌ Error actualizando estado de notificación ${notificationId}`, error);
      return {
        status: false,
        message: error.message || 'Error desconocido',
      };
    }
  }

  /**
   * Obtiene las notificaciones de un usuario en un sistema con paginación
   */
  async getUserNotifications(dto: GetUserNotificationsDto): Promise<GetUserNotificationsResponse> {
    const { userId, systemId, status, page, limit, daysBack } = dto;

    try {
      const result = await this.firestore.getUserNotifications(
        userId,
        systemId,
        status,
        page,
        limit,
        daysBack,
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

      this.logger.log(
        `✅ ${notifications.length} notificaciones obtenidas para usuario ${userId} (página ${page}, últimos ${daysBack} días)`
      );

      return {
        status: true,
        data: {
          notifications,
        },
        pagination: result.pagination,
      };
    } catch (error: any) {
      this.logger.error(`❌ Error obteniendo notificaciones de usuario ${userId}`, error);
      return {
        status: false,
        message: error.message || 'Error desconocido',
      };
    }
  }

  /**
   * Obtiene el historial de estados de una notificación
   */
  async getNotificationHistory(dto: GetNotificationHistoryDto): Promise<GetNotificationHistoryResponse> {
    const { notificationId } = dto;

    try {
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
        status: true,
        data: {
          notificationId,
          history: historyItems,
        },
      };
    } catch (error: any) {
      this.logger.error(`❌ Error obteniendo historial de notificación ${notificationId}`, error);
      return {
        status: false,
        message: error.message || 'Error desconocido',
      };
    }
  }
}

