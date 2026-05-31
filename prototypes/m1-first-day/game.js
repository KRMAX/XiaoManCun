/* 小满村 · 春一日
 * 第一版星露谷式运行底座：瓦片地图 + 对象层 + 实体层 + 作物层。
 */
(() => {
  'use strict';

  const START_MAP_ID = (window.XMC_WORLD && window.XMC_WORLD.startMap) || 'village';
  const MAP = window.XMC_MAPS && window.XMC_MAPS[START_MAP_ID];
  if (!MAP || MAP.engine !== 'layered-tilemap') throw new Error('Missing layered tilemap data. Load map-data.js before game.js.');

  const STAGE_W = MAP.viewport.width;
  const STAGE_H = MAP.viewport.height;
  const TILE = MAP.tileSize;
  const SCALE = MAP.renderScale || 2;
  const WORLD_W = MAP.width * TILE;
  const WORLD_H = MAP.height * TILE;
  const SCREEN_W = WORLD_W * SCALE;
  const SCREEN_H = WORLD_H * SCALE;

  const $ = (id) => document.getElementById(id);
  const stage = $('stage');
  const canvas = $('scene');
  const ctx = canvas.getContext('2d');
  const actionBtn = $('action-btn');

  function fit() {
    const s = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
    stage.style.transform = `scale(${s})`;
  }
  window.addEventListener('resize', fit);
  fit();

  const tw = (v) => v * TILE;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const hash = (x, y, salt = 0) => {
    let n = x * 374761393 + y * 668265263 + salt * 1442695041;
    n = (n ^ (n >> 13)) * 1274126177;
    return (n ^ (n >> 16)) >>> 0;
  };

  // ---------------- 资源 ----------------
  const DIR = MAP.assets.baseDir;
  const imgs = {};
  const toLoad = {};
  for (const [key, path] of Object.entries(MAP.assets.sources)) toLoad[`src_${key}`] = path;
  for (const d of ['down', 'left', 'right', 'up']) {
    for (let i = 1; i <= 4; i++) toLoad[`char_${d}_${i}`] = `${MAP.assets.characterDir}char_${d}_${i}.png`;
  }
  for (const i of [1, 2, 5, 6, 7, 8]) toLoad[`chicken_${i}`] = `${MAP.assets.animalDir}chicken_${i}.png`;

  function loadAll() {
    return Promise.all(Object.entries(toLoad).map(([key, src]) => new Promise((resolve) => {
      const im = new Image();
      im.onload = () => { imgs[key] = im; resolve(); };
      im.onerror = () => { console.warn('fail', src); resolve(); };
      im.src = DIR + src;
    })));
  }

  // ---------------- 坐标 / 相机 ----------------
  let camX = 0;
  let camY = 0;
  const toScreen = (x, y) => ({ x: x * SCALE - camX, y: y * SCALE - camY });
  const toWorld = (sx, sy) => ({ x: (sx + camX) / SCALE, y: (sy + camY) / SCALE });

  // ---------------- 地图瓦片 ----------------
  function inPatch(tileX, tileY, patch) {
    return tileX >= patch.x && tileY >= patch.y && tileX < patch.x + patch.w && tileY < patch.y + patch.h;
  }

  function terrainPatchAt(tileX, tileY) {
    for (let i = MAP.terrain.patches.length - 1; i >= 0; i--) {
      const p = MAP.terrain.patches[i];
      if (inPatch(tileX, tileY, p)) return p;
    }
    return null;
  }

  function tileKeyAt(tileX, tileY) {
    const patch = terrainPatchAt(tileX, tileY);
    if (patch) {
      const spec = MAP.tiles[patch.tile];
      if (patch.tile.startsWith('water')) {
        const frame = (tileX + tileY + Math.floor(game.t * 2)) % 3;
        return ['waterA', 'waterB', 'waterC'][frame];
      }
      if (patch.tile.startsWith('tilled')) return hash(tileX, tileY, 9) % 3 === 0 ? 'tilledB' : patch.tile;
      return patch.tile;
    }
    const variants = MAP.terrain.detailTiles;
    const h = hash(tileX, tileY, 3);
    if (h % 31 === 0) return 'grassFlower';
    return variants[h % 3];
  }

  function tileBlocks(tileX, tileY) {
    if (tileX < 0 || tileY < 0 || tileX >= MAP.width || tileY >= MAP.height) return true;
    const patch = terrainPatchAt(tileX, tileY);
    if (patch && patch.blocks) return true;
    const tile = MAP.tiles[tileKeyAt(tileX, tileY)];
    return !!(tile && tile.blocks);
  }

  function drawSolidTile(spec, x, y, tileX, tileY) {
    const size = TILE * SCALE;
    ctx.fillStyle = spec.fill;
    ctx.fillRect(x, y, size, size);
    if (!spec.speckles) return;
    for (let i = 0; i < 4; i++) {
      const h = hash(tileX, tileY, i);
      const px = x + (h % 13 + 1) * SCALE;
      const py = y + ((h >> 5) % 13 + 1) * SCALE;
      ctx.fillStyle = spec.speckles[h % spec.speckles.length];
      ctx.fillRect(px, py, SCALE, SCALE);
    }
  }

  function drawTile(key, tileX, tileY) {
    const spec = MAP.tiles[key];
    const x = tileX * TILE * SCALE - camX;
    const y = tileY * TILE * SCALE - camY;
    if (x < -TILE * SCALE || y < -TILE * SCALE || x > STAGE_W || y > STAGE_H) return;
    if (spec.fill) {
      drawSolidTile(spec, x, y, tileX, tileY);
      return;
    }
    const im = imgs[`src_${spec.source}`];
    if (!im) return;
    ctx.drawImage(im, spec.sx, spec.sy, spec.w, spec.h, x, y, TILE * SCALE, TILE * SCALE);
  }

  function drawTerrain() {
    const startX = Math.floor(camX / (TILE * SCALE)) - 1;
    const startY = Math.floor(camY / (TILE * SCALE)) - 1;
    const endX = Math.ceil((camX + STAGE_W) / (TILE * SCALE)) + 1;
    const endY = Math.ceil((camY + STAGE_H) / (TILE * SCALE)) + 1;
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (x < 0 || y < 0 || x >= MAP.width || y >= MAP.height) continue;
        drawTile(tileKeyAt(x, y), x, y);
      }
    }
  }

  // ---------------- 碰撞 / 寻路 ----------------
  const collisionRects = [];
  for (const obj of MAP.objects) {
    for (const r of obj.collision || []) {
      collisionRects.push({
        id: obj.id,
        x: tw(r.x),
        y: tw(r.y),
        w: tw(r.w),
        h: tw(r.h),
      });
    }
  }

  function pointInRect(x, y, r) {
    return x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h;
  }

  function blockedPoint(x, y) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (tileBlocks(tx, ty)) return true;
    return collisionRects.some((r) => pointInRect(x, y, r));
  }

  function walk(x, y) {
    const r = 4;
    return !blockedPoint(x, y)
      && !blockedPoint(x - r, y - 2)
      && !blockedPoint(x + r, y - 2)
      && !blockedPoint(x, y + r);
  }

  const PATH_STEP = MAP.navigation.pathStep || 8;
  const GRID_W = Math.ceil(WORLD_W / PATH_STEP);
  const GRID_H = Math.ceil(WORLD_H / PATH_STEP);
  const gridKey = (gx, gy) => `${gx},${gy}`;
  const gridPoint = (gx, gy) => ({ gx, gy, x: gx * PATH_STEP + PATH_STEP / 2, y: gy * PATH_STEP + PATH_STEP / 2 });

  function nearestWalkGrid(x, y) {
    const bx = Math.floor(x / PATH_STEP);
    const by = Math.floor(y / PATH_STEP);
    let best = null;
    let bestDist = Infinity;
    for (let radius = 0; radius < 36; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          const gx = bx + dx;
          const gy = by + dy;
          if (gx < 0 || gy < 0 || gx >= GRID_W || gy >= GRID_H) continue;
          const p = gridPoint(gx, gy);
          if (!walk(p.x, p.y)) continue;
          const d = (p.x - x) ** 2 + (p.y - y) ** 2;
          if (d < bestDist) {
            best = p;
            bestDist = d;
          }
        }
      }
      if (best) return best;
    }
    return null;
  }

  function findPath(sx, sy, tx, ty) {
    const start = nearestWalkGrid(sx, sy);
    const goal = nearestWalkGrid(tx, ty);
    if (!start || !goal) return [];
    const open = [start];
    const nodes = new Map([[gridKey(start.gx, start.gy), { ...start, g: 0, f: 0, prev: null }]]);
    const closed = new Set();
    while (open.length) {
      open.sort((a, b) => nodes.get(gridKey(a.gx, a.gy)).f - nodes.get(gridKey(b.gx, b.gy)).f);
      const cur = open.shift();
      const curKey = gridKey(cur.gx, cur.gy);
      const curNode = nodes.get(curKey);
      if (cur.gx === goal.gx && cur.gy === goal.gy) {
        const points = [];
        for (let n = curNode; n; n = n.prev) points.push({ x: n.x, y: n.y });
        points.reverse();
        points.push(walk(tx, ty) ? { x: tx, y: ty } : { x: goal.x, y: goal.y });
        return points.slice(1);
      }
      closed.add(curKey);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const gx = cur.gx + dx;
        const gy = cur.gy + dy;
        if (gx < 0 || gy < 0 || gx >= GRID_W || gy >= GRID_H) continue;
        const nextKey = gridKey(gx, gy);
        if (closed.has(nextKey)) continue;
        const p = gridPoint(gx, gy);
        if (!walk(p.x, p.y)) continue;
        if (dx && dy) {
          const a = gridPoint(cur.gx + dx, cur.gy);
          const b = gridPoint(cur.gx, cur.gy + dy);
          if (!walk(a.x, a.y) || !walk(b.x, b.y)) continue;
        }
        const g = curNode.g + Math.hypot(dx, dy);
        const old = nodes.get(nextKey);
        const h = Math.hypot(p.x - goal.x, p.y - goal.y);
        if (!old || g < old.g) {
          nodes.set(nextKey, { ...p, g, f: g + h, prev: curNode });
          if (!old) open.push(p);
        }
      }
    }
    return [];
  }

  // ---------------- 角色 / 实体 ----------------
  const HERO_SET = {
    down: ['char_down_1', 'char_down_2', 'char_down_3', 'char_down_4'],
    up: ['char_up_1', 'char_up_2', 'char_up_3', 'char_up_4'],
    left: ['char_right_1', 'char_right_2', 'char_right_3', 'char_right_4'],
    right: ['char_left_1', 'char_left_3'],
  };
  const CHICKEN_SET = ['chicken_1', 'chicken_2', 'chicken_5', 'chicken_6'];

  const hero = {
    kind: 'hero',
    x: tw(MAP.player.spawn.x),
    y: tw(MAP.player.spawn.y),
    tx: tw(MAP.player.spawn.x),
    ty: tw(MAP.player.spawn.y),
    dir: MAP.player.spawn.dir || 'down',
    moving: false,
    anim: 0,
    useTarget: false,
  };
  const SPEED = MAP.player.speed;
  const HERO_SCALE = MAP.player.spriteScale || 1;
  const keys = {};
  let pendingInteract = null;
  let path = [];

  const entities = MAP.entities.map((e, i) => ({
    ...e,
    x: tw(e.x),
    y: tw(e.y),
    tx: tw(e.x),
    ty: tw(e.y),
    dir: e.dir || 'down',
    anim: i * 0.7,
    wait: 30 + i * 20,
    moving: false,
  }));

  const cropTypes = MAP.cropTypes || {};
  const crops = [];
  for (const bed of MAP.cropBeds) {
    const type = cropTypes[bed.crop] || { name: bed.crop, maxStage: 3, value: 5, spriteOffset: 0 };
    for (let y = 0; y < bed.rect.h; y++) {
      for (let x = 0; x < bed.rect.w; x++) {
        const idx = x + y * bed.rect.w;
        const stagePattern = bed.stagePattern || [1];
        const waterPattern = bed.wateredPattern || [];
        crops.push({
          id: `${bed.id}-${x}-${y}`,
          bedId: bed.id,
          bed,
          crop: bed.crop,
          cropName: type.name,
          maxStage: type.maxStage,
          value: type.value,
          spriteOffset: type.spriteOffset || 0,
          tx: bed.rect.x + x,
          ty: bed.rect.y + y,
          stage: Math.min(type.maxStage, stagePattern[(x + y * 2) % stagePattern.length]),
          watered: !!waterPattern[idx % Math.max(1, waterPattern.length)],
          harvested: false,
          owner: bed.owner || 'player',
        });
      }
    }
  }

  function setDestination(x, y, interact) {
    const safe = walk(hero.x, hero.y) ? null : nearestWalkGrid(hero.x, hero.y);
    if (safe) {
      hero.x = safe.x;
      hero.y = safe.y;
    }
    path = findPath(hero.x, hero.y, x, y);
    pendingInteract = interact || null;
    if (!path.length && walk(x, y)) path = [{ x, y }];
    if (!path.length) {
      hero.useTarget = false;
      pendingInteract = null;
      return;
    }
    const next = path.shift();
    hero.tx = next.x;
    hero.ty = next.y;
    hero.useTarget = true;
  }

  function updateHero() {
    let vx = 0;
    let vy = 0;
    if (keys.w || keys.arrowup) vy -= 1;
    if (keys.s || keys.arrowdown) vy += 1;
    if (keys.a || keys.arrowleft) vx -= 1;
    if (keys.d || keys.arrowright) vx += 1;
    if (vx || vy) {
      hero.useTarget = false;
      pendingInteract = null;
      path = [];
    }
    if (!vx && !vy && hero.useTarget) {
      const dx = hero.tx - hero.x;
      const dy = hero.ty - hero.y;
      const d = Math.hypot(dx, dy);
      if (d > 1.8) {
        vx = dx / d;
        vy = dy / d;
      } else if (path.length) {
        const next = path.shift();
        hero.tx = next.x;
        hero.ty = next.y;
      } else {
        hero.useTarget = false;
        if (pendingInteract) {
          const act = pendingInteract;
          pendingInteract = null;
          speak(act.lines);
        }
      }
    }
    const mv = Math.hypot(vx, vy);
    if (mv > 0) {
      vx /= mv;
      vy /= mv;
      const ox = hero.x;
      const oy = hero.y;
      const nx = hero.x + vx * SPEED;
      const ny = hero.y + vy * SPEED;
      if (walk(nx, hero.y)) hero.x = nx;
      if (walk(hero.x, ny)) hero.y = ny;
      hero.moving = true;
      hero.anim += 0.18;
      if (Math.abs(vx) > Math.abs(vy)) hero.dir = vx > 0 ? 'right' : 'left';
      else hero.dir = vy > 0 ? 'down' : 'up';
      if (hero.x === ox && hero.y === oy && hero.useTarget) {
        hero.useTarget = false;
        pendingInteract = null;
      }
    } else {
      hero.moving = false;
    }
  }

  function activeSchedule(entity) {
    if (!entity.schedule || !entity.schedule.length) return null;
    const min = Math.floor(game.timeMin) % 1440;
    for (let i = 0; i < entity.schedule.length; i++) {
      const slot = entity.schedule[i];
      if (min >= slot.from && min < slot.to) return { ...slot, index: i };
    }
    return { ...entity.schedule[0], index: 0 };
  }

  function stepEntityTo(entity, targetX, targetY, speed) {
    const dx = targetX - entity.x;
    const dy = targetY - entity.y;
    const d = Math.hypot(dx, dy);
    if (d <= 1) {
      entity.moving = false;
      return true;
    }
    const vx = dx / d;
    const vy = dy / d;
    const nx = entity.x + vx * speed;
    const ny = entity.y + vy * speed;
    if (walk(nx, entity.y)) entity.x = nx;
    if (walk(entity.x, ny)) entity.y = ny;
    entity.moving = true;
    if (Math.abs(vx) > Math.abs(vy)) entity.dir = vx > 0 ? 'right' : 'left';
    else entity.dir = vy > 0 ? 'down' : 'up';
    return false;
  }

  function updateNpc(entity) {
    const slot = activeSchedule(entity);
    if (!slot) return;
    if (entity.scheduleIndex !== slot.index) {
      entity.scheduleIndex = slot.index;
      entity.path = findPath(entity.x, entity.y, tw(slot.x), tw(slot.y));
      entity.pathTarget = { x: tw(slot.x), y: tw(slot.y), dir: slot.dir };
    }
    if (entity.path && entity.path.length) {
      const next = entity.path[0];
      if (stepEntityTo(entity, next.x, next.y, 0.72)) entity.path.shift();
      return;
    }
    if (entity.pathTarget) {
      if (Math.hypot(entity.x - entity.pathTarget.x, entity.y - entity.pathTarget.y) > 3) {
        stepEntityTo(entity, entity.pathTarget.x, entity.pathTarget.y, 0.72);
      } else {
        entity.moving = false;
        entity.dir = entity.pathTarget.dir || entity.dir;
      }
    }
  }

  function animalCanStand(entity, x, y) {
    if (!walk(x, y)) return false;
    if (!entity.roam) return true;
    const r = entity.roam;
    return x >= tw(r.x) && y >= tw(r.y) && x <= tw(r.x + r.w) && y <= tw(r.y + r.h);
  }

  function updateEntities() {
    for (const e of entities) {
      e.anim += e.moving ? 0.12 : 0.04;
      if (e.type === 'npc') {
        updateNpc(e);
        continue;
      }
      if (e.type !== 'animal') continue;
      if (e.fed && !e.eggReady && e.eggTimer > 0) {
        e.eggTimer -= 1;
        if (e.eggTimer <= 0) e.eggReady = true;
      }
      const dx = e.tx - e.x;
      const dy = e.ty - e.y;
      const d = Math.hypot(dx, dy);
      if (d > 1) {
        const vx = dx / d;
        const vy = dy / d;
        const speed = 0.32;
        const nx = e.x + vx * speed;
        const ny = e.y + vy * speed;
        if (animalCanStand(e, nx, ny)) {
          e.x = nx;
          e.y = ny;
          e.moving = true;
          e.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up');
        } else {
          e.tx = e.x;
          e.ty = e.y;
        }
      } else {
        e.moving = false;
        e.wait -= 1;
        if (e.wait <= 0 && e.roam) {
          const seed = hash(Math.floor(game.t * 10), Math.floor(e.x), e.id.length);
          e.tx = tw(e.roam.x) + (seed % Math.floor(e.roam.w * TILE));
          e.ty = tw(e.roam.y) + ((seed >> 8) % Math.floor(e.roam.h * TILE));
          e.wait = 45 + (seed % 90);
        }
      }
    }
  }

  // ---------------- 交互命中 ----------------
  function interactRectWorld(rect) {
    return { x: tw(rect.x), y: tw(rect.y), w: tw(rect.w), h: tw(rect.h) };
  }

  function cropAtTile(tx, ty) {
    return crops.find((c) => c.tx === tx && c.ty === ty) || null;
  }

  function nearestCrop(maxDist = 50) {
    let best = null;
    let bestDist = Infinity;
    for (const c of crops) {
      const x = tw(c.tx + 0.5);
      const y = tw(c.ty + 0.5);
      const d = Math.hypot(hero.x - x, hero.y - y);
      if (d < bestDist && d <= maxDist) {
        best = c;
        bestDist = d;
      }
    }
    return best;
  }

  function nearestAnimal(maxDist = 70) {
    let best = null;
    let bestDist = Infinity;
    for (const e of entities) {
      if (e.type !== 'animal') continue;
      const d = Math.hypot(hero.x - e.x, hero.y - e.y);
      if (d < bestDist && d <= maxDist) {
        best = e;
        bestDist = d;
      }
    }
    return best;
  }

  function cropBedLines(bed) {
    const bedCrops = crops.filter((c) => c.bedId === bed.id && !c.harvested);
    const mature = bedCrops.filter((c) => c.stage >= c.maxStage).length;
    const watered = bedCrops.filter((c) => c.watered).length;
    if (bed.owner !== 'player') return bed.lines;
    return [
      `【${bed.name}】`,
      `${bedCrops.length} 格作物，${mature} 格已经成熟，${watered} 格今天浇过水。`,
      '靠近单格作物时，右下角会出现可执行动作。',
    ];
  }

  function entityLines(entity) {
    if (entity.type !== 'animal') return entity.dialogue || [`【${entity.name}】`, '……'];
    if (entity.eggReady) return [`【${entity.name}】`, '草窝旁边有一枚热乎乎的鸡蛋。', '靠近它可以捡蛋。'];
    if (!entity.fed) return [`【${entity.name}】`, '它在地上啄来啄去，看起来还没吃饱。', '靠近它可以喂鸡。'];
    return [`【${entity.name}】`, '它吃饱了，慢慢在鸡舍边散步。', '等一会儿可能会下蛋。'];
  }

  function hitInteract(x, y) {
    for (const obj of MAP.objects) {
      if (!obj.interact) continue;
      const r = interactRectWorld(obj.interact.rect);
      if (pointInRect(x, y, r)) {
        return {
          name: obj.interact.name || obj.name,
          x: tw(obj.interact.stand.x),
          y: tw(obj.interact.stand.y),
          lines: obj.interact.lines,
        };
      }
    }
    for (const bed of MAP.cropBeds) {
      const r = interactRectWorld(bed.rect);
      if (pointInRect(x, y, r)) {
        return {
          name: bed.name,
          x: tw(bed.stand.x),
          y: tw(bed.stand.y),
          lines: cropBedLines(bed),
        };
      }
    }
    for (const e of entities) {
      const r = { x: e.x - 14, y: e.y - 32, w: 28, h: 36 };
      if (pointInRect(x, y, r)) {
        return {
          name: e.name,
          x: e.x,
          y: e.y + 18,
          lines: entityLines(e),
        };
      }
    }
    for (const p of MAP.portals || []) {
      const r = interactRectWorld(p.rect);
      if (pointInRect(x, y, r)) {
        return { name: p.name, x: tw(p.stand.x), y: tw(p.stand.y), lines: p.lines };
      }
    }
    return null;
  }

  function nearbyInteracts() {
    const list = [];
    const push = (name, x, y, lines) => {
      if (Math.hypot(hero.x - x, hero.y - y) < 64) list.push({ name, x, y, lines });
    };
    for (const obj of MAP.objects) {
      if (!obj.interact) continue;
      push(obj.interact.name || obj.name, tw(obj.interact.stand.x), tw(obj.interact.stand.y), obj.interact.lines);
    }
    for (const bed of MAP.cropBeds) push(bed.name, tw(bed.stand.x), tw(bed.stand.y), cropBedLines(bed));
    for (const e of entities) push(e.name, e.x, e.y, entityLines(e));
    for (const p of MAP.portals || []) push(p.name, tw(p.stand.x), tw(p.stand.y), p.lines);
    return list;
  }

  // ---------------- 状态 / HUD ----------------
  const game = { day: 1, cash: 0, energy: 100, started: false, t: 0, timeMin: 6 * 60, audio: null };
  function beep(f, d, ty) {
    try {
      if (!game.audio) game.audio = new (window.AudioContext || window.webkitAudioContext)();
      const a = game.audio;
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = ty || 'sine';
      o.frequency.value = f;
      g.gain.value = 0.05;
      o.connect(g);
      g.connect(a.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(1e-4, a.currentTime + (d || 0.12));
      o.stop(a.currentTime + (d || 0.12));
    } catch (e) {}
  }
  function fmtTime() {
    const m = Math.floor(game.timeMin) % 1440;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    const ap = h < 12 ? '早' : (h < 18 ? '午' : '晚');
    return `${ap} ${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
  function updateHud() {
    $('chip-date').textContent = `春 · 第 ${game.day} 天`;
    $('chip-weather').textContent = fmtTime();
    $('chip-cash').textContent = String(game.cash);
    $('chip-energy').textContent = String(game.energy);
  }

  let currentAction = null;
  function spendEnergy(cost) {
    if (game.energy < cost) {
      speak(['【体力不足】', '今天有点累了，先缓一缓。']);
      return false;
    }
    game.energy = Math.max(0, game.energy - cost);
    updateHud();
    return true;
  }

  function actionForCrop(crop) {
    if (!crop) return null;
    if (crop.owner !== 'player') {
      return {
        label: '查看',
        run: () => speak([`【${crop.bed.name}】`, '这是别人家的地，先别动手。', '正式版会根据关系、任务或租地规则开放。']),
      };
    }
    if (crop.harvested) {
      return {
        label: '播种',
        run: () => {
          if (!spendEnergy(1)) return;
          crop.harvested = false;
          crop.stage = 1;
          crop.watered = false;
          beep(520, 0.09, 'triangle');
          speak([`【${crop.cropName}】`, '把新种子按进土里。', '这格地重新进入生长状态。']);
        },
      };
    }
    if (crop.stage >= crop.maxStage) {
      return {
        label: '收获',
        run: () => {
          crop.harvested = true;
          crop.watered = false;
          game.cash += crop.value;
          updateHud();
          beep(720, 0.12, 'triangle');
          speak([`【${crop.cropName}】`, `收获一份${crop.cropName}，卖出 +${crop.value}。`, '作物从数据状态里被移除，地块空出来了。']);
        },
      };
    }
    if (!crop.watered) {
      return {
        label: '浇水',
        run: () => {
          if (!spendEnergy(2)) return;
          crop.watered = true;
          crop.stage = Math.min(crop.maxStage, crop.stage + 1);
          beep(620, 0.1, 'sine');
          speak([`【${crop.cropName}】`, '浇过水的土颜色变深了。', '原型里为了看得见反馈，会推进一小段生长阶段。']);
        },
      };
    }
    return {
      label: '查看',
      run: () => speak([`【${crop.cropName}】`, '这格今天已经浇过水。', '等时间流逝或睡过一天，它会继续长大。']),
    };
  }

  function actionForAnimal(animal) {
    if (!animal) return null;
    if (animal.eggReady) {
      return {
        label: '捡蛋',
        run: () => {
          animal.eggReady = false;
          game.cash += 4;
          updateHud();
          beep(760, 0.1, 'triangle');
          speak([`【${animal.name}】`, '捡到一枚鸡蛋，暂时折算成 +4。', '正式版会进背包，再由出售箱结算。']);
        },
      };
    }
    if (!animal.fed) {
      return {
        label: '喂鸡',
        run: () => {
          if (!spendEnergy(2)) return;
          animal.fed = true;
          animal.eggTimer = 480 + Math.floor(Math.random() * 180);
          beep(520, 0.09, 'square');
          speak([`【${animal.name}】`, '它把饲料啄干净了，心情明显好了些。', '吃饱以后会在鸡舍范围里活动，并有机会下蛋。']);
        },
      };
    }
    return {
      label: '抚摸',
      run: () => {
        beep(680, 0.08, 'sine');
        speak([`【${animal.name}】`, '它舒服地眯了眯眼。', '亲密度系统后面可以接在这里。']);
      },
    };
  }

  function getContextAction() {
    if (!game.started || dialog.classList.contains('show')) return null;
    const animal = nearestAnimal();
    if (animal) return actionForAnimal(animal);
    const crop = nearestCrop();
    if (crop) return actionForCrop(crop);
    return null;
  }

  function updateActionButton() {
    currentAction = getContextAction();
    if (!currentAction) {
      actionBtn.classList.add('hidden');
      actionBtn.textContent = '';
      return;
    }
    actionBtn.textContent = currentAction.label;
    actionBtn.classList.remove('hidden');
  }

  actionBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentAction || dialog.classList.contains('show')) return;
    const act = currentAction;
    currentAction = null;
    actionBtn.classList.add('hidden');
    act.run();
  });

  // ---------------- 对话 ----------------
  const dialog = $('dialog');
  const dlgPortrait = $('dialog-portrait');
  const dlgName = $('dialog-name');
  const dlgText = $('dialog-text');
  let dlgQ = [];
  let dlgCb = null;
  let typing = null;
  function setPortrait(name) {
    let image = 'assets/ui/grandma-portrait.png';
    let size = '86px 86px';
    if (/^(小黄|小白|花花)$/.test(name)) {
      image = 'assets/xiaomancun/chicken_1.png';
      size = '68px 68px';
    } else if (/菜地|小白菜|萝卜|香草|体力不足/.test(name)) {
      image = 'assets/xiaomancun/plants_sheet.png';
      size = '96px 32px';
    } else if (/水井|村务牌|作坊|屋门|鸡舍|村口|外婆家|阿田家|桂嫂家/.test(name)) {
      image = 'assets/xiaomancun/house.png';
      size = '86px 62px';
    } else if (name !== '外婆') {
      image = 'assets/xiaomancun/char_down_1.png';
      size = '74px 74px';
    }
    dlgPortrait.style.background = `url("${image}") center bottom / ${size} no-repeat, linear-gradient(180deg, #fff5cf, #e3bd79)`;
  }
  function speak(lines, cb) {
    dlgQ = lines.slice();
    const title = dlgQ[0] && dlgQ[0].match(/^【(.+)】$/);
    if (title) {
      dlgName.textContent = title[1];
      setPortrait(title[1]);
      dlgQ.shift();
    } else {
      dlgName.textContent = '小满村';
      setPortrait('小满村');
    }
    dlgCb = cb || null;
    dialog.classList.add('show');
    nextLine();
  }
  function nextLine() {
    if (typing) {
      clearInterval(typing);
      typing = null;
      dlgText.textContent = dlgText.dataset.full;
      return;
    }
    if (!dlgQ.length) {
      dialog.classList.remove('show');
      const cb = dlgCb;
      dlgCb = null;
      if (cb) cb();
      return;
    }
    const line = dlgQ.shift();
    dlgText.dataset.full = line;
    dlgText.textContent = '';
    let i = 0;
    typing = setInterval(() => {
      dlgText.textContent = line.slice(0, ++i);
      if (i >= line.length) {
        clearInterval(typing);
        typing = null;
      }
    }, 26);
  }
  dialog.addEventListener('click', () => {
    if (typing) {
      clearInterval(typing);
      typing = null;
      dlgText.textContent = dlgText.dataset.full;
      return;
    }
    nextLine();
  });

  // ---------------- 输入 ----------------
  canvas.addEventListener('pointerdown', (e) => {
    if (!game.started || dialog.classList.contains('show')) return;
    const r = canvas.getBoundingClientRect();
    const sx = (e.clientX - r.left) / r.width * STAGE_W;
    const sy = (e.clientY - r.top) / r.height * STAGE_H;
    const p = toWorld(sx, sy);
    const interact = hitInteract(p.x, p.y);
    if (interact) {
      setDestination(interact.x, interact.y, interact);
      beep(440, 0.06);
      return;
    }
    setDestination(p.x, p.y, null);
  });
  window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
  window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

  // ---------------- 绘制：对象 / 植物 / 实体 ----------------
  function drawWorldRect(x, y, w, h, fill) {
    const s = toScreen(x, y);
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(s.x), Math.round(s.y), Math.round(w * SCALE), Math.round(h * SCALE));
  }

  function drawFence(obj) {
    const x = tw(obj.x);
    const y = tw(obj.y);
    const w = tw(obj.w);
    const h = tw(obj.h);
    const rail = '#8d5e2f';
    const post = '#6f4725';
    if (obj.w >= obj.h) {
      for (let tx = 0; tx < obj.w; tx++) {
        drawWorldRect(x + tx * TILE + 2, y + 3, 3, 14, post);
        drawWorldRect(x + tx * TILE + 7, y + 6, 11, 3, rail);
        drawWorldRect(x + tx * TILE + 7, y + 12, 11, 3, rail);
      }
    } else {
      for (let ty = 0; ty < obj.h; ty++) {
        drawWorldRect(x + 3, y + ty * TILE + 2, 14, 3, rail);
        drawWorldRect(x + 3, y + ty * TILE + 9, 14, 3, rail);
        drawWorldRect(x + 8, y + ty * TILE + 3, 3, 14, post);
      }
    }
  }

  function drawTree(obj) {
    const x = tw(obj.x);
    const y = tw(obj.y);
    drawWorldRect(x + 24, y + 48, 12, 30, '#80522c');
    drawWorldRect(x + 18, y + 38, 24, 18, '#a06535');
    const leaves = [
      [12, 8, 40, 22, '#6ca94d'], [4, 22, 56, 24, '#5d9a43'],
      [14, 36, 42, 24, '#7fbc5a'], [24, 2, 26, 18, '#8bc566'],
      [28, 20, 8, 8, '#f0a6b9'], [44, 30, 7, 7, '#ef9ab0'],
    ];
    for (const [lx, ly, lw, lh, c] of leaves) drawWorldRect(x + lx, y + ly, lw, lh, c);
  }

  function drawWell(obj) {
    const x = tw(obj.x);
    const y = tw(obj.y);
    drawWorldRect(x + 5, y + 13, 22, 12, '#80715e');
    drawWorldRect(x + 8, y + 9, 16, 8, '#b6a790');
    drawWorldRect(x + 11, y + 11, 10, 5, '#536f83');
    drawWorldRect(x + 7, y + 5, 3, 12, '#76512d');
    drawWorldRect(x + 22, y + 5, 3, 12, '#76512d');
    drawWorldRect(x + 8, y + 4, 17, 3, '#6d4325');
  }

  function drawSign(obj) {
    const x = tw(obj.x);
    const y = tw(obj.y);
    drawWorldRect(x + 8, y + 12, 4, 18, '#6f4725');
    drawWorldRect(x + 1, y + 3, 28, 13, '#b67b38');
    drawWorldRect(x + 4, y + 6, 22, 2, '#e0b266');
  }

  function drawSpriteObject(obj) {
    const im = imgs[`src_${obj.sprite}`];
    if (!im) return;
    const s = toScreen(tw(obj.x), tw(obj.y));
    ctx.drawImage(im, Math.round(s.x), Math.round(s.y), obj.w * TILE * SCALE, obj.h * TILE * SCALE);
  }

  function drawObject(obj) {
    if (obj.kind === 'sprite') drawSpriteObject(obj);
    else if (obj.kind === 'fence') drawFence(obj);
    else if (obj.kind === 'tree') drawTree(obj);
    else if (obj.kind === 'well') drawWell(obj);
    else if (obj.kind === 'sign') drawSign(obj);
  }

  function drawCrops() {
    const im = imgs.src_plants;
    if (!im) return;
    for (const crop of crops) {
      const wx = tw(crop.tx);
      const wy = tw(crop.ty);
      const s = toScreen(wx, wy);
      if (crop.watered && !crop.harvested) {
        ctx.fillStyle = 'rgba(92, 128, 126, .28)';
        ctx.fillRect(Math.round(s.x + 2 * SCALE), Math.round(s.y + 10 * SCALE), 12 * SCALE, 4 * SCALE);
      }
      if (crop.harvested) continue;
      const sx = clamp(crop.stage, 0, 5) * 16;
      const sy = Math.min(1, crop.spriteOffset) * 16;
      ctx.drawImage(im, sx, sy, 16, 16, Math.round(s.x), Math.round(s.y), TILE * SCALE, TILE * SCALE);
    }
  }

  function drawShadow(x, y, rx, ry) {
    const s = toScreen(x, y);
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, rx * SCALE, ry * SCALE, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCharacterAt(entity) {
    const set = HERO_SET[entity.dir] || HERO_SET.down;
    const idx = entity.moving ? Math.floor(entity.anim) % set.length : 0;
    const im = imgs[set[idx]] || imgs.char_down_1;
    if (!im) return;
    const s = toScreen(entity.x, entity.y);
    const w = 48 * SCALE * (entity.kind === 'hero' ? HERO_SCALE : 1);
    const h = 48 * SCALE * (entity.kind === 'hero' ? HERO_SCALE : 1);
    const bob = entity.moving && Math.floor(entity.anim) % 2 ? -2 * SCALE : 0;
    drawShadow(entity.x, entity.y, 8, 3);
    ctx.drawImage(im, Math.round(s.x - w / 2), Math.round(s.y - h + 8 * SCALE + bob), w, h);
  }

  function drawChicken(entity) {
    const idx = entity.moving ? Math.floor(entity.anim) % CHICKEN_SET.length : 0;
    const im = imgs[CHICKEN_SET[idx]] || imgs.chicken_1;
    if (!im) return;
    const s = toScreen(entity.x, entity.y);
    const w = 32 * SCALE;
    const h = 32 * SCALE;
    drawShadow(entity.x, entity.y, 6, 2.5);
    if (entity.eggReady && imgs.src_eggItem) {
      ctx.drawImage(imgs.src_eggItem, Math.round(s.x + 6 * SCALE), Math.round(s.y - 3 * SCALE), 10 * SCALE, 10 * SCALE);
    }
    ctx.drawImage(im, Math.round(s.x - w / 2), Math.round(s.y - h + 7 * SCALE), w, h);
    if (entity.fed && !entity.eggReady) {
      ctx.fillStyle = '#f28aa4';
      ctx.fillRect(Math.round(s.x + 6 * SCALE), Math.round(s.y - 30 * SCALE), 3 * SCALE, 3 * SCALE);
      ctx.fillRect(Math.round(s.x + 10 * SCALE), Math.round(s.y - 30 * SCALE), 3 * SCALE, 3 * SCALE);
      ctx.fillRect(Math.round(s.x + 8 * SCALE), Math.round(s.y - 27 * SCALE), 3 * SCALE, 3 * SCALE);
    }
  }

  function drawEntity(entity) {
    if (entity.type === 'animal') drawChicken(entity);
    else drawCharacterAt(entity);
  }

  function renderables() {
    const items = [];
    for (const obj of MAP.objects) {
      items.push({
        y: tw(obj.y + obj.h),
        draw: () => drawObject(obj),
      });
    }
    for (const e of entities) {
      items.push({
        y: e.y,
        draw: () => drawEntity(e),
      });
    }
    items.push({
      y: hero.y,
      draw: () => drawCharacterAt(hero),
    });
    return items.sort((a, b) => a.y - b.y);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawHotHints() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 15px sans-serif';
    for (const item of nearbyInteracts()) {
      const s = toScreen(item.x, item.y - 12);
      const label = `▸ ${item.name}`;
      const twidth = ctx.measureText(label).width + 18;
      ctx.fillStyle = 'rgba(59,42,26,.9)';
      roundRect(s.x - twidth / 2, s.y - 44, twidth, 24, 9);
      ctx.fill();
      ctx.fillStyle = '#ffe9a8';
      ctx.fillText(label, s.x, s.y - 31);
    }
  }

  // ---------------- 氛围动效 ----------------
  const petals = [];
  function resetPetal(p, randomY) {
    const fx = MAP.effects.petals;
    p.x = tw(fx.x) + Math.random() * tw(fx.w);
    p.y = tw(fx.y) + (randomY ? Math.random() * tw(fx.h) : 0);
    p.vx = -0.08 - Math.random() * 0.12;
    p.vy = 0.12 + Math.random() * 0.16;
    p.r = Math.random() * 7;
    p.sz = 1.6 + Math.random() * 1.4;
  }
  for (let i = 0; i < 22; i++) {
    const p = {};
    resetPetal(p, true);
    petals.push(p);
  }

  function drawPetals() {
    for (const p of petals) {
      p.x += p.vx + Math.sin(p.r) * 0.08;
      p.y += p.vy;
      p.r += 0.05;
      if (p.y > tw(45) || p.x < tw(8)) resetPetal(p, false);
      const s = toScreen(p.x, p.y);
      ctx.fillStyle = 'rgba(255,184,207,.92)';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, p.sz * SCALE, p.sz * 0.66 * SCALE, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawWaterShimmer() {
    ctx.save();
    ctx.globalAlpha = 0.24;
    ctx.strokeStyle = '#effeff';
    ctx.lineWidth = 2;
    for (const water of MAP.effects.water) {
      const cx = tw(water.x + water.w / 2);
      const cy = tw(water.y + water.h / 2);
      const s = toScreen(cx, cy);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(
          s.x + Math.sin(game.t + i) * 18,
          s.y - 14 + i * 12 + Math.sin(game.t * 1.2 + i) * 2,
          Math.min(52, water.w * 5),
          5,
          0,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ---------------- 主循环 ----------------
  let last = performance.now();
  function render(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.t += dt;
    if (game.started) {
      updateHero();
      updateEntities();
      game.timeMin += dt * 2;
      updateHud();
    }
    updateActionButton();
    camX = clamp(hero.x * SCALE - STAGE_W / 2, 0, Math.max(0, SCREEN_W - STAGE_W));
    camY = clamp(hero.y * SCALE - STAGE_H / 2, 0, Math.max(0, SCREEN_H - STAGE_H));

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, STAGE_W, STAGE_H);
    ctx.fillStyle = '#7fa954';
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);
    drawTerrain();
    drawCrops();
    for (const item of renderables()) item.draw();
    drawWaterShimmer();
    drawPetals();
    drawHotHints();
    requestAnimationFrame(render);
  }

  // ---------------- 启动 ----------------
  loadAll().then(() => {
    const b = $('start-btn');
    b.disabled = false;
    b.textContent = '开始这一天';
    const cap = location.hash.replace('#', '');
    if (cap === 'go') {
      game.started = true;
      updateHud();
      $('title-card').classList.add('hidden');
      $('ctrl-hint').style.opacity = 0;
    }
    requestAnimationFrame(render);
  });

  $('start-btn').onclick = () => {
    $('title-card').classList.add('hidden');
    game.started = true;
    updateHud();
    beep(560, 0.14, 'triangle');
    speak(MAP.dialogue.intro, () => {
      setTimeout(() => { $('ctrl-hint').style.opacity = 0; }, 6500);
    });
  };
})();
