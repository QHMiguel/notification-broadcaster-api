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
  async subscriptionHandler(body: any, req?: any): Promise<string> {
    try {
      // Log del request completo
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.log('🌐 WEBHOOK REQUEST RECIBIDO: /subscription/subscription-handler');
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      if (req) {
        this.logger.log(`📍 URL: ${req.method} ${req.url}`);
        this.logger.log(`🌍 IP Origen: ${req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'}`);
        this.logger.log(`🔑 User-Agent: ${req.headers?.['user-agent'] || 'N/A'}`);
        
        // Headers relevantes de Pub/Sub
        const relevantHeaders = [
          'content-type',
          'authorization',
          'x-cloud-trace-context',
          'x-goog-resource-id',
          'x-goog-resource-state',
          'x-goog-message-number',
        ];
        
        this.logger.log('📋 Headers importantes:');
        relevantHeaders.forEach(header => {
          const value = req.headers?.[header];
          if (value) {
            this.logger.log(`   └─ ${header}: ${value}`);
          }
        });
      }
      
      this.logger.log('📦 Body completo del request:');
      this.logger.log(JSON.stringify(body, null, 2));
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const { message } = body || {};
      if (!message || !message.data) {
        this.logger.warn('❌ Mensaje inválido recibido (sin data)');
        return 'ERROR: Invalid message format';
      }

      // Decodificar mensaje de base64
      const decodedString = Buffer.from(message.data, 'base64').toString('utf-8');
      this.logger.log(`📩 Mensaje base64 recibido: ${message.data.substring(0, 100)}...`);
      this.logger.log(`📝 Mensaje decodificado: ${decodedString}`);

      const messageData = JSON.parse(decodedString);
      const { messageId, recipient, notification, sender } = messageData;

      // Log detallado del contenido
      this.logger.log(`📬 [${messageId}] Procesando mensaje`);
      this.logger.log(`   └─ Destinatario: ${recipient?.type}:${recipient?.id}`);
      this.logger.log(`   └─ Notificación: ${JSON.stringify(notification)}`);
      this.logger.log(`   └─ Remitente: ${JSON.stringify(sender)}`);

      // Buscar conexiones target
      let targetConnections: any[] = [];
      if (recipient?.type === 'individual') {
        const connection = this.connections.getUserConnection(recipient.id);
        if (connection) targetConnections.push(connection);
      } else if (recipient?.type === 'group') {
        targetConnections = this.connections.getGroupConnections(recipient.id);
      } else if (recipient?.type === 'broadcast') {
        targetConnections = Array.from(this.connections.users.values());
      }

      this.logger.log(`🔍 Conexiones encontradas: ${targetConnections.length} para ${recipient?.type}:${recipient?.id}`);
      
      // Mostrar usuarios conectados actualmente
      const allUsers = Array.from(this.connections.users.keys());
      this.logger.log(`👥 Usuarios conectados actualmente: ${allUsers.join(', ') || '(ninguno)'}`);

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

        this.logger.log(`📤 Datos SSE a enviar: ${sseData}`);

        let sent = 0;
        for (const connection of targetConnections) {
          try {
            connection.write('event: notification\n');
            connection.write(`data: ${sseData}\n`);
            connection.write(`id: ${messageId}\n\n`);
            sent++;
          } catch (error) {
            this.logger.warn(`⚠️ Error al enviar a una conexión: ${error}`);
          }
        }
        this.logger.log(`✅ [${messageId}] Enviados ${sent}/${targetConnections.length} eventos SSE`);

        await this.mongo.markAsDelivered(messageId);
        this.logger.log(`✓ [${messageId}] Marcado como entregado en BD`);
      } else {
        this.logger.warn(`⚠️ No hay conexiones activas para ${recipient?.type}:${recipient?.id}`);
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
  async subscriptionHandlerPlain(body: any, req?: any): Promise<string> {
    try {
      // Log del request completo
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.log('🌐 WEBHOOK REQUEST RECIBIDO: /subscription/subscription-handler-plain');
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      if (req) {
        this.logger.log(`📍 URL: ${req.method} ${req.url}`);
        this.logger.log(`🌍 IP Origen: ${req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'}`);
        this.logger.log(`🔑 User-Agent: ${req.headers?.['user-agent'] || 'N/A'}`);
        
        // Headers relevantes
        const relevantHeaders = [
          'content-type',
          'content-length',
          'authorization',
          'x-api-key',
          'x-request-id',
        ];
        
        this.logger.log('📋 Headers importantes:');
        relevantHeaders.forEach(header => {
          const value = req.headers?.[header];
          if (value) {
            this.logger.log(`   └─ ${header}: ${value}`);
          }
        });
      }
      
      this.logger.log('📦 Body completo del request:');
      this.logger.log(JSON.stringify(body, null, 2));
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const { messageId, recipient, notification, sender } = body || {};

      if (!messageId || !recipient) {
        this.logger.warn('❌ Payload inválido (plain): falta messageId o recipient');
        return 'ERROR: Invalid message format';
      }

      // Log detallado del contenido
      this.logger.log(`📬 [${messageId}] Procesando mensaje PLAIN`);
      this.logger.log(`   └─ Destinatario: ${recipient?.type}:${recipient?.id}`);
      this.logger.log(`   └─ Notificación: ${JSON.stringify(notification)}`);
      this.logger.log(`   └─ Remitente: ${JSON.stringify(sender)}`);

      // Buscar conexiones target
      let targetConnections: any[] = [];
      if (recipient?.type === 'individual') {
        const connection = this.connections.getUserConnection(recipient.id);
        if (connection) targetConnections.push(connection);
      } else if (recipient?.type === 'group') {
        targetConnections = this.connections.getGroupConnections(recipient.id);
      } else if (recipient?.type === 'broadcast') {
        targetConnections = Array.from(this.connections.users.values());
      }

      this.logger.log(`🔍 Conexiones encontradas: ${targetConnections.length} para ${recipient?.type}:${recipient?.id}`);
      
      // Mostrar usuarios conectados actualmente
      const allUsers = Array.from(this.connections.users.keys());
      this.logger.log(`👥 Usuarios conectados actualmente: ${allUsers.join(', ') || '(ninguno)'}`);

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

        this.logger.log(`📤 Datos SSE a enviar: ${sseData}`);

        let sent = 0;
        for (const connection of targetConnections) {
          try {
            connection.write('event: notification\n');
            connection.write(`data: ${sseData}\n`);
            connection.write(`id: ${messageId}\n\n`);
            sent++;
          } catch (error) {
            this.logger.warn(`⚠️ Error al enviar a una conexión: ${error}`);
          }
        }
        this.logger.log(`✅ [${messageId}] Enviados ${sent}/${targetConnections.length} eventos SSE (plain)`);

        await this.mongo.markAsDelivered(messageId);
        this.logger.log(`✓ [${messageId}] Marcado como entregado en BD`);
      } else {
        this.logger.warn(`⚠️ No hay conexiones activas para ${recipient?.type}:${recipient?.id}`);
      }

      return 'OK';
    } catch (error: any) {
      this.logger.error('Error en subscription-handler-plain', error?.stack || String(error));
      return 'ERROR';
    }
  }
}


