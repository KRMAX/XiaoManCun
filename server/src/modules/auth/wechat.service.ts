import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WxSession {
  openid: string;
  sessionKey: string;
}

/**
 * 微信登录：code2session。
 * 骨架阶段返回基于 code 的伪 openid，便于本地联调。
 * 生产替换为请求 https://api.weixin.qq.com/sns/jscode2session
 *   ?appid=&secret=&js_code=&grant_type=authorization_code
 */
@Injectable()
export class WechatService {
  constructor(private readonly config: ConfigService) {}

  async code2session(code: string): Promise<WxSession> {
    const appid = this.config.get<string>('WX_APPID');
    if (appid && appid !== 'your_wx_appid') {
      // TODO: 接入真实 jscode2session 请求
    }
    return { openid: `dev_openid_${code}`, sessionKey: 'dev_session_key' };
  }
}
