import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

/**
 * 全局异常 -> 统一 { code, msg, data } 错误响应。
 * 业务错误用非 0 的 code；HTTP 异常透传其 status 作为 code。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let msg = '服务器内部错误';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      msg = typeof r === 'string' ? r : ((r as { message?: string }).message ?? exception.message);
    } else if (exception instanceof Error) {
      msg = exception.message;
    }

    res.status(HttpStatus.OK).json({ code: status, msg, data: null });
  }
}
