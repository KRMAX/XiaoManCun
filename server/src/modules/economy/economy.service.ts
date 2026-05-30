import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StoreService } from '../../infra/store.service';

/**
 * 经济服务端权威逻辑（骨架）。
 * 关键原则（见 docs/design-tables/tech-data-qa.md）：
 *   - 服务端时间为准，防改本地时间刷收益。
 *   - 离线收益按时长封顶。
 *   - 收益/库存最终状态以服务端为准。
 */
@Injectable()
export class EconomyService {
  constructor(
    private readonly store: StoreService,
    private readonly config: ConfigService,
  ) {}

  /** 服务端权威时间戳（毫秒） */
  now(): number {
    return Date.now();
  }

  /**
   * 离线收益结算：根据上次离线时间与封顶小时数计算。
   * 这里只示范封顶逻辑，具体产出公式接入配表后实现。
   */
  settleOffline(playerId: string, lastOfflineAt: number): { offlineHours: number; cappedHours: number } {
    const maxHours = Number(this.config.get('OFFLINE_MAX_HOURS') ?? 12);
    const offlineMs = Math.max(0, this.now() - lastOfflineAt);
    const offlineHours = offlineMs / 3600000;
    const cappedHours = Math.min(offlineHours, maxHours);
    void this.store; // 接入后用于读取农场/加工状态
    return { offlineHours, cappedHours };
  }
}
