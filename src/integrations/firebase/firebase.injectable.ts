// src/integrations/firebase/firebase.module.ts
import { DynamicModule, Logger, Module, Provider } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';  // import modular

export interface FirebaseModuleOptions {
    projectId: string;
    clientEmail: string;
    privateKey: string;
    databaseName?: string; // 🔹 opcional
}
export const FIREBASE_OPTIONS = 'FIREBASE_OPTIONS';
export const FIREBASE_ADMIN = 'FIREBASE_ADMIN';

@Module({})
export class FirebaseModule {
  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<FirebaseModuleOptions> | FirebaseModuleOptions;
    inject?: any[];
  }): DynamicModule {
    const asyncProvider: Provider = {
      provide: FIREBASE_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    const firebaseAdminProvider: Provider = {
        provide: FIREBASE_ADMIN,
        useFactory: (opts: FirebaseModuleOptions) => {
          const app =
            admin.apps.length === 0
              ? admin.initializeApp({
                  credential: admin.credential.cert({
                    projectId: opts.projectId,
                    clientEmail: opts.clientEmail,
                    privateKey: opts.privateKey.replace(/\\n/g, '\n'),
                  }),
                })
              : admin.app();
      
          let db;
      
          if (opts.databaseName && opts.databaseName !== 'default') {
            db = getFirestore(app, opts.databaseName);
          } else {
            db = getFirestore(app);
          }
      
          // Si quieres ignorar `undefined`:
          db.settings({ ignoreUndefinedProperties: true });
      
          Logger.log(`[FirebaseModule] Conectado a base: ${opts.databaseName || 'default'}`);
          return { admin, db };
        },
        inject: [FIREBASE_OPTIONS],
      };

    return {
      module: FirebaseModule,
      providers: [asyncProvider, firebaseAdminProvider],
      exports: [firebaseAdminProvider],
    };
  }
}
