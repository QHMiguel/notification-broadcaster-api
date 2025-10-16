import { Injectable, Logger } from '@nestjs/common';

/**
 * Gestor de conexiones SSE en memoria (singleton)
 */
@Injectable()
export class SSEConnectionManagerService {
  private readonly logger = new Logger('SSEConnectionManager');

  // Map de usuarios individuales: userId -> Response
  public readonly users: Map<string, any> = new Map<string, any>();

  // Map de grupos: groupId -> Array<Response>
  public readonly groups: Map<string, any[]> = new Map<string, any[]>();

  constructor() {
    // Exponer referencia global solo para casos donde no se dispone de DI (e.g., health custom)
    (global as any).__sseConnections = this;
  }

  addUserConnection(userId: string, response: any): void {
    this.users.set(userId, response);
    this.logger.log(`Usuario ${userId} conectado. Total usuarios: ${this.users.size}`);
  }

  addUserToGroup(groupId: string, response: any): void {
    if (!this.groups.has(groupId)) {
      this.groups.set(groupId, []);
    }
    this.groups.get(groupId)!.push(response);
    this.logger.log(`Usuario agregado a grupo ${groupId}`);
  }

  removeUserConnection(userId: string): void {
    const existed = this.users.delete(userId);
    if (existed) {
      this.logger.log(`Usuario ${userId} desconectado. Total usuarios: ${this.users.size}`);
    }
  }

  removeUserFromGroup(groupId: string, response: any): void {
    if (!this.groups.has(groupId)) return;
    const connections = this.groups.get(groupId)!;
    const index = connections.indexOf(response);
    if (index > -1) connections.splice(index, 1);
    if (connections.length === 0) this.groups.delete(groupId);
  }

  getUserConnection(userId: string): any | undefined {
    return this.users.get(userId);
  }

  getGroupConnections(groupId: string): any[] {
    return this.groups.get(groupId) || [];
  }

  getConnectionCount(): { users: number; groups: number } {
    return { users: this.users.size, groups: this.groups.size };
  }

  cleanupConnection(userId: string, response: any): void {
    this.removeUserConnection(userId);
    for (const [groupId] of this.groups.entries()) {
      this.removeUserFromGroup(groupId, response);
    }
  }
}


