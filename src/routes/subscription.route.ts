import { Post, Body, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Routes } from 'src/common/decorators/route.decorator';
import { SubscriptionController } from 'src/controllers/subscription.controller';

@ApiTags('subscription')
@Routes('subscription')
export class SubscriptionRoute {
  constructor(private readonly controller: SubscriptionController) {}

  @Post('subscription-handler')
  @ApiOperation({ summary: 'Webhook de Pub/Sub para recibir notificaciones' })
  @ApiResponse({ status: 200, description: 'ACK OK' })
  async handle(@Body() body: any, @Req() req: any): Promise<string> {
    return await this.controller.subscriptionHandler(body, req);
  }

  @Post('subscription-handler-plain')
  @ApiOperation({ summary: 'Webhook para recibir notificaciones en JSON plano (sin base64)' })
  @ApiResponse({ status: 200, description: 'ACK OK' })
  async handlePlain(@Body() body: any, @Req() req: any): Promise<string> {
    return await this.controller.subscriptionHandlerPlain(body, req);
  }

  @Post('register-token')
  @ApiOperation({ summary: 'Registra un token FCM para recibir notificaciones push web' })
  @ApiResponse({ status: 200, description: 'Token registrado exitosamente' })
  async registerToken(@Body() body: any): Promise<any> {
    return await this.controller.registerToken(body);
  }

  @Post('unregister-token')
  @ApiOperation({ summary: 'Elimina un token FCM' })
  @ApiResponse({ status: 200, description: 'Token eliminado exitosamente' })
  async unregisterToken(@Body() body: any): Promise<any> {
    return await this.controller.unregisterToken(body);
  }
}


