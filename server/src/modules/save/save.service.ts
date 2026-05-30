import { ConflictException, Injectable } from '@nestjs/common';
import { StoreService, PlayerSave } from '../../infra/store.service';

/**
 * 存档读写。写操作做版本号校验，避免并发覆盖（乐观锁）。
 */
@Injectable()
export class SaveService {
  constructor(private readonly store: StoreService) {}

  load(playerId: string): PlayerSave {
    const existing = this.store.getSave(playerId);
    if (existing) return existing;
    // 新玩家初始化空存档
    const fresh: PlayerSave = {
      playerId,
      saveVersion: 1,
      blob: {
        time: { year: 1, season: 'spring', day: 1, minute: 360, weather: 'sunny' },
        economy: { cash: 0, favor: 0, reputation: 0, marketScore: 0 },
      },
      updatedAt: Date.now(),
    };
    this.store.upsertSave(fresh);
    return fresh;
  }

  save(playerId: string, baseVersion: number, blob: Record<string, unknown>): PlayerSave {
    const current = this.store.getSave(playerId);
    if (current && current.saveVersion !== baseVersion) {
      throw new ConflictException('存档版本冲突，请重新拉取');
    }
    const next: PlayerSave = {
      playerId,
      saveVersion: (current?.saveVersion ?? 0) + 1,
      blob,
      updatedAt: Date.now(),
    };
    this.store.upsertSave(next);
    return next;
  }
}
