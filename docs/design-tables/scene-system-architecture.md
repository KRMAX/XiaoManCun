# 《小满村》场景与玩法系统架构（Cocos 工程实现指导）

## 文档定位

本文件是给研发的**系统架构与实现指导稿**，承接：

- `tech-stack-recommendation.md`（引擎/配表/服务端选型）
- `tech-data-qa.md`（客户端/服务端边界、存档、反作弊）
- `map-topology-and-unlocks.md` / `quest-chains.md` / `npc-relationships-and-bios.md` / `helpers-pets-and-breeding.md`（内容向配表）

目标：把**星露谷的玩法内核**（种田经营 + 日循环 + 系统自由度 + 长期留存）与**仙剑98 的叙事温度与场景探索表现**（场景制地图、踩点进屋、NPC 剧情、可交互物），落到一套**数据驱动、可在微信小游戏跑得动**的 Cocos 3.8 工程结构上。

> 一句话定位：**星露谷的内核 + 仙剑98 的外壳与温度 + 微信小游戏的轻量约束。**

---

## 0. 两款标杆借鉴清单（落地版）

| 取自 | 借鉴点 | 在本作的落点 |
| --- | --- | --- |
| 星露谷 | 日/季时钟、种田/养殖/采集经营循环、体力、自由目标 | `TimeSystem` + `FarmSystem` + 经营系统群（服务端权威） |
| 星露谷 | 四向行走 + 工具动作动画、深度排序 | `CharacterController` + 精灵帧动画 + y 排序 |
| 星露谷 | 动物/宠物有生命感、好感度 | `CreatureSystem`（环境生物）+ `AnimalSystem`（畜牧）+ `RelationSystem` |
| 仙剑98 | 场景制地图、走到出口/门切换 | `SceneManager` + `Portal` 触发器 |
| 仙剑98 | 进屋=独立室内场景，承载剧情与宝物 | 室内 `AreaScene`（与室外同一套控制器） |
| 仙剑98 | NPC 站桩/踱步 + 触发对白、可交互物（柜子/床/灶台） | `NpcController` + `Interactable` 统一交互系统 |
| 仙剑98 | 线性剧情演出、章节转场 | `QuestSystem` + `CutsceneSystem`（见 `cinematics-and-story-presentation.md`） |

---

## 1. 总设计原则

1. **数据驱动**：场景、出口、NPC、动物、任务、对话、交互物全部走 Luban 配表，加内容不改代码。
2. **场景制（scene-based），非大世界**：世界由若干**独立区域（Area）**组成，靠 `Portal` 衔接；任何时刻**内存里只活跃 1 个区域**，控制小游戏内存。
3. **客户端表现 / 服务端权威分离**：走位、动画、环境生物、对话演出是**纯客户端表现**；任何影响经济（产出、库存、金币、好感、任务进度）的结算必须**服务端校验**（见 `tech-data-qa.md`）。
4. **统一交互协议**：所有「能点的东西」（地块、NPC、床、柜子、门、动物）实现同一个 `IInteractable`，由一个 `InteractionSystem` 统一分发，降低耦合。
5. **事件总线解耦**：系统间用 `EventBus` 通信（已在 `client/assets/scripts/core/EventBus.ts`），避免系统互相直接引用。
6. **微信优先**：首包体积、内存峰值、DrawCall、分包加载是硬约束，设计时即纳入（见第 9 节）。

---

## 2. 整体架构分层

```
┌──────────────────────────────────────────────────────────┐
│  GameApp (bootstrap)  —— 已存在 client/.../game/GameApp.ts │
│   初始化分辨率/配表/网络/系统注册，加载初始 Area            │
├──────────────────────────────────────────────────────────┤
│  Manager 层（全局单例，跨场景常驻）                          │
│   SceneManager · TimeSystem · QuestSystem · InventorySystem │
│   RelationSystem · SaveSystem · AudioManager · UIManager    │
├──────────────────────────────────────────────────────────┤
│  Area 层（每个区域一份，切场时创建/销毁）                    │
│   AreaController（地图/可行走遮罩/出口/生成实体）            │
│   ├─ CharacterController（主角，跨场景保留状态、随场景重建） │
│   ├─ NpcController[]      InteractableController[]           │
│   ├─ CreatureSystem（鸡/鸭等环境生物）                      │
│   ├─ AnimalSystem（畜牧：可喂养/产出动物）                  │
│   └─ FarmSystem（仅农场类区域激活）                          │
├──────────────────────────────────────────────────────────┤
│  Core 层（已存在：Singleton/EventBus/Constants/ConfigManager│
│           /NetClient/GameState）                            │
└──────────────────────────────────────────────────────────┘
```

### 建议的脚本目录（扩充现有 `client/assets/scripts/`）

```
scripts/
  core/            Singleton EventBus Constants (已存在)
  config/          ConfigManager + generated/ (Luban 输出)
  data/            GameState (已存在) + 运行时数据模型
  net/             NetClient (已存在)
  scene/           SceneManager  AreaController  Portal  CameraFollow
  character/       CharacterController  CharacterAnim  PathMover  WalkableMask
  npc/             NpcController  NpcWander  DialogueRunner
  interact/        InteractionSystem  IInteractable  interactables/（Bed/Chest/Stove/Sign/Shop）
  creature/        CreatureSystem  AmbientCreature（鸡/鸭/猫狗游荡）
  systems/         TimeSystem FarmSystem MarketSystem (已存在) + AnimalSystem PetSystem QuestSystem InventorySystem RelationSystem
  cutscene/        CutsceneSystem  CutsceneAction
  ui/              UIManager  各 Panel
```

---

## 3. 场景 / 地图 / Portal 系统

### 3.1 概念

- **Area（区域）**：一张可游玩的地图，对应一个 Cocos `Prefab`（或场景）。例：`home_yard`(小院)、`home_indoor`(老屋内)、`village_road`(村路)、`village_market`(村口集市)、`backhill_field`(后山田野)。
- **Portal（传送点/门）**：Area 内的一个触发区，角色进入后切到目标 Area 的指定落点。仙剑「进屋/出屋/换图」全靠它。
- **SpawnPoint（落点）**：Area 内的命名出生点，Portal 指向它。

### 3.2 配表 schema（Luban）

`area.xml` / `area.json`：
```jsonc
{
  "id": "home_yard",
  "name": "小院",
  "prefab": "areas/home_yard",          // 资源路径（可属于某分包）
  "subpackage": "base",                  // 所属分包，控制首包体积
  "bgm": "bgm_village_day",
  "type": "farm",                        // farm | indoor | town | wild
  "walkable": "masks/home_yard.json",    // 可行走遮罩（多边形/格子）
  "spawns": [
    { "id": "default", "x": 360, "y": 600, "dir": "down" },
    { "id": "from_indoor", "x": 300, "y": 470, "dir": "down" }
  ],
  "portals": [
    { "id": "to_indoor", "rect": [280,430,60,40], "to": "home_indoor", "spawn": "door", "needFade": true,
      "lockedBy": null },
    { "id": "to_road",  "rect": [440,665,80,30], "to": "village_road", "spawn": "from_yard",
      "lockedBy": "quest_first_harvest" } // 出村门需先完成首收任务（解锁条件见 map-topology）
  ]
}
```

> `lockedBy` 引用 `quest-chains.md` / `map-topology-and-unlocks.md` 的解锁条件，实现仙剑式「剧情没到，路先封着」。

### 3.3 切场流程（`SceneManager.changeArea`）

```
触发 Portal
  → 校验 lockedBy（未解锁则提示，不切）
  → UIManager 播放淡出（0.3~0.5s）
  → 卸载当前 Area Prefab + 释放其 AssetBundle（releaseAsset）
  → （目标在未加载分包）wx.loadSubpackage 异步加载，带进度
  → 实例化目标 Area Prefab，读 walkable/portals/spawns 配表
  → 主角移到目标 spawn 落点，设朝向，CameraFollow 立即对位
  → 重建该 Area 的 NPC/动物/交互物/农场状态（从存档恢复）
  → 播放淡入 + 切 BGM
  → EventBus.emit('area-entered', areaId)
```

要点：
- **单活跃区域**：切场即销毁旧区域节点并 `assetManager` 释放，杜绝内存累加。
- **主角常驻**：`CharacterController` 的逻辑数据（位置/朝向/状态）由 `SceneManager` 持有，节点随场景重建，避免跨场景丢状态。
- **农场状态不随场景销毁**：地块数据存在 `FarmSystem`（最终服务端权威），区域重建时按数据重绘，离开农场区域后作物仍在后台按时间成长（靠 `TimeSystem` 结算，而非节点存在）。

### 3.4 相机

`CameraFollow`：横屏宽画幅，相机水平跟随主角、纵向轻跟随，限制在地图边界内（`clamp`）。室内小场景可固定不卷动。

---

## 4. 角色控制（星露谷式手感）

### 4.1 组件拆分

- `CharacterController`：输入 → 目标点（点地走位 / 摇杆）→ 调 `PathMover` 移动；维护 `dir`（up/down/left/right）与 `state`（idle/walk/act）。
- `WalkableMask`：判断目标点/路径是否可走（多边形内判定或格子），不可走则裁剪到边界。
- `PathMover`：朝目标插值移动，支持简单避障（沿障碍滑动）。需要更强可上 A* 网格寻路。
- `CharacterAnim`：根据 `dir + state` 播放精灵帧动画（行走 4~6 帧 / 待机 / 锄地 / 浇水 / 施肥 / 收获）。

### 4.2 美术（正式版替换原型的程序化小人）

- 一张**角色精灵图集（sprite sheet）**：4 方向 × 各动作。Cocos 用 `Animation` 组件按方向切 clip。
- 工具动作（锄/壶/篮）做成**对应方向各 3~4 帧**，触发交互时播放，播完回 idle。
- 深度排序：角色与场景物件统一按 `y`（脚底）排 `siblingIndex`，实现仙剑/星露谷的「走到物体后被遮挡」。

> 原型 `prototypes/m1-first-day/game.js` 已实现「四向朝向 + 行走循环 + 待机呼吸/眨眼」的**逻辑骨架**，正式版保留这套朝向/状态判断，只把「程序化画方块」替换为「切精灵帧」。

---

## 5. 交互系统（统一协议，仙剑「点啥都有反应」）

### 5.1 接口

```ts
interface IInteractable {
  id: string;
  getInteractPoint(): Vec2;      // 角色需站到的位置
  canInteract(ctx: GameCtx): boolean;
  getPrompt(): string;           // 头顶提示文案/图标
  interact(ctx: GameCtx): void;  // 触发
}
```

`InteractionSystem`：每帧找出**离主角最近且在交互半径内**的 `IInteractable`，显示提示气泡；玩家点击/确认时调用其 `interact()`。统一处理「太远先走过去」。

### 5.2 内置交互物类型（配表 `interactable.json`）

| 类型 | 行为 | 对应系统 |
| --- | --- | --- |
| `plot` 地块 | 清/耕/种/施肥/浇水/收 | `FarmSystem` |
| `bed` 床 | 睡觉跨天（确认弹窗）| `TimeSystem` |
| `chest` 柜子/仓库 | 开仓库 UI（存取） | `InventorySystem` |
| `stove` 灶台 | 烹饪/加工（后期） | 加工系统 |
| `shop` 摊位/供销社 | 打开商店 UI | `MarketSystem` |
| `sign/object` 牌子/物件 | 弹对白（风味文本） | `DialogueRunner` |
| `npc` NPC | 对话/送礼/接任务 | `DialogueRunner`/`QuestSystem`/`RelationSystem` |
| `animal` 畜养动物 | 抚摸/喂食/收获产物 | `AnimalSystem` |
| `portal` 门/出口 | 切场景 | `SceneManager` |

> 「床睡觉」「柜子翻东西」「灶台」这些正是仙剑屋内交互的味道，用同一套协议即可。

---

## 6. NPC 系统

### 6.1 配表（接 `npc-relationships-and-bios.md`）

`npc.json`（已有雏形，扩展）：
```jsonc
{
  "id": "grandma", "name": "外婆", "portrait": "npc/grandma",
  "homeArea": "home_indoor",
  "schedule": [                       // 仙剑式站桩 + 星露谷式作息（可选）
    { "from": "06:00", "area": "home_yard", "x": 320, "y": 470, "anim": "idle" },
    { "from": "12:00", "area": "home_indoor", "x": 200, "y": 360, "anim": "cook" }
  ],
  "wander": { "enable": true, "bounds": [280,440,120,60], "speed": 30 },
  "dialogues": "dialogues/grandma",  // 引用对白配表
  "giftable": true
}
```

### 6.2 行为

- `NpcController`：按 `schedule` 在不同时段出现在不同 Area/坐标；无日程则站桩。
- `NpcWander`：在 `bounds` 内随机踱步（与第 7 节环境生物共用「闲逛 AI」）。
- 交互：触发 `DialogueRunner` 播对白；可送礼（`RelationSystem` 加好感）、接/交任务（`QuestSystem`）。

### 6.3 对话 / 剧情演出

- `DialogueRunner`：读对白配表，逐句打字机、立绘、分支选项；条件对白（按好感/任务/季节切换台词，见 `season-one-dialogue-sample.md`）。
- `CutsceneSystem`（接 `cinematics-and-story-presentation.md`）：剧情演出脚本化——`[移动 NPC → 镜头推近 → 对白 → 黑屏转场 → 发奖]`，用于开场/章节/节日，复刻仙剑的线性叙事温度。

---

## 7. 环境生物 / 宠物 / 动物（三套，别混）

明确区分三类，避免设计混乱：

| 系统 | 对象 | 性质 | 是否进存档 | 是否服务端 |
| --- | --- | --- | --- | --- |
| `CreatureSystem`（环境生物） | 散养鸡、池塘鸭、村里猫狗 | 纯氛围装饰 | 否 | 否（客户端本地随机） |
| `PetSystem`（宠物） | 跟随主角的猫/狗 | 陪伴+轻 buff | 是（拥有/好感） | 好感/buff 服务端 |
| `AnimalSystem`（畜牧） | 鸡舍蛋鸡、鸭、牛羊等 | 经营产出 | 是 | **是（产出权威）** |

### 7.1 环境生物「闲逛 AI」（鸡/鸭，接前文讨论）

`AmbientCreature` 组件，状态机：
```
Idle(随机停 1~3s，播随机 idle 动作：啄食/张望/理毛)
  → 区域内随机采样目标点
  → Move(走/游过去) → Idle
偶发：玩家靠近 → 受惊短暂加速逃开
```
- 区域约束：鸡舍矩形 / 池塘多边形；目标点在区域内随机。
- 鸭子额外：游动慢、有惯性，身后跟**水波纹**（粒子/半透明 sprite，停下渐隐），偶发「扎猛子」动作。
- 表现细节见原型可加版（鸡踱步啄食、鸭游动）。

### 7.2 宠物 `PetSystem`

- 跟随主角（保持距离的 follow），偶尔自己 wander；点击抚摸加好感。
- 好感解锁轻 buff（如找物/掉落加成），buff 生效由服务端校验。

### 7.3 畜牧 `AnimalSystem`（接 `helpers-pets-and-breeding.md`）

- 动物有「饥饿/亲密/产出冷却」状态；每日喂食 → 次日产蛋/奶（产出由服务端按时间结算，防刷）。
- 在动物所在 Area 用 `AmbientCreature` 表现走动 + `IInteractable` 提供喂食/收获。
- 繁育、地方品种、动物评比按配表扩展。

### 7.3 性能（微信关键）

- 环境生物数量上限（鸡 3~5 / 鸭 4~6 / 一屏总活物 < ~15）。
- 全部打进**共享图集**，控 DrawCall。
- **错峰决策**：每只各自 0.2~0.5s tick 一次 AI，移动用插值，不每帧跑逻辑。
- 切到其他 Area 即销毁/暂停其 update。

---

## 8. 任务系统（星露谷自由 + 仙剑主线）

### 8.1 配表（接 `quest-chains.md`）

`quest.json`：
```jsonc
{
  "id": "quest_first_harvest", "type": "main",     // main | side | daily | festival
  "title": "回乡第一篮菜",
  "preconditions": ["quest_intro_done"],
  "objectives": [
    { "type": "harvest", "target": "crop_bokchoy", "count": 6 }
  ],
  "rewards": { "cash": 50, "items": [{"id":"seed_radish","n":3}], "unlock": ["village_road"] },
  "onComplete": "cutscene_open_gate"               // 触发剧情演出
}
```

### 8.2 运行

- `QuestSystem`：监听 `EventBus` 事件（`crop-harvested`、`item-acquired`、`npc-talked`、`area-entered`…）推进 objective 进度。
- 进度与领奖**服务端校验**（防伪造）；客户端只做展示与本地预判。
- 完成可触发 `unlock`（开 Portal/新区域，接 `map-topology`）或 `CutsceneSystem` 演出。
- 三类目标并行：**主线**（线性、给情感与解锁，仙剑味）+ **支线/日常/节日**（星露谷式自由目标与长期留存）。

---

## 9. 微信小游戏适配与性能预算

### 9.1 包体 / 分包

- **首包**：仅装载 `home_yard` + `home_indoor` + 核心系统 + 引导（目标首包尽量小，越快进游戏越好）。
- **分包（subpackage）**：`village_road`、`village_market`、`backhill_*` 等按需 `wx.loadSubpackage`，进 Portal 时带进度加载。
- 远程资源：活动/节日素材走远程 AssetBundle，避免撑大包体。

### 9.2 内存

- **单活跃 Area**：切场销毁旧场景节点 + 释放其 Bundle。
- 图集复用、纹理 Point 过滤（像素风）、及时 `releaseAsset`。
- 音频按区域加载/释放。

### 9.3 渲染

- 静态背景（场景底图 + 远景）尽量合批；动态层（角色/NPC/动物/作物）共享图集。
- 深度排序只对动态对象做（静态预排）。
- 控制同屏粒子与活物数量。

### 9.4 输入

- 横屏：点地走位为主，**可选虚拟摇杆**（更接近星露谷手感，移动端单手友好）。
- 交互统一走 `InteractionSystem`，避免每个对象各自监听 touch。

---

## 10. 客户端 / 服务端边界（接 `tech-data-qa.md`）

| 纯客户端表现 | 服务端权威 |
| --- | --- |
| 走位、动画、相机、环境生物、水波纹 | 时间基准（防改表本地时钟） |
| 对话演出、转场、UI | 农场产出 / 收获结算 |
| 交互提示、寻路 | 金币、背包、仓库变更 |
| 受惊逃跑等 AI | 动物产出、繁育 |
| 本地预判（即时反馈） | 任务进度与领奖、好感、商店交易、离线收益 |

原则：**一切影响经济/进度的写操作，客户端只发"意图"，服务端校验后回写**；客户端可乐观预判以保证手感，但以服务端为准。

---

## 11. 落地路线图（与 `mvp-milestones-and-staffing.md` 对齐）

| 阶段 | 场景/系统目标 |
| --- | --- |
| **M1 首日可玩**（原型已验证） | 单 Area（小院）+ 角色四向移动 + 地块交互（清/耕/种/肥/水）+ 成熟倒计时 + 睡觉跨天 + 收获 |
| **M2 内外景 + Portal** | 加 `home_indoor` 室内场景 + 门 Portal 切场（淡入淡出）+ 床睡觉/柜子仓库；落地「仙剑式进屋」 |
| **M3 村庄 + NPC + 任务** | 加 `village_road`/`village_market` 分包 + 外婆/村民 NPC + 对话 + 主线首链 + 供销社商店 |
| **M4 生物 + 畜牧 + 宠物** | `CreatureSystem`（鸡鸭氛围）+ `AnimalSystem`（蛋鸡产出，服务端）+ `PetSystem`（跟随宠物） |
| **M5 演出 + 节日 + 打磨** | `CutsceneSystem` 开场/章节演出 + 首个节日 + 性能/包体优化 + 上线合规 |

---

## 12. 给原型的下一步（可选验证）

在 `prototypes/m1-first-day/` 基础上，按本架构低成本验证后续手感：

1. **进老屋内景**：院里走到老屋门口 → 淡出 → 切到室内简易场景（灶台/床/柜子）→ 床睡觉跨天、柜子弹对白 → 门口出来淡回小院。验证 Portal/内外景。
2. **鸡舍/池塘环境生物**：几只随机踱步啄食的鸡 + 游动偶尔扎猛子的鸭。验证 `AmbientCreature`。
3. **村口集市**：再切一张场景放供销社摊位，验证多区域 + 商店交互。

> 这些原型逻辑（朝向/状态机/交互判定/区域约束）正式化时可直接映射到上文对应系统。
