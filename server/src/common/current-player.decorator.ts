import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthedRequest } from './auth.guard';

/** 注入当前登录玩家 ID（由 AuthGuard 写入） */
export const CurrentPlayer = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<AuthedRequest>();
  return req.playerId ?? '';
});
