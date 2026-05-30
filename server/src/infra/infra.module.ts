import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { StoreService } from './store.service';
import { IdempotencyService } from './idempotency.service';

/**
 * 基础设施层（全局可注入）。
 * 当前为内存占位实现，便于无外部依赖即可跑通骨架。
 * 接入真实组件时只替换实现，保持接口不变：
 *   - RedisService  -> ioredis
 *   - StoreService  -> MySQL + TypeORM（玩家强一致存档）
 */
@Global()
@Module({
  providers: [RedisService, StoreService, IdempotencyService],
  exports: [RedisService, StoreService, IdempotencyService],
})
export class InfraModule {}
