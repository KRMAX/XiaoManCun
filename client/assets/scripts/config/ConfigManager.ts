import { Singleton } from '../core/Singleton';

/**
 * 配置表管理器。
 *
 * 数据来源：config/ 目录下用 Luban 生成的 TypeScript 代码 + JSON 数据。
 * 生成产物约定输出到：
 *   - 代码：assets/scripts/config/generated/
 *   - 数据：assets/resources/config/   (运行时通过 resources.load 加载)
 *
 * 这里只保留加载入口，待 Luban 接入后用生成的 Tables 类替换 loadAll 内部实现。
 */
export class ConfigManager extends Singleton<ConfigManager> {
    private _loaded = false;

    public get loaded(): boolean {
        return this._loaded;
    }

    /**
     * 加载所有配置表。Luban 接入后示例：
     *   const tables = new cfg.Tables((file) => loadJson(`config/${file}`));
     *   this._tables = tables;
     */
    public async loadAll(loadJson: (file: string) => Promise<unknown>): Promise<void> {
        // TODO: 接入 Luban 生成的 Tables。此处为占位，保证骨架可编译。
        void loadJson;
        this._loaded = true;
    }
}
