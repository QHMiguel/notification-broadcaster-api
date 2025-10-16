import { ConsoleLogger, Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

@Injectable()
export class TrackingLogger extends ConsoleLogger {
  constructor(private readonly requestContext: AsyncLocalStorage<{trackingId: string}>) {
    super();
  }

  private getTrackingId(): string {
    return this.requestContext.getStore()?.trackingId ?? 'no-track';
  }

  log(message: string) {
    super.log(`[${this.getTrackingId()}] ${message}`);
  }

  error(message: string, stack?: string) {
    super.error(`[${this.getTrackingId()}] ${message}`, stack);
  }

  warn(message: string) {
    super.warn(`[${this.getTrackingId()}] ${message}`);
  }
}
