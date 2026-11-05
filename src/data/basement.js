// Глава 2: кабина лифта, подвал и «Объект 17». Подвал вынесен в отдельную часть мира (южнее дома, z > 40):
// физика плоская, поэтому «спуск» на лифте — это поездка с затемнением и переносом игрока в такую же кабину внизу.
// level: 'b' — подвал, 'lab' — объект; RoomManager скрывает уровни, на которых игрока нет.

// Смещение кабины внизу относительно кабины на шестом этаже
export const LIFT_DELTA = { x: 0, z: 44.6 };

export const BASEMENT_ROOMS = [
  // Кабина лифта на 6 этаже (за раздвижными дверями лифта А)
  {
    id: 'liftcar', name: 'Кабина лифта', x0: 5.0, x1: 5.9, z0: -4.55, z1: -3.54, h: 2.15,
    floor: 'floor_lino', ceiling: 'metal', wall: 'door_metal', surface: 'lino', ambient: 'home', signal: 0, liftcar: 'up',
    openings: [{ side: 's', at: 5.45, w: 0.8, h: 1.95, open: true }],
  },
  // Кабина в подвале — та же кабина, перенесённая на LIFT_DELTA
  {
    id: 'bcar', name: 'Кабина лифта', x0: 5.0, x1: 5.9, z0: 40.05, z1: 41.06, h: 2.15, level: 'b',
    floor: 'floor_lino', ceiling: 'metal', wall: 'door_metal', surface: 'lino', ambient: 'home', signal: 0, liftcar: 'down',
    openings: [{ side: 's', at: 5.45, w: 0.8, h: 1.95, open: true }],
  },
  {
    id: 'b_hall', name: 'Подвал · у лифта', x0: 2.6, x1: 9.0, z0: 41.2, z1: 44.6, h: 2.45, level: 'b',
    floor: 'floor_concrete', ceiling: 'wall_concrete', wall: 'wall_whitewash', wainscot: { h: 1.2, mat: 'wall_concrete' },
    surface: 'concrete', ambient: 'basement', signal: 0,
    openings: [
      { side: 'n', at: 5.45, w: 0.8, h: 1.95, open: true },
      { side: 'w', at: 43.55, w: 1.5, h: 2.1, open: true },
    ],
  },
  {
    id: 'b_corr', name: 'Подвал · коридор', x0: -14.0, x1: 2.46, z0: 42.6, z1: 44.5, h: 2.3, level: 'b',
    floor: 'floor_concrete', ceiling: 'wall_concrete', wall: 'wall_whitewash', wainscot: { h: 1.2, mat: 'wall_concrete' },
    surface: 'concrete', ambient: 'basement', signal: 0,
    openings: [
      { side: 'e', at: 43.55, w: 1.5, h: 2.1, open: true },
      { side: 's', at: -9.0, w: 1.0, h: 2.0, door: 'd3' },
    ],
  },
  {
    id: 'b_boiler', name: 'Котельная', x0: -14.0, x1: -4.0, z0: 44.64, z1: 52.0, h: 3.3, level: 'b',
    floor: 'floor_concrete', ceiling: 'wall_concrete', wall: 'wall_concrete', wainscot: { h: 1.4, mat: 'rust' },
    surface: 'concrete', ambient: 'basement', signal: 0,
    openings: [{ side: 'n', at: -9.0, w: 1.0, h: 2.0, door: 'd3' }],
  },
  // «Объект 17. Уровень 1» — под котельной; попадают по лестнице из люка
  {
    id: 'b_lab', name: 'Объект 17', x0: -14.0, x1: -3.0, z0: 60.0, z1: 68.5, h: 2.7, level: 'lab',
    floor: 'floor_concrete', ceiling: 'wall_concrete', wall: 'wall_concrete', wainscot: { h: 0.9, mat: 'door_metal' },
    surface: 'concrete', ambient: 'basement', signal: 3,
  },
];

export const BASEMENT_DOORS = [
  { id: 'd3', x: -9.0, z: 44.57, axis: 'x', w: 1.0, h: 2.0, style: 'door_metal', number: '3', openDir: +1, hinge: -1, initial: { locked: true } },
];

export const BASEMENT_FIXTURES = [
  { id: 'L_car', room: 'liftcar', x: 5.45, y: 2.1, z: -4.05, type: 'plafond', color: 0xf2f0dc, intensity: 1.6, range: 3, circuit: 'lift', on: true },
  { id: 'L_bcar', room: 'bcar', x: 5.45, y: 2.1, z: 40.55, type: 'plafond', color: 0xf2f0dc, intensity: 1.6, range: 3, circuit: 'lift', on: true },
  { id: 'L_bh1', room: 'b_hall', x: 6.2, y: 2.35, z: 42.8, type: 'bulb', color: 0xffd29a, intensity: 3.2, range: 7, circuit: 'basement', on: true, flicker: 'slight' },
  { id: 'L_bc1', room: 'b_corr', x: -1.5, y: 2.2, z: 43.55, type: 'bulb', color: 0xffcf90, intensity: 2.6, range: 6, circuit: 'basement', on: true },
  { id: 'L_bc2', room: 'b_corr', x: -7.5, y: 2.2, z: 43.55, type: 'bulb', color: 0xffcf90, intensity: 1.6, range: 5, circuit: 'basement', on: true, flicker: 'bad' },
  { id: 'L_boil', room: 'b_boiler', x: -9.0, y: 3.15, z: 48.0, type: 'bulb', color: 0xff9a60, intensity: 3.4, range: 9, circuit: 'basement', on: true, flicker: 'slight' },
  { id: 'L_torch', room: 'b_corr', x: -10.4, y: 0.25, z: 43.9, type: 'none', color: 0xfff1d0, intensity: 1.0, range: 3, circuit: 'sanych_torch', on: true },
  { id: 'L_lab', room: 'b_lab', x: -8.5, y: 2.5, z: 64.2, type: 'plafond', color: 0x9fb8ff, intensity: 2.2, range: 9, circuit: 'basement', on: true },
  { id: 'L_lab2', room: 'b_lab', x: -4.4, y: 1.2, z: 61.2, type: 'none', color: 0x7a5cff, intensity: 1.4, range: 4, circuit: 'resonator', on: true },
];

export const BASEMENT_FURNISHING = [
  // Кабины
  { prop: 'lift_cabin', room: 'liftcar', x: 5.45, z: -4.05, rot: 0, hit: { id: 'lift_panel', size: [0.2, 0.4, 0.3], offset: [0.4, 1.0, 0.1] } },
  { prop: 'lift_cabin', room: 'bcar', x: 5.45, z: 40.55, rot: 0, hit: { id: 'lift_panel_b', size: [0.2, 0.4, 0.3], offset: [0.4, 1.0, 0.1] } },
  { prop: 'elevator_doors', room: 'b_hall', x: 5.45, z: 41.2, rot: 0, name: 'lift_b' },
  { prop: 'lift_button', room: 'b_hall', x: 6.35, z: 41.22, rot: 0, hit: { id: 'lift_call_b', size: [0.2, 0.3, 0.2], offset: [0, 1.15, 0.05] } },
  // Лифтовая в подвале
  { prop: 'pipes', room: 'b_hall', x: 5.8, z: 44.35, rot: 0, opts: { len: 6.4, y: 2.1 } },
  { prop: 'puddle', room: 'b_hall', x: 4.4, z: 43.0, rot: 0, opts: { w: 2.2, d: 1.4 } },
  { prop: 'puddle', room: 'b_hall', x: 7.6, z: 43.9, rot: 0, opts: { w: 1.2, d: 0.9 } },
  { prop: 'boxes', room: 'b_hall', x: 8.4, z: 42.0, rot: 0, opts: { n: 3 } },
  { prop: 'picture', room: 'b_hall', x: 8.98, z: 42.9, rot: -Math.PI / 2, opts: { w: 0.5, h: 0.32, y: 1.4, mat: { lines: ['#ПОДВАЛ', 'Посторонним вход', 'воспрещён', 'ЖЭК-4'], opts: { w: 320, h: 200, bg: '#d6cfb6', titleColor: '#8a2a1e', size: 22, titleSize: 30 } } } },
  // Коридор с сарайками
  { prop: 'pipes', room: 'b_corr', x: -5.8, z: 42.85, rot: 0, opts: { len: 16.2, y: 2.0 } },
  { prop: 'storage_cells', room: 'b_corr', x: -1.4, z: 42.6, rot: 0, opts: { n: 4, open: 2 } },
  { prop: 'storage_cells', room: 'b_corr', x: -11.6, z: 42.6, rot: 0, opts: { n: 3 } },
  { prop: 'puddle', room: 'b_corr', x: -4.6, z: 43.6, rot: 0, opts: { w: 3.4, d: 1.3 } },
  { prop: 'puddle', room: 'b_corr', x: 0.6, z: 44.0, rot: 0, opts: { w: 1.4, d: 0.8 } },
  { prop: 'dropped_torch', room: 'b_corr', x: -10.4, z: 43.9, rot: 0, name: 'sanych_torch', pickup: true, hit: { id: 'c2_sanych_torch', size: [0.5, 0.3, 0.5] } },
  { hitOnly: true, room: 'b_corr', x: -12.6, y: 0, z: 44.0, hit: { id: 'c2_sanych_phone', size: [0.45, 0.3, 0.45] } },
  { prop: 'phone_floor', room: 'b_corr', x: -12.6, z: 44.0, rot: 0.6, name: 'sanych_phone_model', pickup: true },
  { hitOnly: true, room: 'b_corr', x: 0.2, y: 0.2, z: 42.7, hit: { id: 'c2_cell_dog', size: [1.6, 1.6, 0.3] } },
  // Котельная
  { prop: 'boiler', room: 'b_boiler', x: -12.2, z: 48.4, rot: Math.PI / 2 },
  { prop: 'boiler', room: 'b_boiler', x: -12.2, z: 50.9, rot: Math.PI / 2 },
  { prop: 'pipes', room: 'b_boiler', x: -9, z: 51.75, rot: 0, opts: { len: 9.8, y: 2.6, n: 3 } },
  { prop: 'hatch', room: 'b_boiler', x: -6.4, z: 50.2, rot: 0, hit: { id: 'c2_hatch', size: [1.1, 0.6, 1.1] } },
  { prop: 'chalk_wall', room: 'b_boiler', x: -4.02, z: 47.6, rot: -Math.PI / 2, hit: { id: 'c2_chalk', size: [0.2, 1.2, 1.6], offset: [0, 0.8, 0] } },
  { prop: 'workbench', room: 'b_boiler', x: -6.0, z: 45.2, rot: Math.PI },
  // Объект 17
  { prop: 'crystal_wall', room: 'b_lab', x: -8.5, z: 60.02, rot: 0, opts: { w: 10.9 } },
  { prop: 'crystal_wall', room: 'b_lab', x: -13.98, z: 64.2, rot: Math.PI / 2, opts: { w: 8.4 } },
  { prop: 'crystal_wall', room: 'b_lab', x: -3.02, z: 64.2, rot: -Math.PI / 2, opts: { w: 8.4 } },
  { prop: 'ladder', room: 'b_lab', x: -6.4, z: 67.6, rot: Math.PI, hit: { id: 'c2_ladder', size: [0.9, 2.0, 0.6], offset: [0, 0, 0.1] } },
  { prop: 'resonator', room: 'b_lab', x: -8.5, z: 61.1, rot: 0, name: 'resonator', hit: { id: 'c2_console', size: [2.0, 1.4, 1.0], offset: [0, 0, 0.4] } },
  { prop: 'tape_deck', room: 'b_lab', x: -4.2, z: 64.5, rot: -Math.PI / 2, name: 'tape_deck', hit: { id: 'c2_tape', size: [0.8, 1.2, 0.8] } },
  { prop: 'stool', room: 'b_lab', x: -12.4, z: 62.2, rot: 0, name: 'sanych_stool' },
  { prop: 'puddle', room: 'b_lab', x: -9.4, z: 65.5, rot: 0, opts: { w: 3, d: 2 } },
];
