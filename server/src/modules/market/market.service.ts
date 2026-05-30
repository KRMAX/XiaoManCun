import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from '../../infra/redis.service';
import { StoreService, MarketListing } from '../../infra/store.service';

const LEADERBOARD_KEY = 'market:leaderboard:weekly';

/**
 * 县城集市 + 异步社交（项目核心特色）。
 * 上架/定价在客户端发起，成交、价格、收益、排行榜在服务端。
 * 好友异步交易：卖方上架生成快照 -> 买方购买 -> 服务端校验库存与价格 -> 收益挂账给卖方。
 */
@Injectable()
export class MarketService {
  constructor(
    private readonly store: StoreService,
    private readonly redis: RedisService,
  ) {}

  /** 上架商品（锁库存由 EconomyService 负责，此处只登记摊位快照） */
  async list(sellerId: string, itemId: string, price: number, count: number): Promise<{ listingId: string }> {
    if (price <= 0 || count <= 0) {
      throw new BadRequestException('价格和数量必须大于 0');
    }
    const listing: MarketListing = {
      listingId: randomUUID(),
      sellerId,
      itemId,
      price,
      count,
      createdAt: Date.now(),
    };
    this.store.addListing(listing);
    // 摊位快照缓存，便于好友访问（带 TTL）
    await this.redis.set(`stall:${sellerId}`, JSON.stringify(this.store.listBySeller(sellerId)), 3600);
    return { listingId: listing.listingId };
  }

  /**
   * 购买好友摊位商品：服务端校验快照 -> 扣库存 -> 收益挂账给卖方。
   * 防互刷：次数/价格/关系异常检测（接入后补）。
   */
  async buyFromFriend(buyerId: string, listingId: string): Promise<{ ok: boolean; paid: number }> {
    const listing = this.store.getListing(listingId);
    if (!listing) {
      throw new NotFoundException('商品不存在或已下架');
    }
    if (listing.sellerId === buyerId) {
      throw new BadRequestException('不能购买自己的摊位商品');
    }
    if (listing.count <= 0) {
      throw new BadRequestException('库存不足');
    }

    listing.count -= 1;
    if (listing.count === 0) {
      this.store.removeListing(listingId);
    }

    // TODO: 买方扣现金、卖方收益挂账（卖方下次上线领取）、双方埋点
    const paid = listing.price;

    // 卖方周榜累计销售额
    await this.redis.zadd(LEADERBOARD_KEY, listing.sellerId, paid);

    return { ok: true, paid };
  }

  /** 集市周榜前 N 名 */
  async leaderboard(topN = 50): Promise<Array<{ member: string; score: number }>> {
    return this.redis.zrevTop(LEADERBOARD_KEY, topN);
  }
}
