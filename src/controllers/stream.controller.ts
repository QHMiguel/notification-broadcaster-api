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
        res.write('event: heartbeat\n');
        res.write('data: ping\n\n');
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

    req.on('error', (_error: any) => {
      this.logger.error(`Error en conexión de ${userId}`);
      clearInterval(heartbeatInterval);
      this.connections.cleanupConnection(userId, res);
    });
  }
}


