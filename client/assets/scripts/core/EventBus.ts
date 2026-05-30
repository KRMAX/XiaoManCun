type Handler = (...args: unknown[]) => void;

/**
 * 全局事件总线，用于系统之间解耦通信。
 * 例如：农场收获 -> 触发任务检查、背包更新、埋点上报。
 */
class EventBusImpl {
    private _map = new Map<string, Set<Handler>>();

    public on(event: string, handler: Handler): void {
        let set = this._map.get(event);
        if (!set) {
            set = new Set();
            this._map.set(event, set);
        }
        set.add(handler);
    }

    public off(event: string, handler: Handler): void {
        this._map.get(event)?.delete(handler);
    }

    public emit(event: string, ...args: unknown[]): void {
        this._map.get(event)?.forEach((h) => h(...args));
    }
}

export const EventBus = new EventBusImpl();

export const GameEvents = {
    TIME_DAY_PASSED: 'time/day_passed',
    FARM_HARVESTED: 'farm/harvested',
    INVENTORY_CHANGED: 'inventory/changed',
    MARKET_SOLD: 'market/sold',
    QUEST_UPDATED: 'quest/updated',
} as const;
