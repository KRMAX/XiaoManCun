# 小满村服务端（NestJS + TypeScript）

微信小游戏服务端骨架，落地 `docs/design-tables/tech-stack-recommendation.md` 的「快速期」路线，对齐 `tech-data-qa.md` 的客户端/服务端边界与反作弊要求。后续经济热点可按需用 Go 重写。

## 环境要求

- Node.js 18+
- （生产）MySQL 8 + Redis 6+

> 当前骨架的 Redis 与存档为**内存占位实现**，无需外部依赖即可启动，便于本地联调。接入真实组件时只替换 `src/infra/` 下的实现，接口不变。

## 启动

```bash
cp .env.example .env      # 按需修改
npm install
npm run start:dev         # 开发热重载
# 或
npm run build && npm run start:prod
```

默认监听 `http://localhost:8080/api`（端口见 `.env` 的 `PORT`）。

## 目录结构

```
server/
├── src/
│   ├── main.ts                     # 入口：全局前缀 /api、校验、统一响应、异常过滤
│   ├── app.module.ts
│   ├── common/                     # 响应包装、异常过滤、鉴权 Guard、当前玩家装饰器
│   ├── infra/                      # 基础设施（可替换实现）
│   │   ├── redis.service.ts        # Redis 占位（排行榜/缓存/幂等/快照）-> ioredis
│   │   ├── store.service.ts        # 存档/挂单占位 -> MySQL + TypeORM
│   │   └── idempotency.service.ts  # 幂等（广告/内购/交易防重复）
│   └── modules/
│       ├── auth/                   # 微信 code2session 登录、token
│       ├── save/                   # 存档读写（版本号乐观锁）
│       ├── economy/                # 服务端权威：时间、离线收益封顶
│       └── market/                 # 县城集市 + 异步社交 + 排行榜
```

## 接口（骨架）

| 方法 | 路径 | 说明 | 鉴权 |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | 微信 code 换 token | 否 |
| GET | `/api/save` | 拉取存档（新玩家自动初始化） | 是 |
| POST | `/api/save` | 写存档（带 baseVersion 乐观锁） | 是 |
| GET | `/api/economy/time` | 服务端权威时间 | 是 |
| POST | `/api/economy/offline` | 离线收益结算（封顶） | 是 |
| POST | `/api/market/list` | 摊位上架 | 是 |
| POST | `/api/market/buy_friend` | 购买好友摊位商品（收益挂账） | 是 |
| GET | `/api/market/leaderboard` | 集市周榜 | 是 |

所有响应统一为 `{ code, msg, data }`，与客户端 `client/assets/scripts/net/NetClient.ts` 的 `ApiResponse` 对齐。鉴权失败 `code=401`，参数校验失败 `code=400`。

### 联调示例

```bash
# 登录拿 token
TOKEN=$(curl -s -X POST localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' -d '{"code":"abc"}' \
  | sed -E 's/.*"token":"([^"]+)".*/\1/')

# 带 token 访问
curl localhost:8080/api/economy/time -H "Authorization: $TOKEN"
```

## 待接入（按里程碑）

- **M0–M1**：真实微信 `jscode2session`；存档迁移到 MySQL + TypeORM；Redis 换 ioredis；JWT 签名 token。
- **M2**：经济权威结算（收益/库存/订单校验）、跨天结算、离线收益公式接配表。
- **M3**：集市价格模型（天气/主题/摊位等级倍率）、回头客、排行榜防刷。
- **M4**：好友收益挂账与领取、互动次数限制、防互刷检测、微信分享回流。
- **M5**：埋点上报、广告/内购幂等发奖与平台校验、灰度与监控。
