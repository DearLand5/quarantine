// Глава 3: «десятый этаж» девятиэтажного дома. Копия шестого этажа, но неправильная: все двери — 47,
// за окном — белая пустота, свет холодный. Вынесен в отдельную часть мира (z ≈ 86..94), level 'f10'.
const Z = 89;          // северная стена коридора
const ZS = 91;         // южная стена коридора

const darkHall = (id, x) => ({
  id, name: 'Тёмная прихожая', x0: x - 1, x1: x + 1, z0: ZS + 0.14, z1: ZS + 2.4, h: 2.55, level: 'f10',
  floor: 'floor_lino', ceiling: 'ceiling', wall: 'wall_denis', surface: 'lino', glimpse: true, signal: 2,
  openings: [{ side: 'n', at: x, w: 0.9, h: 2.05, door: `d10s${id.slice(-1)}` }],
});

export const FLOOR10_ROOMS = [
  {
    id: 'corridor10', name: 'Коридор 10 этажа', x0: -11, x1: 11, z0: Z, z1: ZS, h: 2.6, level: 'f10',
    floor: 'floor_corridor', ceiling: 'wall_whitewash', wall: 'wall_whitewash', wainscot: { h: 1.5, mat: 'wall_paint_green' },
    surface: 'tile', ambient: 'corridor', signal: 2,
    openings: [
      { side: 'n', at: -8, w: 0.9, h: 2.05, door: 'd10n1' },
      { side: 'n', at: -4, w: 0.9, h: 2.05, door: 'd10n2' },
      { side: 'n', at: 0, w: 0.9, h: 2.05, door: 'd10n3' },
      { side: 's', at: -8, w: 0.9, h: 2.05, door: 'd10s1' },
      { side: 's', at: -4, w: 0.9, h: 2.05, door: 'd10s2' },
      { side: 's', at: 0, w: 0.9, h: 2.05, door: 'd10s3' },
      { side: 's', at: 4, w: 0.9, h: 2.05, door: 'd10s4' },
      { side: 's', at: 8, w: 0.9, h: 2.05, door: 'd10s5' },
      { side: 'e', at: 90, w: 1.2, h: 2.1, open: true },
      { side: 'w', at: 90, w: 1.2, h: 1.3, sill: 0.9, window: 'win10' },
    ],
  },
  // «Моя» прихожая — точная копия, дверь открыта
  {
    id: 'replica47', name: 'Прихожая 47', x0: -1.2, x1: 1.2, z0: Z - 3.46, z1: Z - 0.14, h: 2.55, level: 'f10',
    floor: 'floor_lino', ceiling: 'ceiling', wall: 'wall_hall', surface: 'lino', glimpse: true, signal: 2,
    openings: [{ side: 's', at: 0, w: 0.9, h: 2.05, door: 'd10n3' }],
  },
  darkHall('dark10_1', -8),
  darkHall('dark10_2', -4),
  darkHall('dark10_3', 0),
  {
    id: 'landing10', name: 'Лестница, 10 этаж', x0: 11.14, x1: 15.4, z0: 87.4, z1: 92.6, h: 2.7, level: 'f10',
    floor: 'floor_concrete', ceiling: 'wall_whitewash', wall: 'wall_whitewash', wainscot: { h: 1.5, mat: 'wall_paint_green' },
    floorRects: [{ x0: 11.14, x1: 12.9, z0: 87.4, z1: 92.6 }],
    surface: 'concrete', ambient: 'stair', signal: 2,
    openings: [{ side: 'w', at: 90, w: 1.2, h: 2.1, open: true }],
  },
];

export const FLOOR10_DOORS = [
  { id: 'd10n1', x: -8, z: Z - 0.07, axis: 'x', w: 0.9, h: 2.05, style: 'door_leather', number: '47', openDir: +1, hinge: -1, initial: { locked: true } },
  { id: 'd10n2', x: -4, z: Z - 0.07, axis: 'x', w: 0.9, h: 2.05, style: 'door_metal', number: '47', openDir: +1, hinge: -1, initial: { locked: true } },
  { id: 'd10n3', x: 0, z: Z - 0.07, axis: 'x', w: 0.9, h: 2.05, style: 'door_metal', number: '47', openDir: +1, hinge: +1, initial: { locked: false, open: true } },
  { id: 'd10s1', x: -8, z: ZS + 0.07, axis: 'x', w: 0.9, h: 2.05, style: 'door_leather', number: '47', openDir: -1, hinge: +1, initial: { locked: true } },
  { id: 'd10s2', x: -4, z: ZS + 0.07, axis: 'x', w: 0.9, h: 2.05, style: 'door_metal', number: '47', openDir: -1, hinge: -1, initial: { locked: true } },
  { id: 'd10s3', x: 0, z: ZS + 0.07, axis: 'x', w: 0.9, h: 2.05, style: 'door_leather', number: '47', openDir: -1, hinge: +1, initial: { locked: true } },
  { id: 'd10s4', x: 4, z: ZS + 0.07, axis: 'x', w: 0.9, h: 2.05, style: 'door_metal', number: '47', openDir: -1, hinge: +1, initial: { locked: true } },
  { id: 'd10s5', x: 8, z: ZS + 0.07, axis: 'x', w: 0.9, h: 2.05, style: 'door_painted', number: '52', openDir: -1, hinge: -1, initial: { locked: true } },
];

export const FLOOR10_FIXTURES = [
  { id: 'L_10a', room: 'corridor10', x: -9, y: 2.52, z: 90, type: 'plafond', color: 0xc9d8ff, intensity: 2.4, range: 6, circuit: 'f10', on: true, flicker: 'slight' },
  { id: 'L_10b', room: 'corridor10', x: -4.5, y: 2.52, z: 90, type: 'plafond', color: 0xc9d8ff, intensity: 2.4, range: 6, circuit: 'f10', on: true },
  { id: 'L_10c', room: 'corridor10', x: 0, y: 2.52, z: 90, type: 'plafond', color: 0xc9d8ff, intensity: 2.6, range: 6, circuit: 'f10', on: true, flicker: 'bad' },
  { id: 'L_10d', room: 'corridor10', x: 4.5, y: 2.52, z: 90, type: 'plafond', color: 0xc9d8ff, intensity: 2.4, range: 6, circuit: 'f10', on: true },
  { id: 'L_10e', room: 'corridor10', x: 9, y: 2.52, z: 90, type: 'plafond', color: 0xc9d8ff, intensity: 2.2, range: 6, circuit: 'f10', on: true, flicker: 'slight' },
  { id: 'L_10f', room: 'landing10', x: 12.0, y: 2.55, z: 90, type: 'bulb', color: 0xdde6ff, intensity: 2.2, range: 6, circuit: 'f10', on: true },
  { id: 'L_10r', room: 'replica47', x: 0, y: 2.45, z: Z - 1.8, type: 'bulb', color: 0xffd6a0, intensity: 2.2, range: 4, circuit: 'f10', on: true, glimpse: 'd10n3' },
];

const evacSheet = { lines: ['#ВНИМАНИЕ!', 'Вывод жителей', '10 этажа — 09:00.', 'Ждите у дверей.', 'Откройте на «СВОИ».'], opts: { w: 256, h: 320, bg: '#efe8d4', titleColor: '#a02a1e', size: 22, titleSize: 30 }, w: 0.3, h: 0.38, x: -0.35, y: 1.17 };
const listSheet = { lines: ['#СПИСОК', 'кв. 47 — Ермаков К.А.', 'кв. 47 — Ермаков К.А.', 'кв. 47 — Ермаков К.А.', 'кв. 47 — Гончар Е.'], opts: { w: 256, h: 300, bg: '#ddd3b8', size: 18, titleSize: 22 }, w: 0.3, h: 0.35, x: 0.05, y: 1.22, dz: 0.002 };

export const FLOOR10_FURNISHING = [
  // Коридор
  ...[-8, -4, 0, 4, 8].map((x) => ({ prop: 'doormat', room: 'corridor10', x, z: ZS - 0.28, rot: 0, opts: { mat: x === 0 ? 'fabric' : 'rubber' } })),
  ...[-8, -4].map((x) => ({ prop: 'doormat', room: 'corridor10', x, z: Z + 0.28, rot: 0 })),
  { prop: 'doormat', room: 'corridor10', x: 0, z: Z + 0.28, rot: 0 },
  { prop: 'shoes', room: 'corridor10', x: -0.6, z: ZS - 0.22, rot: 0.3, opts: { mat: 'fabric_red', scale: 0.9 } },
  { prop: 'notice_board', room: 'corridor10', x: 3.5, z: Z + 0.015, rot: 0, hit: { id: 'c3_notice', size: [1.2, 0.8, 0.2], offset: [0, 1.15, 0.05] }, opts: { sheets: [evacSheet, listSheet] } },
  { prop: 'radiator', room: 'corridor10', x: -10.93, z: 90, rot: Math.PI / 2 },
  { prop: 'fog_window', room: 'corridor10', x: -11.32, z: 90, rot: Math.PI / 2 },
  { hitOnly: true, room: 'corridor10', x: -11, y: 0.9, z: 90, hit: { id: 'c3_window', size: [0.3, 1.3, 1.2] } },
  { prop: 'army_gear', room: 'corridor10', x: 9.6, z: 89.6, rot: 0.4, hit: { id: 'c3_radio', size: [0.7, 0.5, 0.7] } },
  { prop: 'elevator', room: 'corridor10', x: 6.1, z: Z + 0.05, rot: 0, opts: { label: '10' } },
  // «Моя» прихожая
  { prop: 'coatrack', room: 'replica47', x: -1.18, z: Z - 2.3, rot: Math.PI / 2, opts: { coats: ['cloth_dark', 'fabric'] } },
  { prop: 'shoe_cabinet', room: 'replica47', x: -1.02, z: Z - 2.95, rot: Math.PI / 2 },
  { prop: 'mirror', room: 'replica47', x: -1.19, y: 1.25, z: Z - 2.95, rot: Math.PI / 2, opts: { w: 0.45, h: 0.6 } },
  { prop: 'shoes', room: 'replica47', x: 0.6, z: Z - 0.5, rot: 0.3 },
  { hitOnly: true, room: 'corridor10', x: 0, y: 0.4, z: Z + 0.05, hit: { id: 'c3_replica', size: [0.9, 1.6, 0.25] } },
  // Лестница вниз
  { prop: 'stair_down10', room: 'landing10', x: 12.9, z: 90, rot: 0, hit: { id: 'c3_stairs_down', size: [0.5, 1.4, 2.4], offset: [0.15, 0, 0] } },
  { prop: 'picture', room: 'landing10', x: 11.16, z: 88.2, rot: Math.PI / 2, opts: { w: 0.5, h: 0.32, y: 1.55, mat: { lines: ['10'], opts: { w: 256, h: 160, bg: '#3c5446', fg: '#d8d4c6', size: 110, pad: 14, aged: true } } } },
];
