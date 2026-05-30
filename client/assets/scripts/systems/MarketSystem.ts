import { Singleton } from '../core/Singleton';
import { NetClient } from '../net/NetClient';
import { ISystem } from './ISystem';

/**
 * 县城集市系统（项目核心特色）。
 * 上架/定价/装饰在客户端；成交、价格倍率、收益、排行榜在服务端。
 * 好友异步交易：访问好友摊位快照 -> 购买 -> 服务端校验库存与价格 -> 收益挂账。
 */
export class MarketSystem extends Singleton<MarketSystem> implements ISystem {
    public readonly name = 'MarketSystem';

    public init(): void {
        // 拉取当前集市状态
    }

    /** 上架商品（锁库存，由服务端确认） */
    public async listGoods(itemId: string, price: number, count: number): Promise<boolean> {
        const res = await NetClient.getInstance().post<{ ok: boolean }>('/market/list', {
            itemId,
            price,
            count,
        });
        return res.code === 0 && !!res.data?.ok;
    }

    /** 购买好友摊位商品（成交由服务端校验，收益挂账给卖方） */
    public async buyFromFriend(friendId: string, listingId: string): Promise<boolean> {
        const res = await NetClient.getInstance().post<{ ok: boolean }>('/market/buy_friend', {
            friendId,
            listingId,
        });
        return res.code === 0 && !!res.data?.ok;
    }
}
