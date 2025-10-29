import { Post, Body, UsePipes } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Routes } from 'src/common/decorators/route.decorator';
import { SubscriptionController } from 'src/controllers/subscription.controller';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import {
  RegisterTokenDto,
  RegisterTokenResponse,
  RegisterTokenSchema,
} from 'src/controllers/dtos/register-token.dto';
import {
  UnregisterTokenDto,
  UnregisterTokenResponse,
  UnregisterTokenSchema,
} from 'src/controllers/dtos/unregister-token.dto';
import {
  SendNotificationDto,
  SendNotificationResponse,
  SendNotificationSchema,
} from 'src/controllers/dtos/send-notification.dto';
import {
  UpdateNotificationStatusDto,
  UpdateNotificationStatusResponse,
  GetUserNotificationsDto,
  GetUserNotificationsResponse,
  GetNotificationHistoryDto,
  GetNotificationHistoryResponse,
  UpdateNotificationStatusSchema,
  GetUserNotificationsSchema,
  GetNotificationHistorySchema,
} from 'src/controllers/dtos/notification-status.dto';

/**
 * Rutas para gestión de notificaciones push FCM
 */
@ApiTags('subscription')
@Routes('subscription')
export class SubscriptionRoute {
  constructor(private readonly controller: SubscriptionController) {}

  /**
   * Envía notificación a todos los dispositivos de un usuario en un sistema
   */
  @Post('send-notification')
  @UsePipes(new JoiValidationPipe(SendNotificationSchema))
  @ApiOperation({
    summary: 'Envía notificación a todos los tokens registrados de un usuario en un sistema',
    description: 'Busca todos los tokens FCM del usuario en el sistema especificado y envía la notificación a cada uno',
  })
  @ApiResponse({
    status: 200,
    description: 'Notificación enviada exitosamente',
    type: Object,
  })
  async sendNotification(@Body() body: SendNotificationDto): Promise<SendNotificationResponse> {
    return await this.controller.sendNotification(body);
  }

  /**
   * Guarda o actualiza un token FCM para un usuario en un sistema
   */
  @Post('save-token')
  @UsePipes(new JoiValidationPipe(RegisterTokenSchema))
  @ApiOperation({
    summary: 'Guarda o actualiza un token FCM para recibir notificaciones push',
    description: 'Si se proporciona un ID, actualiza el token existente. Si no, crea un nuevo registro. Retorna el documento completo para guardarlo en localStorage.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token guardado/actualizado exitosamente. Retorna el documento completo.',
    type: Object,
  })
  async saveToken(@Body() body: RegisterTokenDto): Promise<RegisterTokenResponse> {
    return await this.controller.registerToken(body);
  }

  /**
   * @deprecated Use save-token en su lugar
   * Registra un token FCM para un usuario en un sistema
   */
  @Post('register-token')
  @UsePipes(new JoiValidationPipe(RegisterTokenSchema))
  @ApiOperation({
    summary: '[DEPRECATED] Use save-token. Registra un token FCM',
    description: 'Este endpoint está deprecado. Use save-token en su lugar.',
    deprecated: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Token registrado exitosamente',
    type: Object,
  })
  async registerToken(@Body() body: RegisterTokenDto): Promise<RegisterTokenResponse> {
    return await this.controller.registerToken(body);
  }

  /**
   * Elimina un token FCM
   */
  @Post('unregister-token')
  @UsePipes(new JoiValidationPipe(UnregisterTokenSchema))
  @ApiOperation({
    summary: 'Elimina un token FCM',
    description: 'Elimina un token FCM registrado previamente',
  })
  @ApiResponse({
    status: 200,
    description: 'Token eliminado exitosamente',
    type: Object,
  })
  async unregisterToken(@Body() body: UnregisterTokenDto): Promise<UnregisterTokenResponse> {
    return await this.controller.unregisterToken(body);
  }

  /**
   * Actualiza el estado de una notificación (enviado, entregado, leído, failed)
   */
  @Post('update-notification-status')
  @UsePipes(new JoiValidationPipe(UpdateNotificationStatusSchema))
  @ApiOperation({
    summary: 'Actualiza el estado de una notificación',
    description: 'Permite actualizar el estado de una notificación (pending, sent, delivered, read, failed)',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado exitosamente',
    type: Object,
  })
  async updateNotificationStatus(
    @Body() body: UpdateNotificationStatusDto,
  ): Promise<UpdateNotificationStatusResponse> {
    return await this.controller.updateNotificationStatus(body);
  }

  /**
   * Obtiene todas las notificaciones de un usuario en un sistema
   */
  @Post('get-user-notifications')
  @UsePipes(new JoiValidationPipe(GetUserNotificationsSchema))
  @ApiOperation({
    summary: 'Obtiene las notificaciones de un usuario en un sistema',
    description: 'Retorna todas las notificaciones de un usuario filtradas por sistema, con opción de filtrar por estado',
  })
  @ApiResponse({
    status: 200,
    description: 'Notificaciones obtenidas exitosamente',
    type: Object,
  })
  async getUserNotifications(
    @Body() body: GetUserNotificationsDto,
  ): Promise<GetUserNotificationsResponse> {
    return await this.controller.getUserNotifications(body);
  }

  /**
   * Obtiene el historial de cambios de estado de una notificación
   */
  @Post('get-notification-history')
  @UsePipes(new JoiValidationPipe(GetNotificationHistorySchema))
  @ApiOperation({
    summary: 'Obtiene el historial de estados de una notificación',
    description: 'Retorna todos los cambios de estado que ha tenido una notificación a lo largo del tiempo',
  })
  @ApiResponse({
    status: 200,
    description: 'Historial obtenido exitosamente',
    type: Object,
  })
  async getNotificationHistory(
    @Body() body: GetNotificationHistoryDto,
  ): Promise<GetNotificationHistoryResponse> {
    return await this.controller.getNotificationHistory(body);
  }
}
