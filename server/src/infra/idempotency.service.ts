import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * 幂等服务：用于广告发奖、内购到账、交易提交等防重复。
 * 客户端写操作携带 idempotencyKey，服务端首次执行后标记，重复请求直接拒绝。
 */
@Injectable()
export class IdempotencyService {
  constructor(private readonly redis: RedisService) {}

  /** 返回 true 表示首次执行（可继续）；false 表示重复请求（应拒绝/返回上次结果） */
  async tryAcquire(key: string, ttlSec = 3600): Promise<boolean> {
    return this.redis.setNx(`idem:${key}`, '1', ttlSec);
  }
}
