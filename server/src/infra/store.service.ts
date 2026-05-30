import { Injectable } from '@nestjs/common';

/**
 * 存档与持久化数据的占位实现（内存）。
 * 生产替换为 MySQL + TypeORM；强一致字段（货币/库存）用列，松散结构用 JSON 列。
 * 结构对齐 docs/design-tables/tech-data-qa.md「存档结构建议」。
 */
export interface PlayerSave {
  playerId: string;
  saveVersion: number;
  /** 完整存档 JSON（time/inventory/farm/economy/...），骨架阶段整体存放 */
  blob: Record<string, unknown>;
  updatedAt: number;
}

export interface MarketListing {
  listingId: string;
  sellerId: string;
  itemId: string;
  price: number;
  count: number;
  createdAt: number;
}

@Injectable()
export class StoreService {
  private saves = new Map<string, PlayerSave>();
  private listings = new Map<string, MarketListing>();

  getSave(playerId: string): PlayerSave | undefined {
    return this.saves.get(playerId);
  }

  upsertSave(save: PlayerSave): void {
    this.saves.set(save.playerId, save);
  }

  addListing(listing: MarketListing): void {
    this.listings.set(listing.listingId, listing);
  }

  getListing(listingId: string): MarketListing | undefined {
    return this.listings.get(listingId);
  }

  removeListing(listingId: string): void {
    this.listings.delete(listingId);
  }

  listBySeller(sellerId: string): MarketListing[] {
    return [...this.listings.values()].filter((l) => l.sellerId === sellerId);
  }
}
