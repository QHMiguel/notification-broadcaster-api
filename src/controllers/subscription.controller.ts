import { Injectable } from '@nestjs/common';
import { SubscriptionService } from 'src/services/subscription.service';
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
} from './dtos/notification-status.dto';

/**
 * Controlador para gestión de suscripciones y notificaciones push
 * Actúa como intermediario entre las rutas y el service
 */
@Injectable()
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
  ) {}

  /**
   * POST /subscription/send-notification
   * Envía notificación a todos los dispositivos de un usuario en un sistema
   */
  async sendNotification(dto: SendNotificationDto): Promise<SendNotificationResponse> {
    return await this.subscriptionService.sendNotification(dto);
  }

  /**
   * POST /subscription/register-token
   * Registra un token FCM para un usuario en un sistema
   */
  async registerToken(dto: RegisterTokenDto): Promise<RegisterTokenResponse> {
    return await this.subscriptionService.registerToken(dto);
  }

  /**
   * POST /subscription/unregister-token
   * Elimina un token FCM
   */
  async unregisterToken(dto: UnregisterTokenDto): Promise<UnregisterTokenResponse> {
    return await this.subscriptionService.unregisterToken(dto);
  }

  /**
   * POST /subscription/update-notification-status
   * Actualiza el estado de una notificación (enviado, entregado, leído)
   */
  async updateNotificationStatus(dto: UpdateNotificationStatusDto): Promise<UpdateNotificationStatusResponse> {
    return await this.subscriptionService.updateNotificationStatus(dto);
  }

  /**
   * POST /subscription/get-user-notifications
   * Obtiene las notificaciones de un usuario en un sistema
   */
  async getUserNotifications(dto: GetUserNotificationsDto): Promise<GetUserNotificationsResponse> {
    return await this.subscriptionService.getUserNotifications(dto);
  }

  /**
   * POST /subscription/get-notification-history
   * Obtiene el historial de estados de una notificación
   */
  async getNotificationHistory(dto: GetNotificationHistoryDto): Promise<GetNotificationHistoryResponse> {
    return await this.subscriptionService.getNotificationHistory(dto);
  }
}
