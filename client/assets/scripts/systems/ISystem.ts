/**
 * 游戏系统统一接口。每个玩法系统（农场/钓鱼/挖矿/集市/任务/社交）实现该接口，
 * 由 GameApp 在启动时注册并按生命周期驱动。
 */
export interface ISystem {
    readonly name: string;
    init(): void | Promise<void>;
    /** 每日跨天结算时调用 */
    onDayPassed?(day: number): void;
}
