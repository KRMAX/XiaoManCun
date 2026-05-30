import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../modules/auth/auth.service';

export interface AuthedRequest extends Request {
  playerId?: string;
}

/**
 * 简单鉴权：从 Authorization 头解析 token -> playerId，写入 request。
 * 经济/社交相关接口都应受此保护。
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = (req.headers['authorization'] ?? '').toString();
    const playerId = this.auth.verifyToken(token);
    if (!playerId) {
      throw new UnauthorizedException('未登录或登录失效');
    }
    req.playerId = playerId;
    return true;
  }
}
