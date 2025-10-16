import { NestFactory } from '@nestjs/core';
import { AppInjectable } from './app.injectable';
import { AllExceptionsFilter } from './common/interceptors/all-exceptions.filter';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { HapiAdapter, NestHapiApplication } from 'adapters';

async function bootstrap() {
  const lg = new Logger('Main');
  lg.log('🚀 Iniciando aplicación...');

  const app = await NestFactory.create<NestHapiApplication>(
    AppInjectable, //aqui es donde se maneja las injecciones de dependencias
    new HapiAdapter
  );
  const { 
    PORT,
    APP_NAME,
    CORS_ORIGIN
  } = process.env;

  // Configuración de CORS
  if (CORS_ORIGIN) {
    const corsOptions: CorsOptions = {
      origin: CORS_ORIGIN.split(',').map(origin => origin.trim()),
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Access-Control-Allow-Headers',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers',
        'x-version',
        'x-service',
        'x-api-key',
        'x-client',
        'x-client-id',
        'x-request-id',
        'x-correlation-id',
        'x-user-id',
        'x-tenant-id',
        'x-forwarded-for',
        'x-real-ip',
        'cache-control',
        'pragma',
        'expires',
        'if-none-match',
        'if-modified-since'
      ],
      credentials: true,
      optionsSuccessStatus: 204
    };

    app.enableCors(corsOptions);
    lg.log(`✅ CORS habilitado para orígenes: ${CORS_ORIGIN}`);
  } else {
    lg.log('⚠️ CORS no configurado - variable CORS_ORIGIN no encontrada');
  }

  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix("api/v1");

  // Health check endpoint (incluye métricas de conexiones SSE)
  app.getHttpAdapter().get('/health', (_req: any, res: any) => {
    try {
      const { SSEConnectionManagerService } = require('./services/sse-connection-manager.service');
      const connections = (global as any)?.__sseConnections || undefined;
      const payload = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        activeConnections: connections?.getConnectionCount?.() || undefined
      };
      res.statusCode = 200;
      if (!res.getHeader || !res.getHeader('content-type')) {
        res.setHeader && res.setHeader('content-type', 'application/json; charset=utf-8');
      }
      res.end(JSON.stringify(payload));
    } catch {
      res.statusCode = 200;
      res.end('ok');
    }
  });

  // Configuración de Swagger (sin autenticación básica)
  const config = new DocumentBuilder()
    .setTitle('Broadcaster API - Notificaciones')
    .setDescription('API para gestión de notificaciones en tiempo real mediante SSE y webhooks de Pub/Sub')
    .setVersion('1.0')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);

  // Registrar Swagger desde el adapter (seguro y "nativo")
  (app.getHttpAdapter() as any).registerSwagger(document, {
    mountPath: '/api/docs',
    jsonPath: '/api/docs-json',
    allowedEnvironments: ['development', 'staging'],
  });

  app.listen(PORT ?? 8080, '0.0.0.0', async () => {
    const url = await app.getUrl();
    lg.debug(`Server HAPI ${APP_NAME ?? 'Rentas API Clientes'} listening at ${url}`);
    lg.debug(`Swagger documentation available at ${url}/api/docs`);
  });
}
bootstrap();
