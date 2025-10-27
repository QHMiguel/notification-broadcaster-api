import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { FirebaseAdmin, InjectFirebaseAdmin } from 'nestjs-firebase';
import * as admin from 'firebase-admin';
import { NotificationStatus } from 'src/common/constants/global.constant';
import {
  ISystem,
  IUser,
  IFcmToken,
  INotification,
  INotificationStatusHistory,
  ICreateNotificationData,
} from './interfaces/firestore-models.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FirestoreService implements OnModuleInit {
  private readonly logger = new Logger(FirestoreService.name);
  private db: admin.firestore.Firestore;

  constructor(
    @InjectFirebaseAdmin()
    private readonly firebase: FirebaseAdmin,
  ) {}

  async onModuleInit() {
    this.db = this.firebase.firestore;
    this.logger.log('✅ Firestore inicializado correctamente');
    await this.createIndexes();
  }

  private async createIndexes() {
    // Firestore maneja índices automáticamente para consultas simples
    // Índices compuestos deben configurarse en Firebase Console si es necesario
    this.logger.log('📊 Firestore listo (índices manejados por Firebase)');
  }

  // =============================================
  // MÉTODOS PARA SISTEMAS
  // =============================================

  /**
   * Crea o actualiza un sistema
   */
  async saveSystem(systemId: string, name: string, description?: string): Promise<void> {
    try {
      const systemRef = this.db.collection('systems').doc(systemId);
      const systemDoc = await systemRef.get();
      const now = admin.firestore.Timestamp.now();

      const systemData: ISystem = {
        systemId,
        name,
        description: description || '',
        active: true,
        createdAt: systemDoc.exists ? (systemDoc.data() as ISystem).createdAt : now,
        updatedAt: now,
      };

      await systemRef.set(systemData, { merge: true });
      this.logger.log(`✅ Sistema ${systemId} guardado/actualizado`);
    } catch (error) {
      this.logger.error(`❌ Error guardando sistema ${systemId}`, error);
      throw error;
    }
  }

  /**
   * Obtiene un sistema por ID
   */
  async getSystem(systemId: string): Promise<ISystem | null> {
    try {
      const doc = await this.db.collection('systems').doc(systemId).get();
      return doc.exists ? (doc.data() as ISystem) : null;
    } catch (error) {
      this.logger.error(`❌ Error obteniendo sistema ${systemId}`, error);
      return null;
    }
  }

  /**
   * Lista todos los sistemas activos
   */
  async listActiveSystems(): Promise<ISystem[]> {
    try {
      const snapshot = await this.db
        .collection('systems')
        .where('active', '==', true)
        .get();

      return snapshot.docs.map(doc => doc.data() as ISystem);
    } catch (error) {
      this.logger.error('❌ Error listando sistemas', error);
      return [];
    }
  }

  // =============================================
  // MÉTODOS PARA USUARIOS
  // =============================================

  /**
   * Crea o actualiza un usuario (solo metadata, sin sistemas)
   */
  async saveUser(
    userId: string,
    metadata?: any,
  ): Promise<void> {
    try {
      const userRef = this.db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      const now = admin.firestore.Timestamp.now();

      const userData: IUser = {
        userId,
        metadata: metadata || {},
        createdAt: userDoc.exists ? (userDoc.data() as IUser).createdAt : now,
        updatedAt: now,
      };

      await userRef.set(userData, { merge: true });
      this.logger.log(`✅ Usuario ${userId} guardado/actualizado`);
    } catch (error) {
      this.logger.error(`❌ Error guardando usuario ${userId}`, error);
      throw error;
    }
  }

  /**
   * Obtiene un usuario por ID
   */
  async getUser(userId: string): Promise<IUser | null> {
    try {
      const doc = await this.db.collection('users').doc(userId).get();
      return doc.exists ? (doc.data() as IUser) : null;
    } catch (error) {
      this.logger.error(`❌ Error obteniendo usuario ${userId}`, error);
      return null;
    }
  }

  // =============================================
  // MÉTODOS PARA TOKENS FCM
  // =============================================

  /**
   * Registra o actualiza un token FCM para un usuario y sistema
   */
  async saveUserToken(
    userId: string,
    systemId: string,
    token: string,
    deviceInfo?: any,
  ): Promise<void> {
    try {
      const tokenRef = this.db.collection('fcm_tokens').doc(token);
      const tokenDoc = await tokenRef.get();
      const now = admin.firestore.Timestamp.now();

      const tokenData: IFcmToken = {
        token,
        userId,
        systemId,
        deviceInfo: deviceInfo || {},
        createdAt: tokenDoc.exists ? (tokenDoc.data() as IFcmToken).createdAt : now,
        lastUsed: now,
      };

      await tokenRef.set(tokenData, { merge: true });
      this.logger.log(`✅ Token FCM registrado/actualizado para usuario ${userId} en sistema ${systemId}`);

      // Crear usuario si no existe (solo para tener registro)
      const user = await this.getUser(userId);
      if (!user) {
        await this.saveUser(userId);
      }
    } catch (error) {
      this.logger.error(`❌ Error guardando token FCM`, error);
      throw error;
    }
  }

  /**
   * Obtiene todos los tokens FCM de un usuario en un sistema específico
   */
  async getUserTokens(userId: string, systemId: string): Promise<string[]> {
    try {
      const snapshot = await this.db
        .collection('fcm_tokens')
        .where('userId', '==', userId)
        .where('systemId', '==', systemId)
        .get();

      return snapshot.docs.map(doc => doc.data().token);
    } catch (error) {
      this.logger.error(`❌ Error obteniendo tokens de usuario ${userId}`, error);
      return [];
    }
  }

  /**
   * Elimina un token FCM específico
   */
  async removeUserToken(token: string): Promise<void> {
    try {
      await this.db.collection('fcm_tokens').doc(token).delete();
      this.logger.log(`🗑️ Token FCM eliminado: ${token.substring(0, 20)}...`);
    } catch (error) {
      this.logger.error(`❌ Error eliminando token FCM`, error);
    }
  }

  /**
   * Elimina todos los tokens de un usuario en un sistema
   */
  async removeAllUserTokens(userId: string, systemId: string): Promise<void> {
    try {
      const snapshot = await this.db
        .collection('fcm_tokens')
        .where('userId', '==', userId)
        .where('systemId', '==', systemId)
        .get();

      const batch = this.db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      this.logger.log(`🗑️ ${snapshot.size} tokens eliminados para usuario ${userId} en sistema ${systemId}`);
    } catch (error) {
      this.logger.error(`❌ Error eliminando tokens de usuario`, error);
    }
  }

  /**
   * Elimina tokens inválidos
   */
  async removeInvalidTokens(invalidTokens: string[]): Promise<void> {
    if (invalidTokens.length === 0) return;

    try {
      const batch = this.db.batch();
      
      invalidTokens.forEach(token => {
        const tokenRef = this.db.collection('fcm_tokens').doc(token);
        batch.delete(tokenRef);
      });

      await batch.commit();
      this.logger.log(`🧹 ${invalidTokens.length} tokens inválidos eliminados`);
    } catch (error) {
      this.logger.error(`❌ Error eliminando tokens inválidos`, error);
    }
  }

  /**
   * Limpia tokens antiguos no usados
   */
  async cleanupOldTokens(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffDate);

      const snapshot = await this.db
        .collection('fcm_tokens')
        .where('lastUsed', '<', cutoffTimestamp)
        .get();

      if (snapshot.empty) {
        return 0;
      }

      const batch = this.db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      this.logger.log(`🧹 ${snapshot.size} tokens antiguos eliminados (>${daysOld} días)`);
      return snapshot.size;
    } catch (error) {
      this.logger.error('❌ Error limpiando tokens antiguos', error);
      return 0;
    }
  }

  // =============================================
  // MÉTODOS PARA NOTIFICACIONES
  // =============================================

  /**
   * Crea una nueva notificación en estado PENDING
   */
  async createNotification(data: ICreateNotificationData): Promise<string> {
    try {
      const notificationId = uuidv4();
      const now = admin.firestore.Timestamp.now();

      const notificationData: INotification = {
        notificationId,
        userId: data.userId,
        systemId: data.systemId,
        status: NotificationStatus.PENDING,
        title: data.title,
        body: data.body,
        icon: data.icon,
        image: data.image,
        data: data.data || {},
        tokensCount: 0,
        successCount: 0,
        failureCount: 0,
        createdAt: now,
      };

      await this.db.collection('notifications').doc(notificationId).set(notificationData);
      
      // Registrar en historial de estados
      await this.addNotificationStatusHistory(notificationId, undefined, NotificationStatus.PENDING);

      this.logger.log(`✅ Notificación ${notificationId} creada para usuario ${data.userId}`);
      return notificationId;
    } catch (error) {
      this.logger.error(`❌ Error creando notificación`, error);
      throw error;
    }
  }

  /**
   * Actualiza los contadores de envío de una notificación
   */
  async updateNotificationCounts(
    notificationId: string,
    tokensCount: number,
    successCount: number,
    failureCount: number,
  ): Promise<void> {
    try {
      await this.db.collection('notifications').doc(notificationId).update({
        tokensCount,
        successCount,
        failureCount,
      });
      this.logger.log(`✅ Contadores actualizados para notificación ${notificationId}`);
    } catch (error) {
      this.logger.error(`❌ Error actualizando contadores de notificación`, error);
    }
  }

  /**
   * Actualiza el estado de una notificación
   */
  async updateNotificationStatus(
    notificationId: string,
    newStatus: NotificationStatus,
    metadata?: any,
  ): Promise<{ success: boolean; previousStatus?: NotificationStatus }> {
    try {
      const notificationRef = this.db.collection('notifications').doc(notificationId);
      const notificationDoc = await notificationRef.get();

      if (!notificationDoc.exists) {
        this.logger.warn(`⚠️ Notificación ${notificationId} no encontrada`);
        return { success: false };
      }

      const currentData = notificationDoc.data() as INotification;
      const previousStatus = currentData.status;
      const now = admin.firestore.Timestamp.now();

      // Preparar actualización
      const updateData: any = {
        status: newStatus,
      };

      // Agregar timestamp según el estado
      switch (newStatus) {
        case NotificationStatus.SENT:
          updateData.sentAt = now;
          break;
        case NotificationStatus.DELIVERED:
          updateData.deliveredAt = now;
          break;
        case NotificationStatus.READ:
          updateData.readAt = now;
          break;
      }

      await notificationRef.update(updateData);

      // Registrar en historial de estados
      await this.addNotificationStatusHistory(notificationId, previousStatus, newStatus, metadata);

      this.logger.log(`✅ Notificación ${notificationId}: ${previousStatus} → ${newStatus}`);
      return { success: true, previousStatus };
    } catch (error) {
      this.logger.error(`❌ Error actualizando estado de notificación ${notificationId}`, error);
      return { success: false };
    }
  }

  /**
   * Obtiene una notificación por ID
   */
  async getNotificationById(notificationId: string): Promise<INotification | null> {
    try {
      const doc = await this.db.collection('notifications').doc(notificationId).get();
      return doc.exists ? (doc.data() as INotification) : null;
    } catch (error) {
      this.logger.error(`❌ Error obteniendo notificación ${notificationId}`, error);
      return null;
    }
  }

  /**
   * Obtiene notificaciones de un usuario en un sistema
   */
  async getUserNotifications(
    userId: string,
    systemId: string,
    status?: NotificationStatus,
    limit: number = 50,
    startAfter?: string,
  ): Promise<{ notifications: INotification[]; hasMore: boolean }> {
    try {
      let query = this.db
        .collection('notifications')
        .where('userId', '==', userId)
        .where('systemId', '==', systemId)
        .orderBy('createdAt', 'desc')
        .limit(limit + 1);

      if (status) {
        query = query.where('status', '==', status);
      }

      if (startAfter) {
        const startDoc = await this.db.collection('notifications').doc(startAfter).get();
        if (startDoc.exists) {
          query = query.startAfter(startDoc);
        }
      }

      const snapshot = await query.get();
      const notifications = snapshot.docs
        .slice(0, limit)
        .map(doc => doc.data() as INotification);

      return {
        notifications,
        hasMore: snapshot.docs.length > limit,
      };
    } catch (error) {
      this.logger.error(`❌ Error obteniendo notificaciones de usuario ${userId}`, error);
      return { notifications: [], hasMore: false };
    }
  }

  // =============================================
  // MÉTODOS PARA HISTORIAL DE ESTADOS
  // =============================================

  /**
   * Agrega un registro al historial de estados de una notificación
   */
  private async addNotificationStatusHistory(
    notificationId: string,
    previousStatus: NotificationStatus | undefined,
    newStatus: NotificationStatus,
    metadata?: any,
  ): Promise<void> {
    try {
      const historyId = uuidv4();
      const historyData: INotificationStatusHistory = {
        historyId,
        notificationId,
        previousStatus,
        newStatus,
        timestamp: admin.firestore.Timestamp.now(),
        metadata: metadata || {},
      };

      await this.db.collection('notification_status_history').doc(historyId).set(historyData);
    } catch (error) {
      this.logger.error(`❌ Error agregando historial de estado`, error);
    }
  }

  /**
   * Obtiene el historial de estados de una notificación
   */
  async getNotificationStatusHistory(
    notificationId: string,
  ): Promise<INotificationStatusHistory[]> {
    try {
      const snapshot = await this.db
        .collection('notification_status_history')
        .where('notificationId', '==', notificationId)
        .orderBy('timestamp', 'asc')
        .get();

      return snapshot.docs.map(doc => doc.data() as INotificationStatusHistory);
    } catch (error) {
      this.logger.error(`❌ Error obteniendo historial de notificación ${notificationId}`, error);
      return [];
    }
  }
}
