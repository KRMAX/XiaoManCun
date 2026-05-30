/* 小满村 · 院子 —— M1 仙剑98 式可玩场景原型
 * 路线 A：一整张手绘院子图当背景，叠「可行走角色 + 碰撞边界/障碍 + 交互热点 + 氛围动效」。
 * 背景是斜俯视手绘插画（非瓦片），角色精灵暂用占位小人；方向定死后再统一重画角色。
 */
(() => {
  'use strict';

  const STAGE_W = 1280, STAGE_H = 720;
  const $ = (id) => document.getElementById(id);
  const stage = $('stage'), canvas = $('scene'), ctx = canvas.getContext('2d');

  function fit() { const s = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H); stage.style.transform = `scale(${s})`; }
  window.addEventListener('resize', fit); fit();

  // ---------------- 资源 ----------------
  const DIR = 'assets/';
  const imgs = {};
  const toLoad = { bg: 'scenes/courtyard.png' };
  for (const d of ['down', 'left', 'right']) for (let i = 1; i <= 4; i++) toLoad[`char_${d}_${i}`] = `xiaomancun/char_${d}_${i}.png`;
  function loadAll() {
    return Promise.all(Object.keys(toLoad).map(k => new Promise((res) => {
      const im = new Image(); im.onload = () => { imgs[k] = im; res(); }; im.onerror = () => { console.warn('fail', toLoad[k]); res(); }; im.src = DIR + toLoad[k];
    })));
  }

  // ---------------- 场景几何（图像坐标系 1024x682）----------------
  const IMG_W = 1024, IMG_H = 682;
  const scale = STAGE_W / IMG_W;        // 1.25，铺满屏宽
  const imgH = IMG_H * scale;           // 852.5，比屏高，竖向跟随平移
  let camY = 0;
  const toScreen = (ix, iy) => ({ x: ix * scale, y: iy * scale - camY });

  // 可行走边界多边形（院子地面）
  const BOUND = [[150, 250], [300, 246], [470, 250], [565, 250], [660, 268], [822, 286], [836, 455], [720, 555], [380, 578], [248, 560], [150, 470], [108, 360]];
  // 障碍（踩不上去，绕着走）
  const OBST = [
    { t: 'rect', x: 115, y: 296, w: 142, h: 104 },   // 鸡舍
    { t: 'ell', cx: 322, cy: 347, rx: 80, ry: 47 },  // 石桌凳
    { t: 'ell', cx: 490, cy: 347, rx: 40, ry: 34 },  // 水井
    { t: 'ell', cx: 732, cy: 332, rx: 104, ry: 64 }, // 池塘
    { t: 'rect', x: 318, y: 394, w: 386, h: 134 },   // 菜地
    { t: 'rect', x: 690, y: 496, w: 196, h: 116 },   // 工具棚
  ];
  function inPoly(x, y, p) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const xi = p[i][0], yi = p[i][1], xj = p[j][0], yj = p[j][1]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c; } return c; }
  function inObst(x, y) { for (const o of OBST) { if (o.t === 'rect') { if (x > o.x && x < o.x + o.w && y > o.y && y < o.y + o.h) return true; } else { const dx = (x - o.cx) / o.rx, dy = (y - o.cy) / o.ry; if (dx * dx + dy * dy < 1) return true; } } return false; }
  function walk(x, y) { return inPoly(x, y, BOUND) && !inObst(x, y); }

  // 交互热点：点击靠近后触发；sx/sy 是站立点（图像坐标）
  const HOT = [
    { name: '菜地', t: 'rect', x: 318, y: 394, w: 386, h: 134, sx: 510, sy: 556, lines: ['【菜畦】', '白菜、青苗、豆架，长得正欢。', '（正式版这里能锄地、播种、浇水、施肥、看成熟倒计时、收获。）'] },
    { name: '池塘', t: 'ell', cx: 732, cy: 332, rx: 104, ry: 64, sx: 732, sy: 420, lines: ['【池塘】', '几只鸭子在打盹儿，水面荡着圈圈。', '（正式版可钓鱼、养鸭、捡鸭蛋。）'] },
    { name: '鸡舍', t: 'rect', x: 115, y: 296, w: 142, h: 150, sx: 205, sy: 475, lines: ['【鸡舍】', '母鸡们咕咕地刨食。', '（正式版可喂鸡、捡蛋、孵小鸡。）'] },
    { name: '屋门', t: 'rect', x: 266, y: 172, w: 84, h: 80, sx: 305, sy: 266, lines: ['【老屋】', '门上还贴着褪色的春联。', '（屋内场景待绘制，先在院里逛逛吧。）'] },
    { name: '院门', t: 'rect', x: 236, y: 504, w: 124, h: 96, sx: 300, sy: 522, lines: ['【院门】', '推开就是村道。', '（村道 / 县城场景待做。）'] },
    { name: '石桌', t: 'ell', cx: 322, cy: 347, rx: 80, ry: 47, sx: 322, sy: 412, lines: ['【石桌】', '坐下歇会儿，喝口粗茶。', '回乡头一天，先把院子逛熟。'] },
  ];
  function hitHot(x, y) { for (const h of HOT) { if (h.t === 'rect') { if (x > h.x && x < h.x + h.w && y > h.y && y < h.y + h.h) return h; } else { const dx = (x - h.cx) / h.rx, dy = (y - h.cy) / h.ry; if (dx * dx + dy * dy < 1) return h; } } return null; }

  // ---------------- 角色 ----------------
  // 这套素材方向帧混切（无背面、左右切反），按真实朝向重建：右=朝右侧面，左=朝左侧面，上下=正面
  const HERO_SET = { right: ['char_left_1', 'char_left_3'], left: ['char_right_1', 'char_right_3'], down: ['char_down_1', 'char_down_2'], up: ['char_down_1', 'char_down_2'] };
  const hero = { ix: 360, iy: 300, tx: 360, ty: 300, dir: 'down', moving: false, anim: 0, useTarget: false };
  const SPEED = 2.4, keys = {};
  let pendingHot = null;

  // ---------------- 状态 / HUD ----------------
  const game = { day: 1, cash: 0, energy: 100, started: false, t: 0, timeMin: 6 * 60, audio: null };
  function beep(f, d, ty) { try { if (!game.audio) game.audio = new (window.AudioContext || window.webkitAudioContext)(); const a = game.audio, o = a.createOscillator(), g = a.createGain(); o.type = ty || 'sine'; o.frequency.value = f; g.gain.value = .05; o.connect(g); g.connect(a.destination); o.start(); g.gain.exponentialRampToValueAtTime(1e-4, a.currentTime + (d || .12)); o.stop(a.currentTime + (d || .12)); } catch (e) {} }
  function fmtTime() { let m = Math.floor(game.timeMin) % 1440; const h = Math.floor(m / 60), mm = m % 60; const ap = h < 12 ? '早' : (h < 18 ? '午' : '晚'); return `${ap} ${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; }
  function updateHud() { $('chip-date').textContent = `春 · 第 ${game.day} 天`; $('chip-weather').textContent = fmtTime(); $('chip-cash').textContent = String(game.cash); $('chip-energy').textContent = String(game.energy); }

  // ---------------- 对话 ----------------
  const dialog = $('dialog'), dlgText = $('dialog-text'); let dlgQ = [], dlgCb = null, typing = null;
  function speak(lines, cb) { dlgQ = lines.slice(); dlgCb = cb || null; dialog.classList.add('show'); nextLine(); }
  function nextLine() { if (typing) { clearInterval(typing); typing = null; dlgText.textContent = dlgText.dataset.full; return; } if (!dlgQ.length) { dialog.classList.remove('show'); const cb = dlgCb; dlgCb = null; if (cb) cb(); return; } const line = dlgQ.shift(); dlgText.dataset.full = line; dlgText.textContent = ''; let i = 0; typing = setInterval(() => { dlgText.textContent = line.slice(0, ++i); if (i >= line.length) { clearInterval(typing); typing = null; } }, 26); }
  dialog.addEventListener('click', () => { if (typing) { clearInterval(typing); typing = null; dlgText.textContent = dlgText.dataset.full; return; } nextLine(); });

  // ---------------- 氛围动效 ----------------
  const petals = [];
  function newPetal(rand) { return { ix: 600 + Math.random() * 250, iy: rand ? (40 + Math.random() * 380) : (50 + Math.random() * 40), vx: -0.18 - Math.random() * 0.32, vy: 0.22 + Math.random() * 0.3, r: Math.random() * 7, sz: 2 + Math.random() * 2 }; }
  for (let i = 0; i < 20; i++) petals.push(newPetal(true));
  function drawPetals() {
    ctx.imageSmoothingEnabled = true;
    for (const p of petals) {
      p.ix += p.vx + Math.sin(p.r) * 0.35; p.iy += p.vy; p.r += 0.05;
      if (p.iy > 440 || p.ix < 540) Object.assign(p, newPetal(false));
      const s = toScreen(p.ix, p.iy);
      ctx.fillStyle = 'rgba(255,184,207,.92)'; ctx.beginPath(); ctx.ellipse(s.x, s.y, p.sz, p.sz * 0.66, p.r, 0, 7); ctx.fill();
    }
  }
  function drawPondShimmer() {
    const c = toScreen(732, 332);
    ctx.save(); ctx.globalAlpha = .22; ctx.strokeStyle = '#effeff'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { const yy = c.y - 12 + i * 13 + Math.sin(game.t + i) * 2; ctx.beginPath(); ctx.ellipse(c.x - 8 + Math.sin(game.t * 0.6 + i) * 12, yy, 44, 7, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }
  const parts = [];
  function drawParticles() { for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vy += .18; p.life -= .025; if (p.life <= 0) { parts.splice(i, 1); continue; } ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.col; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); } ctx.globalAlpha = 1; }

  // ---------------- 输入 ----------------
  canvas.addEventListener('pointerdown', (e) => {
    if (!game.started || dialog.classList.contains('show')) return;
    const r = canvas.getBoundingClientRect();
    const sx = (e.clientX - r.left) / r.width * STAGE_W, sy = (e.clientY - r.top) / r.height * STAGE_H;
    const ix = sx / scale, iy = (sy + camY) / scale;
    const h = hitHot(ix, iy);
    if (h) { hero.tx = h.sx; hero.ty = h.sy; hero.useTarget = true; pendingHot = h; beep(440, .06); return; }
    hero.tx = ix; hero.ty = iy; hero.useTarget = true; pendingHot = null;
  });
  window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
  window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

  // ---------------- 更新 ----------------
  function updateHero() {
    let vx = 0, vy = 0;
    if (keys['w'] || keys['arrowup']) vy -= 1; if (keys['s'] || keys['arrowdown']) vy += 1;
    if (keys['a'] || keys['arrowleft']) vx -= 1; if (keys['d'] || keys['arrowright']) vx += 1;
    if (vx || vy) { hero.useTarget = false; pendingHot = null; }
    if (!vx && !vy && hero.useTarget) {
      const dx = hero.tx - hero.ix, dy = hero.ty - hero.iy, d = Math.hypot(dx, dy);
      if (d > 2.5) { vx = dx / d; vy = dy / d; }
      else { hero.useTarget = false; if (pendingHot) { const hh = pendingHot; pendingHot = null; speak(hh.lines); } }
    }
    const mv = Math.hypot(vx, vy);
    if (mv > 0) {
      vx /= mv; vy /= mv;
      const ox = hero.ix, oy = hero.iy;
      const nx = hero.ix + vx * SPEED, ny = hero.iy + vy * SPEED;
      if (walk(nx, hero.iy)) hero.ix = nx;
      if (walk(hero.ix, ny)) hero.iy = ny;
      hero.moving = true; hero.anim += 0.18;
      if (Math.abs(vx) > Math.abs(vy)) hero.dir = vx > 0 ? 'right' : 'left'; else hero.dir = vy > 0 ? 'down' : 'up';
      if (hero.ix === ox && hero.iy === oy && hero.useTarget) { hero.useTarget = false; pendingHot = null; }  // 卡墙，放弃目标
    } else hero.moving = false;
  }

  // ---------------- 绘制 ----------------
  function drawHero() {
    const set = HERO_SET[hero.dir] || HERO_SET.down;
    const idx = hero.moving ? (Math.floor(hero.anim) % set.length) : 0;
    const im = imgs[set[idx]] || imgs.char_down_1; if (!im) return;
    const s = toScreen(hero.ix, hero.iy);
    const S = 1.85, w = 48 * S, h = 48 * S;
    const bob = hero.moving && (Math.floor(hero.anim) % 2) ? -2 : 0;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(s.x, s.y, 17, 6, 0, 0, 7); ctx.fill();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(im, s.x - w / 2, s.y - h + 12 + bob, w, h);
    ctx.imageSmoothingEnabled = true;
  }
  // 热点提示：靠近时在站立点上方浮出名字
  function drawHotHints() {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const hh of HOT) {
      const near = Math.hypot(hero.ix - hh.sx, hero.iy - hh.sy) < 70;
      if (!near) continue;
      const s = toScreen(hh.sx, hh.sy - 10);
      ctx.font = 'bold 15px sans-serif';
      const tw = ctx.measureText('▸ ' + hh.name).width + 18;
      ctx.fillStyle = 'rgba(59,42,26,.9)'; roundRect(s.x - tw / 2, s.y - 44, tw, 24, 9); ctx.fill();
      ctx.fillStyle = '#ffe9a8'; ctx.fillText('▸ ' + hh.name, s.x, s.y - 31);
    }
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  let last = performance.now();
  function render(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now; game.t += dt;
    if (game.started) { updateHero(); game.timeMin += dt * 2; updateHud(); }
    camY = Math.max(0, Math.min(imgH - STAGE_H, hero.iy * scale - STAGE_H / 2));
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, STAGE_W, STAGE_H);
    ctx.fillStyle = '#20351c'; ctx.fillRect(0, 0, STAGE_W, STAGE_H);
    ctx.imageSmoothingEnabled = true;
    if (imgs.bg) ctx.drawImage(imgs.bg, 0, -camY, STAGE_W, imgH);
    drawPondShimmer();
    drawHero();
    drawPetals();
    drawHotHints();
    drawParticles();
    requestAnimationFrame(render);
  }

  // ---------------- 启动 ----------------
  loadAll().then(() => {
    const b = $('start-btn'); b.disabled = false; b.textContent = '回到院子';
    const CAP = location.hash.replace('#', '');   // 调试用：#go 自动开场
    if (CAP === 'go') { game.started = true; updateHud(); $('title-card').classList.add('hidden'); $('ctrl-hint').style.opacity = 0; }
    requestAnimationFrame(render);
  });
  $('start-btn').onclick = () => {
    $('title-card').classList.add('hidden'); game.started = true; updateHud(); beep(560, .14, 'triangle');
    speak(['哎哟，回来啦！外婆盼你好些天咯。', '院子你随便逛——点地面走路，点菜地、池塘、鸡舍、屋门看看。', '慢慢来，把这院子重新过成日子。'],
      () => { setTimeout(() => { $('ctrl-hint').style.opacity = 0; }, 6500); });
  };
})();
