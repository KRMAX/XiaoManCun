/* 小满村 M1 场景数据层
 *
 * 视觉规则已定：
 * - 户外主地图优先使用高细节手绘/预渲染底图；
 * - 可走区、碰撞、交互点、动物活动区、作物状态用不可见数据层描述；
 * - 主角、动物、临时可变物件必须匹配底图的透视、光影和细节密度；
 * - 不再把整张村子强行降级成低清瓦片图。
 */
window.XMC_MAPS = window.XMC_MAPS || {};

window.XMC_WORLD = {
  id: 'xiaomancun-world',
  startMap: 'village',
  mapPolicy: {
    visualRule: '手绘大地图 + 不可见数据层 + 同风格动态精灵',
    villageFreeRoam: '村内户外是一张连续主地图，院子、田地、鸡圈、邻居屋、作坊、池塘、村口只是不同区域。',
    useSeparateMapWhen: ['进入建筑室内', '去县城', '进山/河滩等远距离区域', '进入剧情副本'],
  },
  maps: {
    village: {
      id: 'village',
      name: '小满村',
      kind: 'outdoor-continuous',
      role: 'main-free-roam',
    },
    grandmaHouseInterior: {
      id: 'grandma-house-interior',
      name: '外婆家屋内',
      kind: 'interior',
      parentMap: 'village',
    },
    countyRoad: {
      id: 'county-road',
      name: '去县城路',
      kind: 'remote-outdoor',
    },
  },
};

window.XMC_MAPS.village = {
  id: 'village',
  name: '小满村',
  engine: 'painted-data-layer',
  coordinateSystem: 'image-pixels',
  viewport: { width: 1280, height: 720 },
  imageSize: { width: 1536, height: 1024 },
  tileSize: 1,
  renderScale: 1,
  width: 1536,
  height: 1024,
  visual: {
    mode: 'hand-painted-background',
    smoothSprites: true,
    rule: '背景不拆低清瓦片；数据层只负责玩法；动态素材按手绘底图的透视和光影重做。',
  },
  ui: {
    statusPanel: false,
  },
  assets: {
    baseDir: 'assets/',
    background: 'scenes/village.png?v=20260601-painted',
    characterDir: 'painted/',
    animalDir: 'xiaomancun/',
    sources: {
      eggItem: 'xiaomancun/egg_item.png',
    },
  },
  player: {
    spawn: { x: 300, y: 690, dir: 'down' },
    speed: 2.4,
    spriteScale: 0.58,
    sideFrames: 'direct',
    frame: { width: 96, height: 128, footOffset: 3 },
    shadow: { rx: 16, ry: 5 },
  },
  items: {
    egg: { name: '鸡蛋', icon: 'egg', value: 4, shippable: true },
  },
  startingInventory: {},
  goals: [],
  cropTypes: {},
  cropBeds: [],
  navigation: {
    pathStep: 16,
    walkBoundary: [
      [38, 368],
      [186, 310],
      [392, 304],
      [580, 226],
      [760, 246],
      [960, 220],
      [1148, 186],
      [1458, 214],
      [1516, 324],
      [1430, 456],
      [1344, 628],
      [1232, 780],
      [1080, 930],
      [884, 1002],
      [598, 968],
      [308, 914],
      [84, 842],
      [20, 654],
    ],
    blockedAreas: [
      { id: 'grandma-house-body', name: '外婆家屋体', x: 58, y: 328, w: 322, h: 150 },
      { id: 'home-coop-shed', name: '手绘鸡圈棚体', x: 42, y: 530, w: 190, h: 104 },
      { id: 'home-stone-table', name: '石桌和凳子', x: 260, y: 486, w: 150, h: 86 },
      { id: 'home-pond', name: '院内池塘', x: 456, y: 490, w: 248, h: 132 },
      { id: 'home-field', name: '家门口菜地', x: 330, y: 620, w: 366, h: 158 },
      { id: 'neighbor-west-house', name: '西侧邻居屋', x: 488, y: 78, w: 168, h: 136 },
      { id: 'neighbor-north-house', name: '北侧邻居屋', x: 692, y: 58, w: 150, h: 120 },
      { id: 'neighbor-center-house', name: '中部邻居屋', x: 922, y: 104, w: 208, h: 142 },
      { id: 'neighbor-east-house', name: '东侧邻居屋', x: 1226, y: 96, w: 188, h: 146 },
      { id: 'small-east-house', name: '东侧小屋', x: 1370, y: 208, w: 140, h: 112 },
      { id: 'village-workshop', name: '加工小作坊', x: 788, y: 394, w: 264, h: 122 },
      { id: 'water-mill', name: '水车小屋', x: 1180, y: 794, w: 236, h: 150 },
    ],
    passableAreas: [],
  },
  animalAreas: [
    {
      id: 'painted-coop-yard',
      name: '手绘鸡圈活动区',
      rect: { x: 52, y: 568, w: 178, h: 150 },
      home: { x: 132, y: 650 },
      behavior: {
        roamWait: [45, 135],
        roamSpeed: 0.32,
        sleepFrom: 1080,
      },
    },
  ],
  objects: [
    {
      id: 'grandma-house',
      kind: 'painted-hotspot',
      draw: false,
      name: '外婆家',
      x: 58,
      y: 320,
      w: 340,
      h: 192,
      collision: [{ x: 58, y: 328, w: 322, h: 150 }],
      interact: {
        name: '屋门',
        rect: { x: 58, y: 320, w: 340, h: 192 },
        stand: { x: 294, y: 590 },
        action: { type: 'sleep', label: '睡觉' },
        lines: ['【外婆家】', '老屋和院子保留为手绘底图，门口只是数据层交互点。', '进入屋内、去县城这种远距离行为，才切换新地图。'],
      },
    },
    {
      id: 'painted-coop',
      kind: 'painted-hotspot',
      draw: false,
      name: '鸡圈',
      x: 36,
      y: 518,
      w: 220,
      h: 172,
      collision: [{ x: 42, y: 530, w: 190, h: 104 }],
      interact: {
        name: '鸡圈',
        rect: { x: 36, y: 518, w: 220, h: 172 },
        stand: { x: 202, y: 724 },
        lines: ['【鸡圈】', '这次不再额外盖一个像素鸡舍，而是直接使用手绘地图里的鸡圈。', '鸡圈的可走范围、碰撞和交互点都在数据层里。'],
      },
    },
    {
      id: 'home-field',
      kind: 'painted-hotspot',
      draw: false,
      name: '菜地',
      x: 318,
      y: 610,
      w: 392,
      h: 178,
      collision: [{ x: 330, y: 620, w: 366, h: 158 }],
      interact: {
        name: '菜地',
        rect: { x: 318, y: 610, w: 392, h: 178 },
        stand: { x: 520, y: 820 },
        lines: ['【菜畦】', '菜地仍然是背景中的手绘地块。', '正式种植层会用同画风的小作物覆盖，而不是低清瓦片。'],
      },
    },
    {
      id: 'home-pond',
      kind: 'painted-hotspot',
      draw: false,
      name: '池塘',
      x: 456,
      y: 490,
      w: 248,
      h: 132,
      collision: [{ x: 456, y: 490, w: 248, h: 132 }],
      interact: {
        name: '池塘',
        rect: { x: 456, y: 490, w: 248, h: 132 },
        stand: { x: 600, y: 652 },
        lines: ['【池塘】', '水面细节来自底图，只叠加轻微动态水波。', '钓鱼、养鸭等玩法以后挂在这个数据区域上。'],
      },
    },
    {
      id: 'workshop',
      kind: 'painted-hotspot',
      draw: false,
      name: '作坊',
      x: 766,
      y: 372,
      w: 310,
      h: 176,
      collision: [{ x: 788, y: 394, w: 264, h: 122 }],
      interact: {
        name: '作坊',
        rect: { x: 766, y: 372, w: 310, h: 176 },
        stand: { x: 930, y: 560 },
        lines: ['【加工小作坊】', '作坊属于同一张村子手绘主地图。', '以后加工、订单和 NPC 作息都从数据层接入。'],
      },
    },
  ],
  entities: [],
  portals: [
    {
      id: 'to-county-road',
      name: '去县城',
      rect: { x: 1340, y: 214, w: 180, h: 142 },
      stand: { x: 1390, y: 374 },
      lines: ['【村口大路】', '再往外才是去县城的路。', '这种距离才应该打开新的地图关卡。'],
    },
  ],
  effects: {
    petals: { x: 520, y: 70, w: 860, h: 700, resetLeft: 420, resetBelow: 860 },
    water: [
      { x: 456, y: 490, w: 248, h: 132 },
      { x: 1220, y: 560, w: 250, h: 360 },
    ],
  },
  dialogue: {
    intro: [
      '哎哟，回来啦！外婆盼你好些天咯。',
      '这版先按新规则走：手绘大地图不拆低清瓦片，路、鸡圈、菜地都用数据层管。',
      '你先在小满村里走一圈，看看主角和鸡圈是不是更像同一张画里的东西。',
    ],
  },
};
