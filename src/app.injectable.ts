import { InjectDependencies } from './common/decorators/inject-dependencies.decorator';
import { ConfigModule } from '@nestjs/config';
import { TrackingLogger } from './common/logger/tracking.logger';
import { AsyncLocalStorage } from 'async_hooks';
import { TrackingInterceptor } from './common/interceptors/tracking-id.middleware';
import { APP_INTERCEPTOR } from '@nestjs/core';

// Rutas y controladores para Broadcaster API
import { StreamRoute } from './routes/stream.route';
import { SubscriptionRoute } from './routes/subscription.route';
import { StreamController } from './controllers/stream.controller';
import { SubscriptionController } from './controllers/subscription.controller';

// Servicios
import { SSEConnectionManagerService } from './services/sse-connection-manager.service';
import { MongoDBService } from './services/mongodb.service';

@InjectDependencies({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  routes: [StreamRoute, SubscriptionRoute],
  services: [
    SSEConnectionManagerService,
    MongoDBService,
    TrackingLogger,
    {
      provide: AsyncLocalStorage,
      useValue: new AsyncLocalStorage<any>(),
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TrackingInterceptor,
    }
  ],
  controllers: [StreamController, SubscriptionController]
})
export class AppInjectable {}
