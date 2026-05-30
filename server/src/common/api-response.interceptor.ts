import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

/**
 * 把控制器返回值统一包装为 { code, msg, data }，
 * 与客户端 client/assets/scripts/net/NetClient.ts 的 ApiResponse 对齐。
 */
@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    return next.handle().pipe(map((data) => ({ code: 0, msg: 'ok', data })));
  }
}
