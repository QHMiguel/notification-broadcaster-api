import { Injectable, Logger } from '@nestjs/common';
import { SSEConnectionManagerService } from 'src/services/sse-connection-manager.service';
import { MongoDBService } from 'src/services/mongodb.service';

@Injectable()
export class SubscriptionController {
  private readonly logger = new Logger('SubscriptionController');

  constructor(
    private readonly connections: SSEConnectionManagerService,
    private readonly mongo: MongoDBService,
  ) {}

  /**
   * POST /subscription/subscription-handler
   * Recibe mensajes push de Pub/Sub y reenvía por SSE
   */
  async subscriptionHandler(body: any): Promise<string> {
    try {
      const { message } = body || {};
      if (!message || !message.data) {
        this.logger.warn('Mensaje inválido recibido');
        return 'ERROR: Invalid message format';
      }

      const messageData = JSON.parse(Buffer.from(message.data, 'base64').toString('utf-8'));
      const { messageId, recipient, notification, sender } = messageData;

      this.logger.log(`Mensaje ${messageId} para ${recipient?.type}:${recipient?.id}`);

      let targetConnections: any[] = [];
      if (recipient?.type === 'individual') {
        const connection = this.connections.getUserConnection(recipient.id);
        if (connection) targetConnections.push(connection);
      } else if (recipient?.type === 'group') {
        targetConnections = this.connections.getGroupConnections(recipient.id);
      } else if (recipient?.type === 'broadcast') {
        targetConnections = Array.from(this.connections.users.values());
      }

      if (targetConnections.length > 0) {
        const current = await this.mongo.getNotificationById(messageId);
        const sseData = JSON.stringify({
          messageId,
          notification,
          recipient,
          sender,
          status: (current as any)?.status,
          createdAt: (current as any)?.createdAt,
          deliveredAt: (current as any)?.deliveredAt,
          timestamp: new Date().toISOString(),
        });

        let sent = 0;
        for (const connection of targetConnections) {
          try {
            connection.write('event: notification\n');
            connection.write(`data: ${sseData}\n`);
            connection.write(`id: ${messageId}\n\n`);
            sent++;
          } catch {
            // ignorar, heartbeat limpiará
          }
        }
        this.logger.log(`Enviados ${sent} eventos SSE`);

        await this.mongo.markAsDelivered(messageId);
      } else {
        this.logger.warn(`No hay conexiones activas para ${recipient?.type}:${recipient?.id}`);
      }

      return 'OK';
    } catch (error: any) {
      this.logger.error('Error en subscription-handler', error?.stack || String(error));
      // ACK igualmente para evitar reintentos en Pub/Sub
      return 'ERROR';
    }
  }

  /**
   * POST /subscription/subscription-handler-plain
   * Recibe mensajes JSON planos (sin base64) y reenvía por SSE
   */
  async subscriptionHandlerPlain(body: any): Promise<string> {
    try {
      const { messageId, recipient, notification, sender } = body || {};

      if (!messageId || !recipient) {
        this.logger.warn('Payload inválido (plain): falta messageId o recipient');
        return 'ERROR: Invalid message format';
      }

      this.logger.log(`Mensaje (plain) ${messageId} para ${recipient?.type}:${recipient?.id}`);

      let targetConnections: any[] = [];
      if (recipient?.type === 'individual') {
        const connection = this.connections.getUserConnection(recipient.id);
        if (connection) targetConnections.push(connection);
      } else if (recipient?.type === 'group') {
        targetConnections = this.connections.getGroupConnections(recipient.id);
      } else if (recipient?.type === 'broadcast') {
        targetConnections = Array.from(this.connections.users.values());
      }

      if (targetConnections.length > 0) {
        const current = await this.mongo.getNotificationById(messageId);
        const sseData = JSON.stringify({
          messageId,
          notification,
          recipient,
          sender,
          status: (current as any)?.status,
          createdAt: (current as any)?.createdAt,
          deliveredAt: (current as any)?.deliveredAt,
          timestamp: new Date().toISOString(),
        });

        let sent = 0;
        for (const connection of targetConnections) {
          try {
            connection.write('event: notification\n');
            connection.write(`data: ${sseData}\n`);
            connection.write(`id: ${messageId}\n\n`);
            sent++;
          } catch {
            // ignorar, heartbeat limpiará
          }
        }
        this.logger.log(`Enviados ${sent} eventos SSE (plain)`);

        await this.mongo.markAsDelivered(messageId);
      } else {
        this.logger.warn(`No hay conexiones activas para ${recipient?.type}:${recipient?.id}`);
      }

      return 'OK';
    } catch (error: any) {
      this.logger.error('Error en subscription-handler-plain', error?.stack || String(error));
      return 'ERROR';
    }
  }
}


