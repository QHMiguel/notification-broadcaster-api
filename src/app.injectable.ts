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
import { SubscriptionService } from './services/subscription.service';
import { Logger } from '@nestjs/common';
import { join } from 'path';
import { FIREBASE_PATH_KEY } from './common/constants/global.constant';
import { FireBaseService } from './integrations/firebase/firebase.service';
import { FirestoreService } from './integrations/firebase/firestore.service';
import { FirebaseModule } from './integrations/firebase/firebase.injectable';


@InjectDependencies({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    FirebaseModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        const serviceAccountPath = join(FIREBASE_PATH_KEY, `${configService.get('FIREBASE_NAME_FILE_KEY')}`);
        if (!fs.existsSync(serviceAccountPath)) {
          Logger.error('❌ Firebase Credential file NOT FOUND at path:', serviceAccountPath);
          throw new Error('Firebase credential file not found');
        }

        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

        return {
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key,
          databaseName: configService.get('FIREBASE_DATABASE_NAME'),
        };
      },
      inject: [ConfigService],
    }),
  ],
  routes: [SubscriptionRoute],
  services: [
    SubscriptionService,
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
