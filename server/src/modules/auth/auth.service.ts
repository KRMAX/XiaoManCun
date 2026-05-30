import { Injectable } from '@nestjs/common';
import { WechatService } from './wechat.service';

/**
 * 登录与会话。骨架阶段用 base64 token 承载 playerId；
 * 生产替换为签名 JWT（@nestjs/jwt），并校验过期与签名。
 */
@Injectable()
export class AuthService {
  constructor(private readonly wechat: WechatService) {}

  async loginByCode(code: string): Promise<{ token: string; playerId: string }> {
    const session = await this.wechat.code2session(code);
    const playerId = `p_${session.openid}`;
    const token = Buffer.from(playerId).toString('base64');
    return { token, playerId };
  }

  /** 校验 token 返回 playerId，失败返回空串 */
  verifyToken(token: string): string {
    try {
      const raw = token.replace(/^Bearer\s+/i, '').trim();
      if (!raw) return '';
      const playerId = Buffer.from(raw, 'base64').toString('utf8');
      return playerId.startsWith('p_') ? playerId : '';
    } catch {
      return '';
    }
  }
}
