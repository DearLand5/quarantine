// Планировка шестого этажа дома №14 по ул. Тополиной (подъезд 2).
// Система координат: X — на восток, Z — на юг (север = -Z), Y — вверх. Единица — метр.
// Комнаты описываются внутренними прямоугольниками; между соседними комнатами — зазор-стена 0.14 м.
// Проёмы задаются на сторонах комнат: n/s (координата x), e/w (координата z).

export const FLOOR_LABEL = '6 этаж';

export const ROOMS = [
  {
    id: 'corridor', name: 'Коридор 6 этажа', x0: -11, x1: 11, z0: -1, z1: 1, h: 2.6,
    floor: 'floor_corridor', ceiling: 'wall_whitewash', wall: 'wall_whitewash', wainscot: { h: 1.5, mat: 'wall_paint_green' },
    surface: 'tile', ambient: 'corridor', signal: 2,
    openings: [
      { side: 'n', at: -8, w: 0.9, h: 2.05, door: 'd45' },
      { side: 'n', at: -4, w: 0.9, h: 2.05, door: 'd46' },
      { side: 'n', at: 0, w: 0.9, h: 2.05, door: 'd47' },
      { side: 'n', at: 6.1, w: 2.6, h: 2.35, open: true },
      { side: 's', at: -8, w: 0.9, h: 2.05, door: 'd48' },
      { side: 's', at: -4, w: 0.9, h: 2.05, door: 'd49' },
      { side: 's', at: 0, w: 0.9, h: 2.05, door: 'd50' },
      { side: 's', at: 4, w: 0.9, h: 2.05, door: 'd51' },
      { side: 's', at: 8, w: 0.9, h: 2.05, door: 'd52' },
      { side: 'e', at: 0, w: 1.2, h: 2.1, door: 'dStair' },
      { side: 'w', at: 0, w: 1.2, h: 1.3, sill: 0.9, window: 'win_corridor' },
    ],
  },
  {
    id: 'lifthall', name: 'Лифтовый холл', x0: 4.8, x1: 7.4, z0: -3.4, z1: -1.14, h: 2.6,
    floor: 'floor_corridor', ceiling: 'wall_whitewash', wall: 'wall_whitewash', wainscot: { h: 1.5, mat: 'wall_paint_green' },
    surface: 'tile', ambient: 'corridor', signal: 1,
    openings: [{ side: 's', at: 6.1, w: 2.6, h: 2.35, open: true }],
  },
  {
    id: 'stair', name: 'Лестничная клетка', x0: 11.14, x1: 15.6, z0: -2.6, z1: 2.6, h: 3.4,
    floor: 'floor_concrete', ceiling: 'wall_whitewash', wall: 'wall_whitewash', wainscot: { h: 1.5, mat: 'wall_paint_green' },
    floorRects: [{ x0: 11.14, x1: 13.0, z0: -2.6, z1: 2.6 }],
    surface: 'concrete', ambient: 'stair', signal: 3,
    openings: [
      { side: 'w', at: 0, w: 1.2, h: 2.1, door: 'dStair' },
      { side: 'e', at: -1.3, w: 1.2, h: 1.2, sill: 1.6, window: 'win_stair' },
    ],
  },
  // ---------- Квартира 47 (игрок) ----------
  {
    id: 'hall47', name: 'Прихожая', x0: -1.2, x1: 1.2, z0: -4.6, z1: -1.14, h: 2.55,
    floor: 'floor_lino', ceiling: 'ceiling', wall: 'wall_hall', surface: 'lino', ambient: 'home', signal: 1, apartment: '47', safe: true,
    openings: [
      { side: 's', at: 0, w: 0.9, h: 2.05, door: 'd47' },
      { side: 'e', at: -2.1, w: 0.7, h: 2.0, door: 'd47bath' },
      { side: 'e', at: -3.9, w: 0.8, h: 2.05, open: true },
      { side: 'n', at: 0, w: 0.8, h: 2.05, door: 'd47room' },
    ],
  },
  {
    id: 'bath47', name: 'Ванная', x0: 1.34, x1: 3.4, z0: -3.0, z1: -1.14, h: 2.5,
    floor: 'floor_bath', ceiling: 'ceiling', wall: 'wall_bath', surface: 'tile', ambient: 'home', signal: 0, apartment: '47', safe: true,
    openings: [{ side: 'w', at: -2.1, w: 0.7, h: 2.0, door: 'd47bath' }],
  },
  {
    id: 'kitchen47', name: 'Кухня', x0: 1.34, x1: 4.4, z0: -8.4, z1: -3.14, h: 2.55,
    floor: 'floor_lino', ceiling: 'ceiling', wall: 'wall_kitchen_up', wainscot: { h: 1.45, mat: 'wall_kitchen_low' },
    surface: 'lino', ambient: 'home', signal: 2, apartment: '47', safe: true,
    openings: [
      { side: 'w', at: -3.9, w: 0.8, h: 2.05, open: true },
      { side: 'n', at: 2.9, w: 1.3, h: 1.4, sill: 0.85, window: 'win_kitchen' },
    ],
  },
  {
    id: 'room47', name: 'Комната', x0: -5.0, x1: 1.2, z0: -8.4, z1: -4.74, h: 2.55,
    floor: 'floor_parquet', ceiling: 'ceiling', wall: 'wall_room', surface: 'wood', ambient: 'home', signal: 3, apartment: '47', safe: true,
    openings: [
      { side: 's', at: 0, w: 0.8, h: 2.05, door: 'd47room' },
      { side: 'n', at: -2.2, w: 1.5, h: 1.5, sill: 0.8, window: 'win_room' },
    ],
  },
  // ---------- Квартира 45 (Зинаида Павловна) ----------
  {
    id: 'hall45', name: 'Прихожая Зинаиды Павловны', x0: -9.0, x1: -7.0, z0: -3.6, z1: -1.14, h: 2.55,
    floor: 'floor_lino', ceiling: 'ceiling', wall: 'wall_zina', surface: 'lino', ambient: 'neighbor', signal: 1, apartment: '45',
    openings: [
      { side: 's', at: -8, w: 0.9, h: 2.05, door: 'd45' },
      { side: 'n', at: -8, w: 0.8, h: 2.05, open: true },
    ],
  },
  {
    id: 'room45', name: 'Комната Зинаиды Павловны', x0: -10.6, x1: -6.0, z0: -7.4, z1: -3.74, h: 2.55,
    floor: 'floor_parquet', ceiling: 'ceiling', wall: 'wall_zina', surface: 'wood', ambient: 'neighbor', signal: 2, apartment: '45',
    openings: [
      { side: 's', at: -8, w: 0.8, h: 2.05, open: true },
      { side: 'n', at: -8.3, w: 1.4, h: 1.5, sill: 0.8, window: 'win_zina' },
    ],
  },
  // ---------- Прихожие соседей (видны из открытой двери) ----------
  {
    id: 'hall48', name: 'Прихожая Ковалёвых', x0: -9.0, x1: -7.0, z0: 1.14, z1: 3.4, h: 2.55,
    floor: 'floor_lino', ceiling: 'ceiling', wall: 'wall_marina', surface: 'lino', apartment: '48', glimpse: true,
    openings: [{ side: 'n', at: -8, w: 0.9, h: 2.05, door: 'd48' }],
  },
  {
    id: 'hall49', name: 'Прихожая Дениса', x0: -5.0, x1: -3.0, z0: 1.14, z1: 3.4, h: 2.55,
    floor: 'floor_lino', ceiling: 'ceiling', wall: 'wall_denis', surface: 'lino', apartment: '49', glimpse: true,
    openings: [{ side: 'n', at: -4, w: 0.9, h: 2.05, door: 'd49' }],
  },
  {
    id: 'hall51', name: 'Прихожая Лапина', x0: 3.0, x1: 5.0, z0: 1.14, z1: 3.4, h: 2.55,
    floor: 'floor_lino', ceiling: 'ceiling', wall: 'wall_gena', surface: 'lino', apartment: '51', glimpse: true,
    openings: [{ side: 'n', at: 4, w: 0.9, h: 2.05, door: 'd51' }],
  },
];

// Двери. axis — вдоль какой оси лежит полотно; openDir — в какую сторону по нормали открывается (+1/-1).
export const DOORS = [
  { id: 'd45', x: -8, z: -1.07, axis: 'x', w: 0.9, h: 2.05, style: 'door_leather', number: '45', openDir: +1, hinge: -1, initial: { locked: true } },
  { id: 'd46', x: -4, z: -1.07, axis: 'x', w: 0.9, h: 2.05, style: 'door_metal', number: '46', openDir: +1, hinge: -1, initial: { locked: true } },
  { id: 'd47', x: 0, z: -1.07, axis: 'x', w: 0.9, h: 2.05, style: 'door_metal', number: '47', openDir: +1, hinge: +1, peephole: true, initial: { locked: true, chained: true } },
  { id: 'd48', x: -8, z: 1.07, axis: 'x', w: 0.9, h: 2.05, style: 'door_leather', number: '48', openDir: -1, hinge: +1, peephole: true, initial: { locked: true, chained: true } },
  { id: 'd49', x: -4, z: 1.07, axis: 'x', w: 0.9, h: 2.05, style: 'door_metal', number: '49', openDir: -1, hinge: -1, peephole: true, cameraEye: true, initial: { locked: true } },
  { id: 'd50', x: 0, z: 1.07, axis: 'x', w: 0.9, h: 2.05, style: 'door_leather', number: '50', openDir: -1, hinge: +1, initial: { locked: true } },
  { id: 'd51', x: 4, z: 1.07, axis: 'x', w: 0.9, h: 2.05, style: 'door_metal', number: '51', openDir: -1, hinge: +1, peephole: true, initial: { locked: true } },
  { id: 'd52', x: 8, z: 1.07, axis: 'x', w: 0.9, h: 2.05, style: 'door_painted', number: '52', openDir: -1, hinge: -1, initial: { locked: true, sealed: true } },
  { id: 'dStair', x: 11.07, z: 0, axis: 'z', w: 1.2, h: 2.1, style: 'stair', openDir: +1, hinge: -1, initial: { locked: false } },
  { id: 'd47bath', x: 1.27, z: -2.1, axis: 'z', w: 0.7, h: 2.0, style: 'door_painted', openDir: +1, hinge: +1, interior: true, initial: { locked: false, open: false } },
  { id: 'd47room', x: 0, z: -4.67, axis: 'x', w: 0.8, h: 2.05, style: 'door_painted', openDir: -1, hinge: -1, interior: true, initial: { locked: false, open: true } },
];

// Окна: что видно снаружи, задаётся в Exterior.js по направлению взгляда.
export const WINDOWS = {
  win_corridor: { facing: 'w' },
  win_stair: { facing: 'e' },
  win_kitchen: { facing: 'n' },
  win_room: { facing: 'n', curtains: true },
  win_zina: { facing: 'n', curtains: true },
};

// Светильники. circuit: apartment (кв. 47), corridor (этаж), neighbor (соседи), emergency (аварийный).
export const FIXTURES = [
  { id: 'L_room47', room: 'room47', x: -1.9, y: 2.42, z: -6.6, type: 'chandelier', color: 0xffd9a0, intensity: 5, range: 7, circuit: 'apartment', switch: 'sw_room47', on: true },
  { id: 'L_desk47', room: 'room47', x: -0.85, y: 1.15, z: -8.0, type: 'none', color: 0xffc27a, intensity: 2.2, range: 4, circuit: 'apartment', switch: 'sw_desk47', on: true },
  { id: 'L_hall47', room: 'hall47', x: 0, y: 2.45, z: -2.8, type: 'bulb', color: 0xffd6a0, intensity: 3, range: 5, circuit: 'apartment', switch: 'sw_hall47', on: true },
  { id: 'L_kitchen47', room: 'kitchen47', x: 2.85, y: 2.45, z: -5.8, type: 'plafond', color: 0xfff0d0, intensity: 4.5, range: 6.5, circuit: 'apartment', switch: 'sw_kitchen47', on: false },
  { id: 'L_bath47', room: 'bath47', x: 2.4, y: 2.4, z: -2.0, type: 'bulb', color: 0xfff4e0, intensity: 2.5, range: 4, circuit: 'apartment', switch: 'sw_bath47', on: false },
  { id: 'L_c1', room: 'corridor', x: -9, y: 2.52, z: 0, type: 'plafond', color: 0xe8e6c8, intensity: 3.2, range: 6, circuit: 'corridor', on: true, flicker: 'slight' },
  { id: 'L_c2', room: 'corridor', x: -5, y: 2.52, z: 0, type: 'plafond', color: 0xe8e6c8, intensity: 3.2, range: 6, circuit: 'corridor', on: true },
  { id: 'L_c3', room: 'corridor', x: -1, y: 2.52, z: 0, type: 'plafond', color: 0xe8e6c8, intensity: 3.2, range: 6, circuit: 'corridor', on: true },
  { id: 'L_c4', room: 'corridor', x: 3, y: 2.52, z: 0, type: 'plafond', color: 0xe8e6c8, intensity: 3.2, range: 6, circuit: 'corridor', on: true },
  { id: 'L_c5', room: 'corridor', x: 7.5, y: 2.52, z: 0, type: 'plafond', color: 0xd8e0c8, intensity: 3.0, range: 6, circuit: 'corridor', on: true, flicker: 'bad' },
  { id: 'L_lift', room: 'lifthall', x: 6.1, y: 2.52, z: -2.3, type: 'plafond', color: 0xe8e6c8, intensity: 2.6, range: 5, circuit: 'corridor', on: true },
  { id: 'L_stair', room: 'stair', x: 12.2, y: 3.3, z: 0, type: 'bulb', color: 0xffe2b0, intensity: 2.6, range: 7, circuit: 'corridor', on: true, flicker: 'slight' },
  { id: 'L_emerg', room: 'corridor', x: 10.7, y: 2.35, z: 0, type: 'emergency', color: 0xff3020, intensity: 1.6, range: 7, circuit: 'emergency', on: true },
  { id: 'L_zina', room: 'room45', x: -8.3, y: 2.38, z: -5.6, type: 'chandelier', color: 0xffc98a, intensity: 3.5, range: 6, circuit: 'neighbor', on: true },
  { id: 'L_zina_hall', room: 'hall45', x: -8, y: 2.45, z: -2.4, type: 'bulb', color: 0xffcf98, intensity: 2, range: 4, circuit: 'neighbor', on: true },
  { id: 'L_h48', room: 'hall48', x: -8, y: 2.45, z: 2.4, type: 'bulb', color: 0xffe0b8, intensity: 2, range: 4, circuit: 'neighbor', on: true, glimpse: 'd48' },
  { id: 'L_h49', room: 'hall49', x: -4, y: 2.2, z: 2.6, type: 'none', color: 0x9a5cff, intensity: 2.2, range: 4, circuit: 'neighbor', on: true, glimpse: 'd49' },
  { id: 'L_h51', room: 'hall51', x: 4, y: 2.45, z: 2.4, type: 'bulb', color: 0xffd090, intensity: 2, range: 4, circuit: 'neighbor', on: true, glimpse: 'd51' },
];

// Граф навигации NPC: узлы и рёбра. Узлы *_in находятся за дверью квартиры.
export const NAV_NODES = {
  c_m10: [-10.2, 0], c_m8: [-8, 0], c_m6: [-6, 0], c_m4: [-4, 0], c_m2: [-2, 0], c_0: [0, 0],
  c_2: [2, 0], c_4: [4, 0], c_6: [6.1, 0], c_8: [8, 0], c_10: [10.2, 0],
  f45: [-8, -0.5], f47: [0, -0.5], f48: [-8, 0.5], f49: [-4, 0.5], f51: [4, 0.5], f52: [8, 0.5],
  in45: [-8, -1.7], in48: [-8, 1.75], in49: [-4, 1.75], in51: [4, 1.75],
  zina_hall: [-8, -2.9], zina_room: [-8, -4.6], zina_chair: [-9.55, -6.15],
  lift: [6.1, -2.2], panel: [2.0, -0.45],
  stair_in: [11.8, 0], landing: [12.4, -1.2], landing_win: [12.6, 1.0],
};

export const NAV_EDGES = [
  ['c_m10', 'c_m8'], ['c_m8', 'c_m6'], ['c_m6', 'c_m4'], ['c_m4', 'c_m2'], ['c_m2', 'c_0'], ['c_0', 'c_2'],
  ['c_2', 'c_4'], ['c_4', 'c_6'], ['c_6', 'c_8'], ['c_8', 'c_10'],
  ['c_m8', 'f45'], ['c_0', 'f47'], ['c_m8', 'f48'], ['c_m4', 'f49'], ['c_4', 'f51'], ['c_8', 'f52'],
  ['f45', 'in45'], ['f48', 'in48'], ['f49', 'in49'], ['f51', 'in51'],
  ['in45', 'zina_hall'], ['zina_hall', 'zina_room'], ['zina_room', 'zina_chair'],
  ['c_6', 'lift'], ['c_2', 'panel'], ['c_10', 'stair_in'], ['stair_in', 'landing'], ['stair_in', 'landing_win'],
];

// Переходы через двери в графе навигации: ребро -> дверь, которую нужно открыть.
export const NAV_DOORS = { 'f45|in45': 'd45', 'f48|in48': 'd48', 'f49|in49': 'd49', 'f51|in51': 'd51', 'c_10|stair_in': 'dStair' };

// Зоны мобильной связи (дополнительно к значению signal комнаты).
export const START_POSITION = { x: -2.6, z: -6.4, yaw: -0.9 };
