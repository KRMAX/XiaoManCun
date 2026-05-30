import { Injectable } from '@nestjs/common';

/**
 * Redis 占位实现（内存）。生产替换为 ioredis。
 * 用途：排行榜(ZSet)、缓存、幂等键、限流、好友摊位快照。
 */
@Injectable()
export class RedisService {
  private kv = new Map<string, { value: string; expireAt?: number }>();
  private zsets = new Map<string, Map<string, number>>();

  async set(key: string, value: string, ttlSec?: number): Promise<void> {
    this.kv.set(key, { value, expireAt: ttlSec ? Date.now() + ttlSec * 1000 : undefined });
  }

  async get(key: string): Promise<string | null> {
    const item = this.kv.get(key);
    if (!item) return null;
    if (item.expireAt && item.expireAt < Date.now()) {
      this.kv.delete(key);
      return null;
    }
    return item.value;
  }

  /** SET NX：用于幂等。已存在返回 false */
  async setNx(key: string, value: string, ttlSec?: number): Promise<boolean> {
    if (await this.get(key)) return false;
    await this.set(key, value, ttlSec);
    return true;
  }

  async zadd(key: string, member: string, score: number): Promise<void> {
    let z = this.zsets.get(key);
    if (!z) {
      z = new Map();
      this.zsets.set(key, z);
    }
    z.set(member, score);
  }

  /** 取分数从高到低的前 n 名 */
  async zrevTop(key: string, n: number): Promise<Array<{ member: string; score: number }>> {
    const z = this.zsets.get(key);
    if (!z) return [];
    return [...z.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([member, score]) => ({ member, score }));
  }
}
