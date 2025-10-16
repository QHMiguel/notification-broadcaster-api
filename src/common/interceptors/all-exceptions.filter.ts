import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
  } from '@nestjs/common';
  import { ServerResponse } from 'http';
  
// intercepta todas las excepciones(errores) para darles un formato de respuesta estandar
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<ServerResponse>();
    const trackingId = (request as any)?.trackingId || 'no-track';

    //imprime log de error
    this.logger.error(
      `[${trackingId}] Exception capturada: ${
        (() => {
          try {
            if (exception instanceof Error) {
              return `${exception.name}: ${exception.message}\n${exception.stack}`;
            }
            if (exception instanceof HttpException) {
              return JSON.stringify(exception.getResponse());
            }
            return JSON.stringify(exception, Object.getOwnPropertyNames(exception));
          } catch {
            return String(exception);
          }
        })()
      }`
    );

    // Si la respuesta ya tiene headers SSE, no intentar modificarla
    const contentType = response.getHeader?.('content-type');
    if (contentType && contentType.toString().includes('text/event-stream')) {
      this.logger.warn(`[${trackingId}] Error en conexión SSE, no se puede enviar respuesta de error`);
      // Solo logueamos, no modificamos la respuesta SSE
      return;
    }

    // Si los headers ya se enviaron, no podemos hacer nada más
    if (response.headersSent) {
      this.logger.warn(`[${trackingId}] Headers ya enviados, no se puede enviar respuesta de error`);
      return;
    }

    try {
      response.setHeader('x-tracking-id', trackingId);
    } catch {}

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: any = null;

    if (exception instanceof HttpException) {
      // Caso: errores lanzados con HttpException (BadRequest, NotFound, etc.)
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else {
        const res = exceptionResponse as Record<string, any>;
        message = res.message || message;
        errors = res.errors || null;
      }
    } else if (exception instanceof Error) {
      // Caso: throw new Error('mensaje de error')
      message = exception.message;
    } else if (typeof exception === 'string') {
      // Caso: throw 'mensaje simple'
      message = exception;
    }

    const errorResponse = {
      status: false,
      timestamp: new Date().toISOString(),
      statusCode: status,
      message,
      error: message,
      errors,
    };

    response.statusCode = status;
    try {
      if (!response.getHeader('content-type')) {
        response.setHeader('content-type', 'application/json; charset=utf-8');
      }
      response.end(JSON.stringify(errorResponse));
    } catch (error) {
      this.logger.error(`[${trackingId}] Error al enviar respuesta de error:`, error);
      // Intentar enviar algo básico
      try {
        response.end();
      } catch {}
    }
  }
}
  