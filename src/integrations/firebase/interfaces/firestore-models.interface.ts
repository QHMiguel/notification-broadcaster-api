import { NotificationStatus } from 'src/common/constants/global.constant';
import * as admin from 'firebase-admin';

/**
 * ARQUITECTURA DE TABLAS EN FIRESTORE
 * 
 * COLECCIONES:
 * 1. systems - Sistemas/Frontends registrados
 * 2. users - Usuarios con sus sistemas asociados
 * 3. fcm_tokens - Tokens FCM por usuario y sistema
 * 4. notifications - Notificaciones enviadas
 * 5. notification_status_history - Historial de cambios de estado de notificaciones
 */

/**
 * Colección: systems
 * Describe: Sistemas/frontends que pueden enviar notificaciones
 */
export interface ISystem {
  systemId: string;           // ID único del sistema (ej: portal-sistemas, admin-panel)
  name: string;               // Nombre descriptivo del sistema
  description?: string;       // Descripción opcional
  active: boolean;            // Si el sistema está activo
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

/**
 * Colección: users
 * Describe: Usuarios registrados en el sistema de notificaciones
 * Nota: Los sistemas se manejan a nivel de tokens y notificaciones, no a nivel de usuario
 */
export interface IUser {
  userId: string;             // ID único del usuario
  metadata?: {                // Metadata adicional del usuario (opcional)
    email?: string;
    name?: string;
    [key: string]: any;
  };
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

/**
 * Colección: fcm_tokens
 * Describe: Tokens FCM registrados por usuario y sistema
 * Document ID: token (el propio token FCM como ID)
 */
export interface IFcmToken {
  token: string;              // Token FCM
  userId: string;             // ID del usuario propietario
  systemId: string;           // Sistema al que pertenece este token
  deviceInfo?: {              // Información del dispositivo
    userAgent?: string;
    platform?: string;
    browser?: string;
    os?: string;
    [key: string]: any;
  };
  createdAt: admin.firestore.Timestamp;
  lastUsed: admin.firestore.Timestamp;
}

/**
 * Colección: notifications
 * Describe: Notificaciones enviadas a usuarios
 */
export interface INotification {
  notificationId: string;     // ID único de la notificación
  userId: string;             // Usuario destinatario
  systemId: string;           // Sistema que envió la notificación
  status: NotificationStatus; // Estado actual de la notificación
  title: string;              // Título de la notificación
  body: string;               // Cuerpo del mensaje
  icon?: string;              // URL del icono
  image?: string;             // URL de la imagen
  data?: {                    // Datos personalizados
    [key: string]: any;
  };
  tokensCount: number;        // Cantidad de tokens a los que se envió
  successCount: number;       // Cantidad de envíos exitosos
  failureCount: number;       // Cantidad de envíos fallidos
  createdAt: admin.firestore.Timestamp;
  sentAt?: admin.firestore.Timestamp;
  deliveredAt?: admin.firestore.Timestamp;
  readAt?: admin.firestore.Timestamp;
}

/**
 * Colección: notification_status_history
 * Describe: Historial de cambios de estado de cada notificación
 */
export interface INotificationStatusHistory {
  historyId: string;          // ID único del registro de historial
  notificationId: string;     // ID de la notificación
  previousStatus?: NotificationStatus; // Estado anterior
  newStatus: NotificationStatus;       // Nuevo estado
  timestamp: admin.firestore.Timestamp;
  metadata?: {                // Metadata adicional del cambio
    [key: string]: any;
  };
}

/**
 * DTO para crear una notificación
 */
export interface ICreateNotificationData {
  userId: string;
  systemId: string;
  title: string;
  body: string;
  icon?: string;
  image?: string;
  data?: { [key: string]: any };
}

