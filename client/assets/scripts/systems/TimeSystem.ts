import { Singleton } from '../core/Singleton';
import { EventBus, GameEvents } from '../core/EventBus';
import { GameState } from '../data/GameState';
import { ISystem } from './ISystem';

/**
 * 时间系统。
 * 注意：跨天结算与离线收益以服务端为准（防改本地时间刷收益），
 * 客户端仅做当天内的时间推进与表现。
 */
export class TimeSystem extends Singleton<TimeSystem> implements ISystem {
    public readonly name = 'TimeSystem';

    public init(): void {
        // 订阅 / 初始化时间显示等
    }

    /** 玩家睡觉 -> 请求服务端结算 -> 应用新的一天 */
    public passDay(): void {
        const time = GameState.data.time;
        time.day += 1;
        EventBus.emit(GameEvents.TIME_DAY_PASSED, time.day);
    }
}
