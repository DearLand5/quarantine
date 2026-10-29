// Расстановка предметов. rot — поворот вокруг Y (кратно π/2): 0 — «лицом» на юг (+Z), π — на север,
// π/2 — на восток (+X), -π/2 — на запад. y — высота основания (для предметов на столах/стенах).
// hit — интерактивная зона: id обработчика из data/interactions.js и размер [w, h, d] + смещение [x, y, z].
const N = Math.PI, E = Math.PI / 2, W = -Math.PI / 2;

const childDrawing = { lines: ['#МАМА СОНЯ', '', '   ☀   ⌂', '', '    и дядя', '  из стены'], opts: { w: 256, h: 320, bg: '#f0ead8', fg: '#2a4a8a', titleColor: '#b03a2e', size: 26, titleSize: 30, font: 'Comic Sans MS, cursive' } };

export const FURNISHING = [
  // ================= Квартира 47: комната =================
  { prop: 'bed', room: 'room47', x: -4.5, z: -7.3, rot: 0, hit: { id: 'bed47', size: [0.95, 0.7, 2.0] } },
  { prop: 'wall_carpet', room: 'room47', x: -4.99, z: -7.2, rot: E, opts: { w: 1.9, h: 1.3, y: 1.45 } },
  { prop: 'desk', room: 'room47', x: -0.45, z: -8.05, rot: 0 },
  { prop: 'laptop', room: 'room47', x: -0.3, y: 0.755, z: -8.05, rot: 0, name: 'laptop47', hit: { id: 'laptop', size: [0.4, 0.3, 0.35] } },
  { prop: 'desklamp', room: 'room47', x: -0.85, y: 0.755, z: -8.15, rot: 0, name: 'desklamp47', hit: { id: 'sw_desk47', size: [0.25, 0.5, 0.25] } },
  { prop: 'chair', room: 'room47', x: -0.45, z: -7.4, rot: N },
  { hitOnly: true, room: 'room47', x: 0.05, y: 0.75, z: -7.95, hit: { id: 'charger', size: [0.2, 0.15, 0.2] } },
  { prop: 'wardrobe', room: 'room47', x: 0.9, z: -7.55, rot: W, opts: { w: 1.1 } },
  { prop: 'wallunit', room: 'room47', x: -2.6, z: -4.97, rot: N },
  { prop: 'picture', room: 'room47', x: -2.2, y: 0.42, z: -5.05, rot: N, opts: { w: 0.18, h: 0.24, y: 1.55, mat: 'photo_mom' }, hit: { id: 'photo_mom', size: [0.3, 0.35, 0.2], offset: [0, 1.95, 0] } },
  { prop: 'crt_tv', room: 'room47', x: -4.6, z: -5.3, rot: E, name: 'tv47' },
  { prop: 'bookshelf', room: 'room47', x: 0.95, z: -5.35, rot: W },
  { prop: 'armchair', room: 'room47', x: -1.0, z: -5.95, rot: W },
  { prop: 'floor_rug', room: 'room47', x: -2.3, z: -6.6, rot: 0, opts: { w: 2.2, d: 1.5 } },
  { prop: 'radiator', room: 'room47', x: -2.2, z: -8.32, rot: 0, opts: { n: 10 } },
  { prop: 'plant', room: 'room47', x: -3.35, z: -8.1, rot: 0 },
  { hitOnly: true, room: 'room47', x: -2.2, y: 0.8, z: -8.4, hit: { id: 'window_room', size: [1.5, 1.5, 0.3] } },
  { hitOnly: true, room: 'room47', x: -1.1, y: 1.2, z: -4.75, hit: { id: 'sw_room47', size: [0.25, 0.3, 0.12] } },

  // ================= Квартира 47: прихожая =================
  { prop: 'coatrack', room: 'hall47', x: -1.18, z: -2.3, rot: E, opts: { coats: ['cloth_dark', 'fabric'] } },
  { prop: 'shoe_cabinet', room: 'hall47', x: -1.02, z: -3.75, rot: E, hit: { id: 'shoe_cabinet', size: [0.4, 0.9, 0.85] } },
  { prop: 'mirror', room: 'hall47', x: -1.19, y: 1.25, z: -3.75, rot: E, opts: { w: 0.45, h: 0.6 } },
  { hitOnly: true, room: 'hall47', x: -0.98, y: 0.86, z: -3.45, hit: { id: 'receipt', size: [0.25, 0.1, 0.25] } },
  { prop: 'doormat', room: 'hall47', x: 0, z: -1.5, rot: 0 },
  { prop: 'shoes', room: 'hall47', x: 0.7, z: -1.45, rot: 0.3 },
  { prop: 'shoes', room: 'hall47', x: 0.85, z: -1.85, rot: -0.4, opts: { mat: 'cardboard' } },
  { hitOnly: true, room: 'hall47', x: 0.62, y: 1.2, z: -1.16, hit: { id: 'sw_hall47', size: [0.25, 0.3, 0.12] } },
  { hitOnly: true, room: 'hall47', x: 1.18, y: 1.2, z: -2.65, hit: { id: 'sw_bath47', size: [0.12, 0.3, 0.25] } },
  { hitOnly: true, room: 'hall47', x: 1.18, y: 1.2, z: -3.35, hit: { id: 'sw_kitchen47', size: [0.12, 0.3, 0.25] } },

  // ================= Квартира 47: ванная =================
  { prop: 'bathtub', room: 'bath47', x: 3.04, z: -2.07, rot: 0 },
  { prop: 'washbasin', room: 'bath47', x: 1.95, z: -2.78, rot: 0 },
  { prop: 'mirror', room: 'bath47', x: 1.95, y: 1.05, z: -2.99, rot: 0, opts: { w: 0.45, h: 0.55 }, hit: { id: 'mirror_bath', size: [0.5, 0.6, 0.3], offset: [0, 1.3, 0.1] } },
  { prop: 'washer', room: 'bath47', x: 2.2, z: -1.42, rot: N },

  // ================= Квартира 47: кухня =================
  { prop: 'fridge', room: 'kitchen47', x: 4.1, z: -4.15, rot: W, hit: { id: 'fridge', size: [0.62, 1.5, 0.62] } },
  { prop: 'radio', room: 'kitchen47', x: 4.1, y: 1.5, z: -4.15, rot: W, name: 'radio47', hit: { id: 'radio', size: [0.3, 0.3, 0.4] } },
  { prop: 'stove', room: 'kitchen47', x: 4.11, z: -5.05, rot: W },
  { prop: 'kettle', room: 'kitchen47', x: 4.05, y: 0.86, z: -5.15, rot: W, hit: { id: 'kettle', size: [0.3, 0.3, 0.3] } },
  { prop: 'kitchen_counter', room: 'kitchen47', x: 4.1, z: -6.0, rot: W, opts: { w: 1.2, sink: true, sinkX: -0.25 }, hit: { id: 'kitchen_drawer', size: [0.6, 0.85, 1.2] } },
  { prop: 'wall_cabinet', room: 'kitchen47', x: 4.24, y: 1.5, z: -5.6, rot: W, opts: { w: 1.6 } },
  { prop: 'table', room: 'kitchen47', x: 2.35, z: -6.9, rot: 0, opts: { w: 0.9, d: 0.7, cloth: 'plastic_beige' } },
  { prop: 'stool', room: 'kitchen47', x: 2.35, z: -6.2, rot: 0 },
  { prop: 'stool', room: 'kitchen47', x: 1.75, z: -7.2, rot: 0 },
  { prop: 'radiator', room: 'kitchen47', x: 2.9, z: -8.32, rot: 0, opts: { n: 8 } },
  { prop: 'plant', room: 'kitchen47', x: 3.35, y: 0.85, z: -8.25, rot: 0 },
  { hitOnly: true, room: 'kitchen47', x: 2.9, y: 0.85, z: -8.4, hit: { id: 'window_kitchen', size: [1.3, 1.4, 0.3] } },

  // ================= Квартира 45: Зинаида Павловна =================
  { prop: 'coatrack', room: 'hall45', x: -7.02, z: -2.4, rot: W, opts: { coats: ['fabric', 'cloth_dark', 'fabric_red'] } },
  { prop: 'shoes', room: 'hall45', x: -7.6, z: -1.5, rot: 0, opts: { mat: 'wood_dark' } },
  { prop: 'mirror', room: 'hall45', x: -8.99, y: 1.2, z: -2.3, rot: E, opts: { w: 0.4, h: 0.55 } },
  { prop: 'sofa', room: 'room45', x: -10.17, z: -5.6, rot: E, opts: { mat: 'fabric' } },
  { prop: 'wall_carpet', room: 'room45', x: -10.59, z: -5.6, rot: E, opts: { w: 2.0, h: 1.4, y: 1.4 } },
  { prop: 'table', room: 'room45', x: -8.6, z: -5.4, rot: 0, opts: { w: 1.0, d: 0.7, cloth: 'fabric_red' } },
  { prop: 'chair', room: 'room45', x: -8.6, z: -4.75, rot: N },
  { prop: 'sideboard', room: 'room45', x: -6.23, z: -5.6, rot: W },
  { hitOnly: true, room: 'room45', x: -6.3, y: 0.8, z: -6.0, hit: { id: 'zina_box', size: [0.4, 0.3, 0.4] } },
  { prop: 'icon_shelf', room: 'room45', x: -6.5, z: -7.33, rot: 0 },
  { prop: 'crt_tv', room: 'room45', x: -6.4, z: -4.2, rot: W, name: 'tv45' },
  { prop: 'wall_clock', room: 'room45', x: -9.6, z: -7.38, rot: 0, hit: { id: 'zina_clock', size: [0.4, 0.4, 0.2], offset: [0, 1.9, 0.1] } },
  { prop: 'picture', room: 'room45', x: -9.55, z: -7.38, rot: 0, opts: { w: 0.42, h: 0.3, y: 1.3, mat: 'photo_p17' }, hit: { id: 'zina_photo', size: [0.5, 0.4, 0.2], offset: [0, 1.45, 0.1] } },
  { prop: 'bookshelf', room: 'room45', x: -10.45, z: -4.2, rot: E, opts: { w: 0.8, h: 1.6 } },
  { prop: 'plant', room: 'room45', x: -7.0, z: -7.1, rot: 0 },
  { prop: 'plant', room: 'room45', x: -7.6, y: 0.8, z: -7.3, rot: 0 },
  { prop: 'floor_rug', room: 'room45', x: -8.3, z: -5.6, rot: 0, opts: { w: 2.4, d: 1.8 } },
  { prop: 'radiator', room: 'room45', x: -8.3, z: -7.32, rot: 0 },
  { hitOnly: true, room: 'room45', x: -8.3, y: 0.8, z: -7.4, hit: { id: 'window_zina', size: [1.4, 1.5, 0.3] } },

  // ================= Прихожие соседей =================
  { prop: 'coatrack', room: 'hall48', x: -8.98, z: 2.4, rot: E, opts: { coats: ['fabric_red', 'fabric'] } },
  { prop: 'shoes', room: 'hall48', x: -7.5, z: 1.6, rot: 0.2, opts: { mat: 'fabric_red', scale: 0.65 } },
  { prop: 'picture', room: 'hall48', x: -8.0, z: 3.38, rot: N, opts: { w: 0.3, h: 0.38, y: 1.2, mat: childDrawing } },
  { prop: 'boxes', room: 'hall49', x: -4.55, z: 2.9, rot: 0, opts: { n: 4 } },
  { prop: 'led_strip', room: 'hall49', x: -4, z: 3.37, rot: N, opts: { w: 1.9, y: 2.35 } },
  { prop: 'picture', room: 'hall49', x: -3.02, z: 2.3, rot: W, opts: { w: 0.5, h: 0.7, y: 1.1, mat: { lines: ['#PING 999', '', 'connection', 'lost'], opts: { w: 256, h: 360, bg: '#151515', fg: '#9a5cff', titleColor: '#e0e0e0', size: 30 } } } },
  { prop: 'shoes', room: 'hall49', x: -3.5, z: 1.6, rot: -0.3, opts: { mat: 'plastic_white' } },
  { prop: 'water_stack', room: 'hall51', x: 4.3, z: 3.15, rot: N, hit: { id: 'gena_water', size: [0.8, 1.0, 0.4], glimpse: 'd51' } },
  { prop: 'coatrack', room: 'hall51', x: 3.02, z: 2.4, rot: E, opts: { coats: ['plant', 'cloth_dark'] } },
  { prop: 'crowbar', room: 'hall51', x: 4.85, z: 2.5, rot: 0 },

  // ================= Коридор =================
  { prop: 'doormat', room: 'corridor', x: -8, z: -0.72, rot: 0, opts: { mat: 'fabric_red' } },
  { prop: 'doormat', room: 'corridor', x: 0, z: -0.72, rot: 0 },
  { prop: 'doormat', room: 'corridor', x: -8, z: 0.72, rot: 0, opts: { mat: 'fabric' } },
  { prop: 'doormat', room: 'corridor', x: -4, z: 0.72, rot: 0 },
  { prop: 'doormat', room: 'corridor', x: 4, z: 0.72, rot: 0 },
  { prop: 'shoes', room: 'corridor', x: -8.55, z: 0.82, rot: 0.2, opts: { mat: 'fabric_red', scale: 0.65 } },
  { prop: 'boxes', room: 'corridor', x: -3.25, z: 0.72, rot: 0, opts: { n: 2 } },
  { prop: 'trash_bags', room: 'corridor', x: 4.9, z: 0.72, rot: 0 },
  { prop: 'electric_panel', room: 'corridor', x: 2.0, z: -0.92, rot: 0, name: 'panel', hit: { id: 'panel', size: [0.7, 1.0, 0.3], offset: [0, 1.05, 0.05] } },
  {
    prop: 'notice_board', room: 'corridor', x: 3.5, z: -0.985, rot: 0, hit: { id: 'notice_board', size: [1.2, 0.8, 0.2], offset: [0, 1.15, 0.05] },
    opts: {
      sheets: [
        { lines: ['#ВНИМАНИЕ!', 'Режим ограничения', 'передвижения.', 'Не покидайте', 'квартиры.', 'Штаб ГОЧС'], opts: { w: 256, h: 320, bg: '#efe8d4', titleColor: '#a02a1e', size: 22, titleSize: 30 }, w: 0.3, h: 0.38, x: -0.35, y: 1.17 },
        { lines: ['#УК «Тополь-Сервис»', 'Кв. 52 опечатана', 'по решению суда.', 'Вскрытие запрещено.', '14.03.2021'], opts: { w: 256, h: 300, bg: '#ddd3b8', size: 20, titleSize: 22 }, w: 0.3, h: 0.35, x: 0.05, y: 1.22, dz: 0.002 },
        { lines: ['Сдам гараж', 'ГСК «Мотор»', 'недорого', '8-9••-•••-41-17'], opts: { w: 256, h: 256, bg: '#f2f0e8', size: 24 }, w: 0.22, h: 0.22, x: 0.38, y: 1.3, dz: 0.004 },
      ],
    },
  },
  { prop: 'fire_cabinet', room: 'corridor', x: -10.0, z: 0.9, rot: N },
  { prop: 'cctv', room: 'corridor', x: 10.75, y: 2.5, z: -0.8, rot: W, name: 'cctv', hit: { id: 'cctv', size: [0.3, 0.3, 0.3], offset: [0, -0.15, 0] } },
  { prop: 'radiator', room: 'corridor', x: -10.93, z: 0, rot: E },
  { hitOnly: true, room: 'corridor', x: -11, y: 0.9, z: 0, hit: { id: 'window_corridor', size: [0.3, 1.3, 1.2] } },
  { hitOnly: true, room: 'corridor', x: 0, y: 1.0, z: 1.02, hit: { id: 'door50_listen', size: [0.9, 1.6, 0.25] } },

  // ================= Лифтовый холл =================
  { prop: 'elevator', room: 'lifthall', x: 5.45, z: -3.36, rot: 0, name: 'lift_a' },
  { prop: 'elevator', room: 'lifthall', x: 6.75, z: -3.36, rot: 0, name: 'lift_b' },
  { prop: 'lift_button', room: 'lifthall', x: 6.1, z: -3.38, rot: 0, name: 'lift_btn', hit: { id: 'lift_button', size: [0.2, 0.3, 0.2], offset: [0, 1.15, 0.05] } },
  { prop: 'picture', room: 'lifthall', x: 7.38, z: -2.3, rot: W, opts: { w: 0.42, h: 0.3, y: 1.4, mat: { lines: ['#ЛИФТ НЕ РАБОТАЕТ', 'отключён по распоряжению', 'штаба ГОЧС'], opts: { w: 384, h: 256, bg: '#e8e2cc', titleColor: '#a02a1e', size: 22, titleSize: 30 } } } },

  // ================= Лестничная клетка =================
  { prop: 'stairs', room: 'stair', x: 13.0, z: 0, rot: 0 },
  { hitOnly: true, room: 'stair', x: 13.35, y: 0.2, z: -1.35, hit: { id: 'grate_up', size: [0.3, 2.0, 2.3] } },
  { hitOnly: true, room: 'stair', x: 13.6, y: 0.0, z: 1.35, hit: { id: 'barrier_down', size: [0.4, 1.6, 2.3] } },
  { prop: 'trash_chute', room: 'stair', x: 11.6, z: -2.35, rot: 0, hit: { id: 'trash_chute', size: [0.5, 1.2, 0.5], offset: [0, 0.4, 0.1] } },
  { prop: 'stair_window_stuff', room: 'stair', x: 11.45, z: 2.35, rot: 0 },
  { hitOnly: true, room: 'stair', x: 15.6, y: 1.6, z: -1.3, hit: { id: 'window_stair', size: [0.4, 1.2, 1.2] } },
];
