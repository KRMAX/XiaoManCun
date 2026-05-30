# 小满村（XLG-GAME）

中国县域乡村题材的微信小游戏。玩家从城市回到外婆家的小满村，通过种田、钓鱼、采集、加工、县城赶集、NPC 社交、节日活动和村庄建设，让村子重新热闹起来。核心差异点：**返乡生活模拟 + 县城集市交易 + 熟人社会故事 + 微信异步社交**。

## 仓库结构

```
XLG-GAME/
├── design.md                      # 主设计稿（最权威）
├── docs/
│   ├── wechat-minigame-design.md  # 概念定位 / 背景 / 玩法 / 美术方向
│   ├── concept-art-gallery.md     # 概念图索引
│   ├── design-tables/             # 专项策划表 + 技术文档（见下）
│   └── animation-prototypes/      # 开场动画 HTML 原型（可直接打开）
├── assets/                        # 概念图 / 过场关键帧 / 视频素材
├── exports/                       # 导出素材包
├── client/                        # ★ Cocos Creator 3.8 客户端工程（横屏 16:9）
├── config/                        # ★ Luban 配表工程（数据驱动，双端共用）
├── server/                        # ★ NestJS 服务端工程（经济权威/社交/存档）
├── prototypes/                    # 可玩玩法原型（HTML，如 m1-first-day 春一日）
└── tmp/                           # 临时素材
```

> ★ 为研发工程目录，承接 `docs/design-tables/tech-stack-recommendation.md` 的技术选型。

## 关键文档

| 文档 | 内容 |
| --- | --- |
| `design.md` | 主设计稿：玩法系统、内容规模、核心循环、时间季节天气 |
| `docs/design-tables/` | 15+ 张策划表：作物、鱼、矿、NPC、地图、任务、经济、UI、留存等 |
| `docs/design-tables/tech-stack-recommendation.md` | 研发技术选型：引擎、配表、服务端、存储、部署 |
| `docs/design-tables/mvp-milestones-and-staffing.md` | MVP 研发里程碑（M0–M5，约 15 周）与人力估算 |
| `docs/design-tables/tech-data-qa.md` | 客户端/服务端边界、存档结构、埋点、反作弊、QA |

## 技术栈（摘要）

- **客户端**：Cocos Creator 3.8 LTS + TypeScript，横屏 16:9，2.5D 像素风。
- **配表**：Luban（Excel/JSON → 强类型 TS + 数据），全程数据驱动。
- **服务端**：Go 或 Node/NestJS + MySQL + Redis，经济服务端权威。
- **社交**：微信异步多人，摊位快照 + 成交校验 + 收益挂账。

详见 `docs/design-tables/tech-stack-recommendation.md`。

## 快速开始

### 客户端

用 Cocos Creator 3.8 打开 `client/` 目录（首次打开自动生成缓存）。详见 `client/README.md`。

### 配表

```bash
cd config
export LUBAN_DLL=/path/to/Luban/Luban.dll
./gen.sh        # 生成 TS 代码与 JSON 数据到 client/
```

详见 `config/README.md`。

### 服务端

```bash
cd server
cp .env.example .env
npm install
npm run start:dev   # http://localhost:8080/api
```

骨架的 Redis/存档为内存占位，无需外部依赖即可启动联调。详见 `server/README.md`。

## 研发路线

按 MVP 里程碑推进（M0 工程地基 → M1 单机闭环 → M2 经济服务端 → M3 县城集市 → M4 异步社交+节日 → M5 打磨灰度）。详见 `docs/design-tables/mvp-milestones-and-staffing.md`。
