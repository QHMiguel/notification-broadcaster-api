import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { FirebaseAdmin, InjectFirebaseAdmin } from 'nestjs-firebase';
import * as admin from 'firebase-admin';

interface UserTokenDoc {
  userId: string;
  token: string;
  deviceInfo?: {
    browser?: string;
    os?: string;
    userAgent?: string;
  };
  createdAt: admin.firestore.Timestamp;
  lastUsed: admin.firestore.Timestamp;
}

interface GroupDoc {
  groupId: string;
  userIds: string[];
  name?: string;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

interface NotificationDoc {
  messageId: string;
  recipient?: any;
  notification?: any;
  sender?: any;
  status?: string;
  createdAt: admin.firestore.Timestamp;
  deliveredAt?: admin.firestore.Timestamp;
  readAt?: admin.firestore.Timestamp;
}

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
  // MÉTODOS PARA TOKENS FCM
  // =============================================

  /**
   * Registra o actualiza un token FCM para un usuario
   */
  async saveUserToken(userId: string, token: string, deviceInfo?: any): Promise<void> {
    try {
      const tokenRef = this.db.collection('fcm_tokens').doc(token);
      
      const tokenDoc = await tokenRef.get();
      const now = admin.firestore.Timestamp.now();

      if (tokenDoc.exists) {
        // Actualizar token existente
        await tokenRef.update({
          userId,
          deviceInfo: deviceInfo || null,
          lastUsed: now,
        });
      } else {
        // Crear nuevo token
        await tokenRef.set({
          userId,
          token,
          deviceInfo: deviceInfo || null,
          createdAt: now,
          lastUsed: now,
        });
      }

      this.logger.log(`✅ Token FCM registrado/actualizado para usuario ${userId}`);
    } catch (error) {
      this.logger.error(`❌ Error guardando token FCM para ${userId}`, error);
      throw error;
    }
  }

  /**
   * Obtiene todos los tokens FCM de un usuario
   */
  async getUserTokens(userId: string): Promise<string[]> {
    try {
      const snapshot = await this.db
        .collection('fcm_tokens')
        .where('userId', '==', userId)
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
   * Elimina todos los tokens de un usuario
   */
  async removeAllUserTokens(userId: string): Promise<void> {
    try {
      const snapshot = await this.db
        .collection('fcm_tokens')
        .where('userId', '==', userId)
        .get();

      const batch = this.db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      this.logger.log(`🗑️ ${snapshot.size} tokens eliminados para usuario ${userId}`);
    } catch (error) {
      this.logger.error(`❌ Error eliminando tokens de usuario ${userId}`, error);
    }
  }

  /**
   * Elimina tokens inválidos de un usuario
   */
  async removeInvalidTokens(userId: string, invalidTokens: string[]): Promise<void> {
    if (invalidTokens.length === 0) return;

    try {
      const batch = this.db.batch();
      
      invalidTokens.forEach(token => {
        const tokenRef = this.db.collection('fcm_tokens').doc(token);
        batch.delete(tokenRef);
      });

      await batch.commit();
      this.logger.log(`🧹 ${invalidTokens.length} tokens inválidos eliminados para usuario ${userId}`);
    } catch (error) {
      this.logger.error(`❌ Error eliminando tokens inválidos`, error);
    }
  }

  /**
   * Obtiene todos los tokens FCM de todos los usuarios (para broadcast)
   */
  async getAllTokens(): Promise<string[]> {
    try {
      const snapshot = await this.db.collection('fcm_tokens').get();
      return snapshot.docs.map(doc => doc.data().token);
    } catch (error) {
      this.logger.error('❌ Error obteniendo todos los tokens', error);
      return [];
    }
  }

  /**
   * Limpia tokens antiguos no usados (ej: más de 90 días)
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
  // MÉTODOS PARA GRUPOS
  // =============================================

  /**
   * Crea o actualiza un grupo
   */
  async saveGroup(groupId: string, userIds: string[], name?: string): Promise<void> {
    try {
      const groupRef = this.db.collection('groups').doc(groupId);
      const groupDoc = await groupRef.get();
      const now = admin.firestore.Timestamp.now();

      if (groupDoc.exists) {
        await groupRef.update({
          userIds,
          name: name || null,
          updatedAt: now,
        });
      } else {
        await groupRef.set({
          groupId,
          userIds,
          name: name || null,
          createdAt: now,
          updatedAt: now,
        });
      }

      this.logger.log(`✅ Grupo ${groupId} guardado con ${userIds.length} usuarios`);
    } catch (error) {
      this.logger.error(`❌ Error guardando grupo ${groupId}`, error);
    }
  }

  /**
   * Obtiene todos los tokens FCM de los usuarios de un grupo
   */
  async getGroupTokens(groupId: string): Promise<string[]> {
    try {
      const groupDoc = await this.db.collection('groups').doc(groupId).get();

      if (!groupDoc.exists) {
        return [];
      }

      const groupData = groupDoc.data() as GroupDoc;
      if (!groupData.userIds || groupData.userIds.length === 0) {
        return [];
      }

      // Firestore tiene límite de 10 elementos en "in" query, dividir si es necesario
      const tokens: string[] = [];
      const chunkSize = 10;

      for (let i = 0; i < groupData.userIds.length; i += chunkSize) {
        const chunk = groupData.userIds.slice(i, i + chunkSize);
        const snapshot = await this.db
          .collection('fcm_tokens')
          .where('userId', 'in', chunk)
          .get();

        tokens.push(...snapshot.docs.map(doc => doc.data().token));
      }

      return tokens;
    } catch (error) {
      this.logger.error(`❌ Error obteniendo tokens de grupo ${groupId}`, error);
      return [];
    }
  }

  /**
   * Agrega un usuario a un grupo
   */
  async addUserToGroup(groupId: string, userId: string): Promise<void> {
    try {
      const groupRef = this.db.collection('groups').doc(groupId);
      const groupDoc = await groupRef.get();

      if (groupDoc.exists) {
        await groupRef.update({
          userIds: admin.firestore.FieldValue.arrayUnion(userId),
          updatedAt: admin.firestore.Timestamp.now(),
        });
      } else {
        await groupRef.set({
          groupId,
          userIds: [userId],
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        });
      }

      this.logger.log(`✅ Usuario ${userId} agregado al grupo ${groupId}`);
    } catch (error) {
      this.logger.error(`❌ Error agregando usuario a grupo`, error);
    }
  }

  /**
   * Elimina un usuario de un grupo
   */
  async removeUserFromGroup(groupId: string, userId: string): Promise<void> {
    try {
      const groupRef = this.db.collection('groups').doc(groupId);

      await groupRef.update({
        userIds: admin.firestore.FieldValue.arrayRemove(userId),
        updatedAt: admin.firestore.Timestamp.now(),
      });

      this.logger.log(`🗑️ Usuario ${userId} eliminado del grupo ${groupId}`);
    } catch (error) {
      this.logger.error(`❌ Error eliminando usuario de grupo`, error);
    }
  }

  // =============================================
  // MÉTODOS PARA NOTIFICACIONES
  // =============================================

  /**
   * Marca una notificación como entregada
   */
  async markAsDelivered(messageId: string): Promise<void> {
    try {
      const notificationRef = this.db.collection('notifications').doc(messageId);
      await notificationRef.update({
        status: 'delivered',
        deliveredAt: admin.firestore.Timestamp.now(),
      });
      this.logger.log(`✓ Notificación ${messageId} marcada como entregada`);
    } catch (error) {
      this.logger.error(`❌ Error marcando notificación ${messageId} como entregada`, error);
    }
  }

  /**
   * Obtiene una notificación por ID
   */
  async getNotificationById(messageId: string): Promise<any | null> {
    try {
      const doc = await this.db.collection('notifications').doc(messageId).get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      this.logger.error(`❌ Error obteniendo notificación ${messageId}`, error);
      return null;
    }
  }

  /**
   * Marca una notificación como leída
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      const notificationRef = this.db.collection('notifications').doc(messageId);
      await notificationRef.update({
        status: 'read',
        readAt: admin.firestore.Timestamp.now(),
      });
      this.logger.log(`✓ Notificación ${messageId} marcada como leída`);
    } catch (error) {
      this.logger.error(`❌ Error marcando notificación ${messageId} como leída`, error);
    }
  }

  /**
   * Crea una nueva notificación
   */
  async createNotification(messageId: string, data: any): Promise<void> {
    try {
      await this.db.collection('notifications').doc(messageId).set({
        ...data,
        messageId,
        createdAt: admin.firestore.Timestamp.now(),
      });
      this.logger.log(`✅ Notificación ${messageId} creada en Firestore`);
    } catch (error) {
      this.logger.error(`❌ Error creando notificación ${messageId}`, error);
    }
  }
}

