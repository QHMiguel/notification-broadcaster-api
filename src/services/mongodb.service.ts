import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MongoClient, Db, Collection, UpdateResult } from 'mongodb';

// Esquema de notificación con _id como string (coincide con la POC)
interface NotificationDoc {
  _id: string;
  recipient?: any;
  notification?: any;
  sender?: any;
  status?: string;
  createdAt?: string;
  deliveredAt?: string;
  readAt?: string;
}

@Injectable()
export class MongoDBService implements OnModuleInit {
  private readonly logger = new Logger('MongoDBService');
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private collection: Collection<NotificationDoc> | null = null;

  async connect(): Promise<void> {
    const uri = process.env.MONGODB_URI as string;
    const dbName = process.env.MONGODB_DB as string;

    if (!uri || !dbName) {
      this.logger.warn('Variables MONGODB_URI o MONGODB_DB no configuradas');
      return;
    }

    this.client = new MongoClient(uri);
    await this.client.connect();
    this.db = this.client.db(dbName);
    this.collection = this.db.collection<NotificationDoc>('notifications');

    this.logger.log('MongoDB conectado');
    await this.collection.createIndex({ 'recipient.id': 1, status: 1 });
    await this.collection.createIndex({ createdAt: -1 });
  }

  onModuleInit(): any {
    // Conectar automáticamente si hay URL definida
    return this.connect().catch((err) => {
      this.logger.error('No se pudo conectar a MongoDB al iniciar el módulo', err);
    });
  }

  async markAsDelivered(messageId: string): Promise<UpdateResult<NotificationDoc> | undefined> {
    if (!this.collection) return undefined;
    const result = await this.collection.updateOne(
      { _id: messageId },
      { $set: { status: 'delivered', deliveredAt: new Date().toISOString() } }
    );
    this.logger.log(`Notificación ${messageId} marcada como entregada`);
    return result;
  }

  async getNotificationById(messageId: string): Promise<NotificationDoc | null> {
    if (!this.collection) return null;
    return await this.collection.findOne({ _id: messageId });
  }

  async markAsRead(messageId: string): Promise<UpdateResult<NotificationDoc> | undefined> {
    if (!this.collection) return undefined;
    const result = await this.collection.updateOne(
      { _id: messageId },
      { $set: { status: 'read', readAt: new Date().toISOString() } }
    );
    this.logger.log(`Notificación ${messageId} marcada como leída`);
    return result;
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.logger.log('Conexión MongoDB cerrada');
    }
  }
}


