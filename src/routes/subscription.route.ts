import { Post, Body, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Routes } from 'src/common/decorators/route.decorator';
import { SubscriptionController } from 'src/controllers/subscription.controller';
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

/**
 * Rutas para gestión de notificaciones push FCM
 */
@ApiTags('subscription')
@Routes('subscription')
export class SubscriptionRoute {
  constructor(private readonly controller: SubscriptionController) {}

  /**
   * Envía notificación a todos los dispositivos de un usuario
   */
  @Post('send-notification')
  @ApiOperation({
    summary: 'Envía notificación a todos los tokens registrados de un usuario',
    description: 'Busca todos los tokens FCM del usuario y envía la notificación a cada uno',
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
   * Registra un token FCM para un usuario
   */
  @Post('register-token')
  @ApiOperation({
    summary: 'Registra un token FCM para recibir notificaciones push',
    description: 'Guarda el token FCM asociado a un usuario para envío de notificaciones',
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
}


