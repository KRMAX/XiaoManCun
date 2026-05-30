# 小满村配表（Luban）

数据驱动配置表工程，落地 `docs/design-tables/tech-stack-recommendation.md` 的配表工具链选型。
策划维护数据（JSON / Excel），用 [Luban](https://github.com/focus-creative-games/luban) 生成强类型 TS 代码 + 运行时数据，供客户端与服务端共用。

## 目录结构

```
config/
├── luban.conf            # Luban 全局配置：分组、schema、导出目标
├── Defines/              # schema 定义（XML）
│   ├── enums.xml         # 枚举：Season、ItemType
│   ├── crop.xml          # 作物表结构
│   ├── item.xml          # 物品表结构
│   └── npc.xml           # NPC 表结构
├── Datas/                # 配置数据（JSON，可改为 Excel/CSV）
│   ├── crop.json
│   ├── item.json
│   └── npc.json
├── gen.sh / gen.bat      # 生成脚本
└── README.md
```

## 准备 Luban

1. 安装 .NET 8 运行时。
2. 从 [Luban Release](https://github.com/focus-creative-games/luban/releases) 下载，得到 `Luban.dll`。
3. 设置环境变量指向它：

```bash
export LUBAN_DLL=/path/to/Luban/Luban.dll
```

## 生成配置

```bash
# macOS / Linux
./gen.sh

# Windows
gen.bat
```

产物输出：

- TS 代码 → `../client/assets/scripts/config/generated/`
- JSON 数据 → `../client/assets/resources/config/`

客户端通过 `ConfigManager` 加载（见 `client/assets/scripts/config/ConfigManager.ts`）。

## 约定

- **ID 命名**与 `design.md` 内容生产规范一致（`crop_xxx` / `item_xxx` / `npc_xxx`）。
- 当前为 MVP 子集，数据对齐 `docs/design-tables/` 各表（如 `crop-values.md`）。
- 新增一类配置：在 `Defines/` 加 `bean` + `table`，在 `Datas/` 加同名数据文件。
- 配表变更走 Code Review，生成产物校验纳入 CI（见技术选型「工程化」）。
- 数据格式可从 JSON 迁移到 Excel（策划更友好），只需改 `table` 的 `input` 指向 `.xlsx`。

## 已配置表（MVP）

| 表 | 文件 | 来源设计表 |
| --- | --- | --- |
| 作物 TbCrop | `Datas/crop.json` | `crop-values.md` |
| 物品 TbItem | `Datas/item.json` | `inventory-storage-logistics.md` |
| NPC TbNpc | `Datas/npc.json` | `npc-relationships-and-bios.md` |

> 后续按里程碑补：鱼类、矿物、配方、任务、对话、地图、集市活动、运营活动等（见 `tech-data-qa.md` 配置表清单）。
