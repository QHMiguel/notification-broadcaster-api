import { InjectDependencies } from './common/decorators/inject-dependencies.decorator';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TrackingLogger } from './common/logger/tracking.logger';
import { AsyncLocalStorage } from 'async_hooks';
import { TrackingInterceptor } from './common/interceptors/tracking-id.middleware';
import { APP_INTERCEPTOR } from '@nestjs/core';
import * as fs from 'fs';

// Rutas y controladores para Push Notification API
import { SubscriptionRoute } from './routes/subscription.route';
import { SubscriptionController } from './controllers/subscription.controller';

// Servicios e Integraciones
import { FirebaseModule } from 'nestjs-firebase';
import { Logger } from '@nestjs/common';
import { join } from 'path';
import { FIREBASE_PATH_KEY } from './common/constants/global.constant';
import { FireBaseService } from './integrations/firebase/firebase.service';
import { FirestoreService } from './integrations/firebase/firestore.service';

@InjectDependencies({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    FirebaseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const serviceAccountPath = join(FIREBASE_PATH_KEY, `${configService.get('FIREBASE_KEY_NAME')}`);
        if (!fs.existsSync(serviceAccountPath)) {
          Logger.error('❌ Firebase Credential file NOT FOUND at path:', serviceAccountPath);
        }

        return {
          googleApplicationCredential: serviceAccountPath,
        };
      },
      inject: [ConfigService],
    }),
  ],
  routes: [SubscriptionRoute],
  services: [
    FirestoreService,
    FireBaseService,
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
  controllers: [SubscriptionController]
})
export class AppInjectable {}
