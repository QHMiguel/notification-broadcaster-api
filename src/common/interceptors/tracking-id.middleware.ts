import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { tap } from 'rxjs/operators';
import { AsyncLocalStorage } from 'async_hooks';

@Injectable()
export class TrackingInterceptor implements NestInterceptor {
  constructor(private readonly trackingContext: AsyncLocalStorage<{trackingId: string}>) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const trackingId = request.headers['x-tracking-id'] || uuidv4();
    request.trackingId = trackingId;

    // Guardar en AsyncLocalStorage si lo usas
    return this.trackingContext.run({ trackingId }, () =>
      next.handle().pipe(
        tap(() => {
          response.setHeader('x-tracking-id', trackingId);
        }),
      ),
    );
  }
}
