/**
 * 运行时存档状态树。
 * 结构对齐 docs/design-tables/tech-data-qa.md 的「存档结构建议」。
 * 经济相关字段以服务端为准，本地仅做表现与预测。
 */

export interface PlayerProfile {
    playerId: string;
    nickname: string;
    avatar: string;
    createdAt: number;
    level: number;
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Weather = 'sunny' | 'cloudy' | 'rain' | 'storm' | 'snow';

export interface TimeState {
    year: number;
    season: Season;
    day: number;     // 当季第几天 (1..28)
    minute: number;  // 当天分钟
    weather: Weather;
}

export interface InventoryState {
    bag: Record<string, number>;       // itemId -> count
    warehouse: Record<string, number>;
    locked: Record<string, number>;    // 上架/订单锁定
}

export interface FarmTile {
    cropId?: string;
    plantedDay?: number;
    watered?: boolean;
    growthStage?: number;
    quality?: number;
}

export interface FarmState {
    tiles: FarmTile[];
    animals: Record<string, unknown>;
    buildings: Record<string, unknown>;
    decorations: Record<string, unknown>;
}

export interface EconomyState {
    cash: number;        // 现金
    favor: number;       // 人情值
    reputation: number;  // 村庄声望
    marketScore: number; // 集市积分
}

export interface GameStateData {
    player: PlayerProfile;
    time: TimeState;
    inventory: InventoryState;
    farm: FarmState;
    economy: EconomyState;
    npc: Record<string, unknown>;
    quest: Record<string, unknown>;
    market: Record<string, unknown>;
    social: Record<string, unknown>;
    collection: Record<string, unknown>;
    /** 存档版本，用于后续迁移（见技术风险：存档结构后期难改） */
    saveVersion: number;
}

export class GameState {
    private static _data: GameStateData | null = null;

    public static get data(): GameStateData {
        if (!GameState._data) {
            throw new Error('GameState 未初始化，请先 load()');
        }
        return GameState._data;
    }

    public static load(data: GameStateData): void {
        GameState._data = data;
    }

    public static isLoaded(): boolean {
        return GameState._data !== null;
    }
}
