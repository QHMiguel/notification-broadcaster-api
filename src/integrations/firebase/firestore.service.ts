import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
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
import { FIREBASE_ADMIN } from './firebase.injectable';

@Injectable()
export class FirestoreService implements OnModuleInit {
  private readonly logger = new Logger(FirestoreService.name);
  private db: admin.firestore.Firestore;

  constructor(
    @Inject(FIREBASE_ADMIN)
    private readonly firebaseAdmin: { admin: typeof admin; db: admin.firestore.Firestore },
  ) {}

  async onModuleInit() {
    this.db = this.firebaseAdmin.db;
    this.logger.log('✅ Firestore inicializado correctamente');
    await this.createIndexes();
  }

  private async createIndexes() {
    this.logger.log('📊 Firestore listo (índices manejados por Firebase)');
  }

  // =============================================
  // MÉTODOS PARA SISTEMAS
  // =============================================

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

  async getSystem(systemId: string): Promise<ISystem | null> {
    try {
      const doc = await this.db.collection('systems').doc(systemId).get();
      return doc.exists ? (doc.data() as ISystem) : null;
    } catch (error) {
      this.logger.error(`❌ Error obteniendo sistema ${systemId}`, error);
      return null;
    }
  }

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

  async saveUser(userId: string, metadata?: any): Promise<void> {
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

  async saveUserToken(
    id: string | undefined,
    userId: string, 
    systemId: string, 
    token: string, 
    deviceInfo?: any
  ): Promise<{ id: string; isNewRegistration: boolean; data: IFcmToken }> {
    try {
      const now = admin.firestore.Timestamp.now();
      let tokenRef: admin.firestore.DocumentReference;
      let isNewRegistration: boolean;

      // Si se proporciona un ID, actualizar ese documento
      if (id) {
        tokenRef = this.db.collection('fcm_tokens').doc(id);
        const tokenDoc = await tokenRef.get();
        
        if (!tokenDoc.exists) {
          throw new Error(`No se encontró el documento con ID: ${id}`);
        }

        isNewRegistration = false;
        const oldToken = (tokenDoc.data() as IFcmToken).token;
        
        if (oldToken !== token) {
          this.logger.log(`🔄 Token FCM actualizado para documento ${id.substring(0, 20)}...`);
        }
      } else {
        // Buscar si el token ya existe en algún documento
        const existingTokenQuery = await this.db
          .collection('fcm_tokens')
          .where('token', '==', token)
          .limit(1)
          .get();

        if (!existingTokenQuery.empty) {
          // El token ya existe, reutilizar ese documento
          const existingDoc = existingTokenQuery.docs[0];
          tokenRef = existingDoc.ref;
          isNewRegistration = false;
          
          this.logger.log(
            `🔍 Token ya existe en documento ${tokenRef.id.substring(0, 20)}..., reutilizando`
          );
        } else {
          // Token no existe, crear nuevo documento con ID autogenerado
          tokenRef = this.db.collection('fcm_tokens').doc();
          isNewRegistration = true;
        }
      }

      const tokenData: IFcmToken = {
        token,
        userId,
        systemId,
        deviceInfo: deviceInfo || {},
        createdAt: isNewRegistration ? now : (await tokenRef.get()).data()?.createdAt || now,
        lastUsed: now,
      };

      await tokenRef.set(tokenData, { merge: true });
      
      const action = isNewRegistration ? 'registrado' : 'actualizado';
      this.logger.log(
        `✅ Token FCM ${action} para usuario ${userId} en sistema ${systemId} (docId: ${tokenRef.id.substring(0, 20)}...)`
      );

      // Crear usuario si no existe
      const user = await this.getUser(userId);
      if (!user) {
        await this.saveUser(userId);
      }

      return { 
        id: tokenRef.id, 
        isNewRegistration,
        data: tokenData
      };
    } catch (error) {
      this.logger.error(`❌ Error guardando token FCM`, error);
      throw error;
    }
  }

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

  async removeUserToken(id?: string, token?: string): Promise<void> {
    try {
      if (!id && !token) {
        throw new Error('Debe proporcionar id o token');
      }

      // Si se proporciona ID, eliminar directamente
      if (id) {
        await this.db.collection('fcm_tokens').doc(id).delete();
        this.logger.log(`🗑️ Token FCM eliminado por ID: ${id.substring(0, 20)}...`);
        return;
      }

      // Si solo se proporciona token, buscar el documento por token
      if (token) {
        const tokenQuery = await this.db
          .collection('fcm_tokens')
          .where('token', '==', token)
          .limit(1)
          .get();

        if (!tokenQuery.empty) {
          const docRef = tokenQuery.docs[0].ref;
          await docRef.delete();
          this.logger.log(`🗑️ Token FCM eliminado por token: ${token.substring(0, 20)}...`);
        } else {
          this.logger.warn(`⚠️ Token no encontrado: ${token.substring(0, 20)}...`);
        }
      }
    } catch (error) {
      this.logger.error(`❌ Error eliminando token FCM`, error);
      throw error;
    }
  }

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
        image: data.image ?? '',
        data: data.data || {},
        tokensCount: 0,
        successCount: 0,
        failureCount: 0,
        createdAt: now,
      };

      await this.db.collection('notifications').doc(notificationId).set(notificationData);
      await this.addNotificationStatusHistory(notificationId, undefined, NotificationStatus.PENDING);
      this.logger.log(`✅ Notificación ${notificationId} creada para usuario ${data.userId}`);
      return notificationId;
    } catch (error) {
      this.logger.error(`❌ Error creando notificación`, error);
      throw error;
    }
  }

  async updateNotificationCounts(notificationId: string, tokensCount: number, successCount: number, failureCount: number): Promise<void> {
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

  async updateNotificationStatus(notificationId: string, newStatus: NotificationStatus, metadata?: any): Promise<{ success: boolean; previousStatus?: NotificationStatus }> {
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

      const updateData: any = { status: newStatus };
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
      await this.addNotificationStatusHistory(notificationId, previousStatus, newStatus, metadata);
      this.logger.log(`✅ Notificación ${notificationId}: ${previousStatus} → ${newStatus}`);
      return { success: true, previousStatus };
    } catch (error) {
      this.logger.error(`❌ Error actualizando estado de notificación ${notificationId}`, error);
      return { success: false };
    }
  }

  async getNotificationById(notificationId: string): Promise<INotification | null> {
    try {
      const doc = await this.db.collection('notifications').doc(notificationId).get();
      return doc.exists ? (doc.data() as INotification) : null;
    } catch (error) {
      this.logger.error(`❌ Error obteniendo notificación ${notificationId}`, error);
      return null;
    }
  }

  async getUserNotifications(
    userId: string,
    systemId: string,
    status?: NotificationStatus,
    page: number = 1,
    limit: number = 10,
    daysBack: number = 7
  ): Promise<{ notifications: INotification[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    try {
      // Calcular fecha límite (daysBack días atrás)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);
      const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffDate);
      console.log("userId", userId, "systemId", systemId, "cutoffTimestamp", cutoffTimestamp)
      // Query base para contar totales
      let countQuery = this.db
        .collection('notifications')
        .where('userId', '==', userId)
        .where('systemId', '==', systemId)
        .where('createdAt', '>=', cutoffTimestamp);

      if (status) {
        countQuery = countQuery.where('status', '==', status);
      }

      // Obtener el total de registros
      const countSnapshot = await countQuery.count().get();
      const total = countSnapshot.data().count;

      // Calcular offset para la paginación
      const offset = (page - 1) * limit;

      // Query para obtener los datos paginados
      let dataQuery = this.db
        .collection('notifications')
        .where('userId', '==', userId)
        .where('systemId', '==', systemId)
        .where('createdAt', '>=', cutoffTimestamp)
        .orderBy('createdAt', 'desc')
        .offset(offset)
        .limit(limit);

      if (status) {
        dataQuery = dataQuery.where('status', '==', status);
      }

      const snapshot = await dataQuery.get();
      const notifications = snapshot.docs.map(doc => doc.data() as INotification);

      // Priorizar notificaciones no leídas
      const unreadNotifications = notifications.filter(n => n.status !== NotificationStatus.READ);
      const readNotifications = notifications.filter(n => n.status === NotificationStatus.READ);

      const totalPages = Math.ceil(total / limit);

      this.logger.log(
        `📊 Obtenidas ${notifications.length} notificaciones (${unreadNotifications.length} no leídas, página ${page}/${totalPages}, últimos ${daysBack} días)`
      );

      // Retornar no leídas primero, luego leídas
      return {
        notifications: [...unreadNotifications, ...readNotifications],
        pagination: {
          total,
          page,
          limit,
          totalPages
        }
      };
    } catch (error) {
      this.logger.error(`❌ Error obteniendo notificaciones de usuario ${userId}`, error);
      return {
        notifications: [],
        pagination: {
          total: 0,
          page: 1,
          limit,
          totalPages: 0
        }
      };
    }
  }

  private async addNotificationStatusHistory(notificationId: string, previousStatus: NotificationStatus | undefined, newStatus: NotificationStatus, metadata?: any): Promise<void> {
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

  async getNotificationStatusHistory(notificationId: string): Promise<INotificationStatusHistory[]> {
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
