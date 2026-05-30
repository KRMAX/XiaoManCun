import { Singleton } from '../core/Singleton';
import { EventBus, GameEvents } from '../core/EventBus';
import { GameState, FarmTile } from '../data/GameState';
import { ISystem } from './ISystem';

/**
 * 农场系统：开垦、播种、浇水、跨天成长、收获。
 * 作物数值来自配置表（crop 表），逻辑只处理规则，不硬编码数值。
 */
export class FarmSystem extends Singleton<FarmSystem> implements ISystem {
    public readonly name = 'FarmSystem';

    public init(): void {
        // 加载地块状态等
    }

    public plant(tileIndex: number, cropId: string): void {
        const tile = GameState.data.farm.tiles[tileIndex];
        if (!tile || tile.cropId) {
            return;
        }
        tile.cropId = cropId;
        tile.plantedDay = GameState.data.time.day;
        tile.growthStage = 0;
        tile.watered = false;
    }

    public water(tileIndex: number): void {
        const tile = GameState.data.farm.tiles[tileIndex];
        if (tile?.cropId) {
            tile.watered = true;
        }
    }

    /** 跨天成长：未浇水的作物不成长（具体规则按 crop 配表） */
    public onDayPassed(): void {
        for (const tile of GameState.data.farm.tiles) {
            if (tile.cropId && tile.watered) {
                tile.growthStage = (tile.growthStage ?? 0) + 1;
                tile.watered = false;
            }
        }
    }

    /** 收获：实际收益与品质由服务端校验后回写 */
    public harvest(tileIndex: number): void {
        const tile = GameState.data.farm.tiles[tileIndex];
        if (!tile?.cropId) {
            return;
        }
        const cropId = tile.cropId;
        Object.assign(tile, { cropId: undefined, plantedDay: undefined, growthStage: undefined } as FarmTile);
        EventBus.emit(GameEvents.FARM_HARVESTED, cropId, tileIndex);
    }
}
