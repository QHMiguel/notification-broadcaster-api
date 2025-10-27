import { join } from "path";

export enum DB_NAME {
	EXP_SERV_CWRV = "EXP_SERV_CWRV"
}

/**
 * Estados de las notificaciones push
 */
export enum NotificationStatus {
	PENDING = 'pending',      // Notificación creada pero no enviada
	SENT = 'sent',            // Notificación enviada a FCM
	DELIVERED = 'delivered',  // Notificación entregada al dispositivo
	READ = 'read',            // Notificación leída por el usuario
	FAILED = 'failed'         // Error al enviar la notificación
}

/**
 * Tipos de sistemas/frontends soportados
 */
export enum SystemType {
	PORTAL_SISTEMAS = 'portal-sistemas',
	ADMIN_PANEL = 'admin-panel',
	MOBILE_APP = 'mobile-app'
}

export const FIREBASE_PATH_KEY = join(process.cwd(), 'src', 'integrations', 'firebase', 'keys');
