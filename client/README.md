# 小满村客户端（Cocos Creator 3.8）

微信小游戏客户端工程骨架，落地 `docs/design-tables/tech-stack-recommendation.md` 的技术选型。

## 环境要求

- Cocos Creator 3.8.x（LTS）
- Node.js 18+
- 微信开发者工具（发布微信小游戏时使用）

## 打开方式

1. 用 Cocos Dashboard「打开」本 `client/` 目录（首次打开会自动生成 `library/`、`temp/`、`settings/` 等）。
2. 引擎识别后，在 `assets/scenes/` 新建启动场景 `main.scene`。
3. 在场景根节点挂上 `assets/scripts/game/GameApp.ts`，填好 `serverBaseUrl`。
4. 运行 -> 预览（浏览器）；发布 -> 构建发布 -> 微信小游戏。

### 横屏配置（重要）

本项目为**横屏 16:9**：

- 设计分辨率 **1280×720**，按高度适配（`GameApp.start` 已用 `view.setDesignResolutionSize(1280, 720, FIXED_HEIGHT)`，常量见 `assets/scripts/core/Constants.ts`）。
- 场景 `Canvas` 勾选 **Fit Height**；左右两端按全面屏（19.5:9）留安全区，避开横屏时位于左右一侧的刘海/灵动岛。
- 微信小游戏构建：在「构建发布」面板把 **Device Orientation 设为 Landscape**（写入 `game.json` 的 `"deviceOrientation": "landscape"`）。
- 浏览器预览：在 Project Settings 里把预览方向设为横屏。

> 注意：`library/ temp/ build/ settings 缓存` 等由编辑器生成，已在 `.gitignore` 忽略。`.meta` 文件由编辑器首次打开时生成。

## 目录结构

```
client/
├── package.json                  # Cocos 工程元信息（creator 版本）
├── tsconfig.json
├── assets/
│   ├── scenes/                   # 场景（启动/小院/村口/集市…）
│   ├── resources/
│   │   └── config/               # Luban 生成的 JSON 数据（运行时加载）
│   └── scripts/
│       ├── core/                 # 基础设施：Singleton、EventBus
│       ├── config/               # 配置加载
│       │   ├── ConfigManager.ts
│       │   └── generated/        # Luban 生成的 TS 代码
│       ├── data/                 # GameState 运行时存档树
│       ├── net/                  # 网络层（经济走服务端校验）
│       ├── systems/              # 玩法系统（农场/集市/时间…）
│       └── game/                 # GameApp 启动入口
```

## 架构约定

- **数据驱动**：所有数值/内容读 `config/` 配表，逻辑不硬编码。
- **经济服务端权威**：收益、库存、交易、订单、离线收益走 `NetClient` 请求服务端校验（见 `tech-data-qa.md` 边界表）。
- **存档结构**：`data/GameState.ts` 对齐 `tech-data-qa.md` 存档模块，带 `saveVersion` 便于迁移。
- **系统化**：每个玩法实现 `ISystem`，由 `GameApp` 注册并按生命周期驱动。

## 配置表接入

配表由 `../config/`（Luban）维护与生成，产物同步到：

- 代码：`assets/scripts/config/generated/`
- 数据：`assets/resources/config/`

执行 `../config/gen.sh`（或 `gen.bat`）生成。详见 `../config/README.md`。
