import { _decorator, Component, view, ResolutionPolicy } from 'cc';
import { DESIGN_WIDTH, DESIGN_HEIGHT } from '../core/Constants';
import { ConfigManager } from '../config/ConfigManager';
import { NetClient } from '../net/NetClient';
import { GameState } from '../data/GameState';
import { TimeSystem } from '../systems/TimeSystem';
import { FarmSystem } from '../systems/FarmSystem';
import { MarketSystem } from '../systems/MarketSystem';
import { ISystem } from '../systems/ISystem';
import { EventBus, GameEvents } from '../core/EventBus';

const { ccclass, property } = _decorator;

/**
 * 游戏启动入口。挂在启动场景的根节点上。
 * 流程：初始化网络 -> 微信登录 -> 拉存档 -> 加载配置表 -> 注册并初始化系统 -> 进入游戏。
 */
@ccclass('GameApp')
export class GameApp extends Component {
    @property
    public serverBaseUrl = 'http://localhost:8080';

    private _systems: ISystem[] = [];

    public async start(): Promise<void> {
        // 横屏设计分辨率：1280x720，按高度适配，左右留安全区
        view.setDesignResolutionSize(DESIGN_WIDTH, DESIGN_HEIGHT, ResolutionPolicy.FIXED_HEIGHT);

        NetClient.getInstance().init(this.serverBaseUrl);

        await this.login();
        await this.loadSave();
        await ConfigManager.getInstance().loadAll(async (file) => {
            // TODO: 用 resources.load 加载 assets/resources/config/<file>
            void file;
            return {};
        });

        this.registerSystems();
        await this.initSystems();

        EventBus.on(GameEvents.TIME_DAY_PASSED, (day) => {
            this._systems.forEach((s) => s.onDayPassed?.(day as number));
        });
    }

    private async login(): Promise<void> {
        // TODO: wx.login -> code -> 服务端 code2session -> token
        NetClient.getInstance().setToken('dev-token');
    }

    private async loadSave(): Promise<void> {
        // TODO: 从服务端拉取存档；此处用空存档占位。
        GameState.load({
            player: { playerId: 'dev', nickname: '玩家', avatar: '', createdAt: Date.now(), level: 1 },
            time: { year: 1, season: 'spring', day: 1, minute: 360, weather: 'sunny' },
            inventory: { bag: {}, warehouse: {}, locked: {} },
            farm: { tiles: [], animals: {}, buildings: {}, decorations: {} },
            economy: { cash: 0, favor: 0, reputation: 0, marketScore: 0 },
            npc: {}, quest: {}, market: {}, social: {}, collection: {},
            saveVersion: 1,
        });
    }

    private registerSystems(): void {
        this._systems = [
            TimeSystem.getInstance(),
            FarmSystem.getInstance(),
            MarketSystem.getInstance(),
        ];
    }

    private async initSystems(): Promise<void> {
        for (const s of this._systems) {
            await s.init();
        }
    }
}
