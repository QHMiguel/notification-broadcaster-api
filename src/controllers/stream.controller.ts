import { Injectable, Logger } from '@nestjs/common';
import { SSEConnectionManagerService } from 'src/services/sse-connection-manager.service';

@Injectable()
export class StreamController {
  private readonly logger = new Logger('StreamController');

  constructor(
    private readonly connections: SSEConnectionManagerService,
  ) {}

  /**
   * GET /stream/:userId
   * Establece conexión SSE con el cliente manteniendo headers y heartbeat
   */
  async streamHandler(req: any, res: any): Promise<void> {
    const userId = req.params?.userId;
    if (!userId) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Missing required parameter: userId' }));
      return;
    }

    this.logger.log(`Nueva conexión SSE de userId=${userId}`);

    try {
      // Headers SSE
      res.setHeader?.('Content-Type', 'text/event-stream');
      res.setHeader?.('Cache-Control', 'no-cache');
      res.setHeader?.('Connection', 'keep-alive');
      res.setHeader?.('X-Accel-Buffering', 'no');

      res.flushHeaders?.();

      // Metadata
      (res as any).userId = userId;
      this.connections.addUserConnection(userId, res);

      // Mensaje inicial
      res.write('event: connected\n');
      res.write(`data: {"userId":"${userId}","timestamp":"${new Date().toISOString()}"}\n\n`);

      // Heartbeat cada 30s
      const heartbeatInterval = setInterval(() => {
        try {
          if (!res.writableEnded && !res.destroyed) {
            res.write('event: heartbeat\n');
            res.write('data: ping\n\n');
          } else {
            this.logger.warn(`Conexión cerrada para ${userId}, deteniendo heartbeat`);
            clearInterval(heartbeatInterval);
            this.connections.cleanupConnection(userId, res);
          }
        } catch (error) {
          this.logger.warn(`Error en heartbeat para ${userId}, limpiando conexión`);
          clearInterval(heartbeatInterval);
          this.connections.cleanupConnection(userId, res);
        }
      }, 30000);

      req.on('close', () => {
        this.logger.log(`Cliente ${userId} cerró conexión`);
        clearInterval(heartbeatInterval);
        this.connections.cleanupConnection(userId, res);
      });

      req.on('error', (error: any) => {
        this.logger.error(`Error en conexión de ${userId}:`, error.message);
        clearInterval(heartbeatInterval);
        this.connections.cleanupConnection(userId, res);
      });

      res.on('error', (error: any) => {
        this.logger.error(`Error en response de ${userId}:`, error.message);
        clearInterval(heartbeatInterval);
        this.connections.cleanupConnection(userId, res);
      });

    } catch (error: any) {
      this.logger.error(`Error crítico estableciendo SSE para ${userId}:`, error.stack || error.message);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Failed to establish SSE connection' }));
      } else if (!res.writableEnded) {
        try {
          res.end();
        } catch {}
      }
      this.connections.cleanupConnection(userId, res);
    }
  }
}


