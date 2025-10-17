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
}


