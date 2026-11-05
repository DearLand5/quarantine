// Каталог процедурных предметов интерьера. Каждый предмет — функция, собирающая группу из примитивов
// с общими материалами. Возвращает { group, colliders, hits, parts }.
// Координаты внутри предмета: X — ширина, Z — глубина («перед» предмета смотрит в +Z), Y — от пола.
// Эти модели — заменяемые заготовки: WorldBuilder может подставить GLB из assets/models (см. README).
import * as THREE from 'three';
import { boxGeo, cylGeo, sphereGeo, planeGeo } from './geometry.js';

const HIT_MAT = new THREE.MeshBasicMaterial({ visible: false });
const unitCache = new Map();
function unitPlane(w, h) {
  const k = `p${w}:${h}`;
  if (!unitCache.has(k)) unitCache.set(k, new THREE.PlaneGeometry(w, h));
  return unitCache.get(k);
}
function unitBox(w, h, d) {
  const k = `b${w}:${h}:${d}`;
  if (!unitCache.has(k)) unitCache.set(k, new THREE.BoxGeometry(w, h, d));
  return unitCache.get(k);
}

export class PropBuilder {
  constructor(assets) {
    this.a = assets;
    this.group = new THREE.Group();
    this.colliders = [];
    this.hits = [];
    this.parts = {};
  }
  m(name) { return typeof name === 'string' ? this.a.material(name) : name; }

  /** Коробка: (x, z) — центр, y0 — низ. */
  box(mat, w, h, d, x = 0, y0 = 0, z = 0, ry = 0) {
    const mesh = new THREE.Mesh(boxGeo(w, h, d), this.m(mat));
    mesh.position.set(x, y0 + h / 2, z);
    mesh.rotation.y = ry;
    mesh.castShadow = true; mesh.receiveShadow = true;
    this.group.add(mesh);
    return mesh;
  }
  cyl(mat, rt, rb, h, x = 0, y0 = 0, z = 0, seg = 12) {
    const mesh = new THREE.Mesh(cylGeo(rt, rb, h, seg), this.m(mat));
    mesh.position.set(x, y0 + h / 2, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    this.group.add(mesh);
    return mesh;
  }
  sphere(mat, r, x, y, z, sx = 1, sy = 1, sz = 1) {
    const mesh = new THREE.Mesh(sphereGeo(r, 10, 8), this.m(mat));
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    this.group.add(mesh);
    return mesh;
  }
  plane(mat, w, h, x, y, z, rx = 0, ry = 0) {
    const mesh = new THREE.Mesh(planeGeo(w, h), this.m(mat));
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, 0);
    mesh.receiveShadow = true;
    this.group.add(mesh);
    return mesh;
  }
  /** Плоская табличка с «целой» текстурой (UV 0..1) — для знаков/плакатов; в отличие от plane() не тайлит текстуру в метрах. */
  sign(mat, w, h, x, y, z, rx = 0, ry = 0) {
    const mesh = new THREE.Mesh(unitPlane(w, h), this.m(mat));
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, 0);
    mesh.receiveShadow = true;
    this.group.add(mesh);
    return mesh;
  }
  /** Коробка со стандартными UV (текстура целиком на каждой грани). */
  signBox(mat, w, h, d, x = 0, y0 = 0, z = 0) {
    const mesh = new THREE.Mesh(unitBox(w, h, d), this.m(mat));
    mesh.position.set(x, y0 + h / 2, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    this.group.add(mesh);
    return mesh;
  }
  col(x, z, w, d) { this.colliders.push({ x, z, w, d }); }
  hit(id, w, h, d, x, y0, z) {
    const mesh = new THREE.Mesh(boxGeo(w, h, d), HIT_MAT);
    mesh.position.set(x, y0 + h / 2, z);
    mesh.userData.hitId = id;
    this.group.add(mesh);
    this.hits.push(mesh);
    return mesh;
  }
  dynamic(mesh) { mesh.userData.dynamic = true; return mesh; }
  done() { return { group: this.group, colliders: this.colliders, hits: this.hits, parts: this.parts }; }
}


/** Цилиндр, ось которого направлена вдоль Z (круглая кнопка / розетка на стене); (x, y, z) — центр. */
function faceCyl(b, mat, r, x, y, z, th, seg = 14) {
  const m = b.cyl(mat, r, r, th, 0, 0, 0, seg);
  m.rotation.x = Math.PI / 2;
  m.position.set(x, y, z);
  return m;
}

/**
 * Портал лифта. Локально: X — вдоль стены (0 — ось проёма), Z — в комнату, z=0 — плоскость стены.
 * Проём 0.8 × 1.95 в стене (flush=false): створки утоплены на 3–5 см в толщу стены и уходят в неё на 0.4 м.
 * flush=true — накладная глухая дверь прямо на стене (проёма нет).
 */
function liftPortal(b, o) {
  const OW = 0.8, OH = 1.95, J = 0.1, FD = 0.03;
  // Рамка: две стойки, перемычка
  b.box('metal', J, OH + 0.12, FD, -(OW + J) / 2, 0, FD / 2);
  b.box('metal', J, OH + 0.12, FD, (OW + J) / 2, 0, FD / 2);
  b.box('metal', OW + 2 * J, 0.12, FD, 0, OH, FD / 2);
  // Тонкая внутренняя окантовка
  b.box('chrome', 0.008, OH, FD + 0.004, -OW / 2 - 0.004, 0, (FD + 0.004) / 2);
  b.box('chrome', 0.008, OH, FD + 0.004, OW / 2 + 0.004, 0, (FD + 0.004) / 2);
  // Порог
  if (o.flush) b.box('metal', OW + 0.02, 0.015, 0.06, 0, 0, 0.03);
  else b.box('metal', OW + 0.04, 0.015, 0.2, 0, 0, -0.07);
  // Створки
  const lw = OW / 2 + 0.002, lh = OH - 0.016;
  let l, r;
  if (o.flush) {
    l = b.box('door_metal', OW / 2, lh, 0.014, -OW / 4, 0.016, 0.012);
    r = b.box('door_metal', OW / 2, lh, 0.014, OW / 4, 0.016, 0.012);
    b.box('black', 0.006, lh, 0.016, 0, 0.016, 0.012);
  } else {
    l = b.box('door_metal', lw, lh, 0.02, -OW / 4, 0.016, -0.05);
    r = b.box('door_metal', lw, lh, 0.02, OW / 4, 0.016, -0.03);
  }
  b.parts.left = b.dynamic(l); b.parts.right = b.dynamic(r);
  // Указатель этажа над перемычкой
  b.box('black', 0.2, 0.09, FD + 0.01, 0, OH + 0.14, (FD + 0.01) / 2);
  b.sign(b.a.signMaterial([o.dead ? '' : o.label], { w: 96, h: 64, bg: '#111', fg: '#e0a050', size: 44, pad: 4, aged: false }), 0.18, 0.07, 0, OH + 0.15, FD + 0.0105);
}

export const PROPS = {
  bed(b, o) {
    const w = o.w || 0.95, l = o.l || 2.0;
    b.box('wood_dark', w, 0.32, l, 0, 0.08, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box('wood_dark', 0.06, 0.1, 0.06, sx * (w / 2 - 0.05), 0, sz * (l / 2 - 0.05));
    b.box('wood_dark', w, 0.85, 0.05, 0, 0, -l / 2 + 0.02);
    b.box('bedding', w - 0.06, 0.16, l - 0.1, 0, 0.4, 0.03);
    b.box('enamel', w * 0.7, 0.12, 0.38, 0, 0.56, -l / 2 + 0.28);
    const blanket = b.box('fabric_red', w - 0.02, 0.08, l * 0.62, 0, 0.53, l * 0.17);
    blanket.rotation.z = 0.02;
    b.col(0, 0, w, l);
  },
  sofa(b, o) {
    const w = o.w || 1.9, mat = o.mat || 'fabric';
    b.box(mat, w, 0.42, 0.85, 0, 0.05, 0);
    b.box(mat, w, 0.55, 0.2, 0, 0.42, -0.33);
    b.box(mat, 0.18, 0.25, 0.85, -w / 2 + 0.09, 0.42, 0);
    b.box(mat, 0.18, 0.25, 0.85, w / 2 - 0.09, 0.42, 0);
    b.box('wood_dark', w, 0.05, 0.8, 0, 0, 0);
    b.col(0, 0, w, 0.85);
  },
  armchair(b, o) {
    const mat = o.mat || 'fabric_red';
    b.box(mat, 0.75, 0.4, 0.75, 0, 0.05, 0);
    b.box(mat, 0.75, 0.5, 0.15, 0, 0.42, -0.3);
    b.box('wood_dark', 0.1, 0.22, 0.7, -0.33, 0.42, 0.02);
    b.box('wood_dark', 0.1, 0.22, 0.7, 0.33, 0.42, 0.02);
    b.col(0, 0, 0.75, 0.75);
  },
  wardrobe(b, o) {
    const w = o.w || 1.1, h = o.h || 2.0, d = 0.58;
    b.box('veneer', w, h, d, 0, 0, 0);
    b.box('black', 0.01, h - 0.15, 0.01, 0, 0.08, d / 2 + 0.002);
    b.box('brass', 0.02, 0.14, 0.03, -0.05, 1.0, d / 2 + 0.01);
    b.box('brass', 0.02, 0.14, 0.03, 0.05, 1.0, d / 2 + 0.01);
    b.col(0, 0, w, d);
  },
  wallunit(b, o) {
    // «Стенка» с сервантом: шкаф, стеклянная секция с посудой, книжные полки
    const w = o.w || 2.4, d = 0.45;
    b.box('veneer', w, 0.75, d, 0, 0, 0);
    b.box('veneer', w, 0.05, d, 0, 1.95, 0);
    b.box('veneer', 0.04, 1.2, d, -w / 2 + 0.02, 0.75, 0);
    b.box('veneer', 0.04, 1.2, d, w / 2 - 0.02, 0.75, 0);
    b.box('veneer', 0.04, 1.2, d, -w / 6, 0.75, 0);
    b.box('veneer', 0.04, 1.2, d, w / 6, 0.75, 0);
    b.box('veneer', w, 1.2, 0.02, 0, 0.75, -d / 2 + 0.01);
    for (const y of [1.15, 1.55]) b.box('veneer', w, 0.025, d, 0, y, 0);
    // книги стоят на крышке тумбы (y=0.75) в левой секции
    for (let i = 0; i < 14; i++) {
      const bw = 0.03 + (i % 3) * 0.012;
      b.box(i % 2 ? 'books' : 'fabric_red', bw, 0.22 + (i % 4) * 0.02, 0.18, -w / 2 + 0.1 + i * 0.05, 0.75, 0.0);
    }
    // посуда за стеклом: на полках (y = 1.175 / 1.575)
    for (let i = 0; i < 5; i++) b.cyl('ceramic', 0.04, 0.03, 0.09, -0.3 + i * 0.15, 1.175, 0);
    for (let i = 0; i < 4; i++) b.box('ceramic', 0.02, 0.18, 0.18, -0.25 + i * 0.16, 1.175 + 0.4, -0.05);
    b.box('glass', w / 3 - 0.05, 1.18, 0.01, 0, 0.76, d / 2);
    for (let i = 0; i < 9; i++) b.box(i % 3 ? 'books' : 'wood', 0.04, 0.24, 0.2, w / 6 + 0.08 + i * 0.05, 1.175, 0.0);
    b.col(0, 0, w, d);
  },
  desk(b, o) {
    const w = o.w || 1.2, d = 0.6;
    b.box('wood', w, 0.03, d, 0, 0.72, 0);
    b.box('wood', 0.4, 0.7, d - 0.04, w / 2 - 0.2, 0.02, 0);
    b.box('wood', 0.03, 0.72, d - 0.04, -w / 2 + 0.02, 0, 0);
    b.box('brass', 0.08, 0.015, 0.02, w / 2 - 0.2, 0.55, d / 2);
    b.col(0, 0, w, d);
  },
  laptop(b) {
    b.box('plastic_dark', 0.34, 0.02, 0.24, 0, 0, 0);
    // крышка стоит на заднем ребре основания и откинута назад; экран — на её лицевой стороне
    const lid = b.box('plastic_dark', 0.34, 0.22, 0.012, 0, 0.02, -0.12);
    lid.rotation.x = -0.25;
    lid.position.set(0, 0.02 + 0.11 * Math.cos(0.25), -0.12 - 0.11 * Math.sin(0.25));
    const screen = b.dynamic(b.plane(b.a.uniqueMaterial('screen_glow'), 0.3, 0.18, 0, lid.position.y + 0.0066 * 0.247, lid.position.z + 0.0066 * 0.97, -0.25));
    b.parts.screen = screen;
  },
  desklamp(b) {
    // Настольная лампа: основание, наклонная стойка от основания, плафон над её концом
    b.cyl('plastic_dark', 0.08, 0.09, 0.03, 0, 0, 0);
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.03, 0);
    pivot.rotation.z = -0.3;
    const arm = new THREE.Mesh(boxGeo(0.015, 0.38, 0.015), b.m('chrome'));
    arm.position.y = 0.19;
    arm.castShadow = true;
    pivot.add(arm);
    b.group.add(pivot);
    b.cyl('plastic_dark', 0.05, 0.11, 0.12, 0.135, 0.33, 0);
    const bulb = b.dynamic(b.sphere(b.a.uniqueMaterial('lamp_on'), 0.035, 0.135, 0.33, 0));
    b.parts.bulb = bulb;
  },
  chair(b, o) {
    const mat = o.mat || 'wood';
    b.box(mat, 0.42, 0.04, 0.42, 0, 0.44, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(mat, 0.035, 0.44, 0.035, sx * 0.18, 0, sz * 0.18);
    b.box(mat, 0.42, 0.4, 0.03, 0, 0.48, -0.2);
    b.col(0, 0, 0.42, 0.42);
  },
  stool(b) {
    b.cyl('wood', 0.17, 0.17, 0.035, 0, 0.42, 0, 10);
    for (const a of [0, 2.1, 4.2]) b.box('wood', 0.03, 0.42, 0.03, Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12);
    b.col(0, 0, 0.34, 0.34);
  },
  table(b, o) {
    const w = o.w || 1.0, d = o.d || 0.7, mat = o.mat || 'wood';
    b.box(mat, w, 0.035, d, 0, 0.72, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box('wood_dark', 0.04, 0.72, 0.04, sx * (w / 2 - 0.06), 0, sz * (d / 2 - 0.06));
    if (o.cloth) b.box(o.cloth, w + 0.06, 0.008, d + 0.06, 0, 0.755, 0);
    b.col(0, 0, w, d);
  },
  fridge(b) {
    b.box('enamel', 0.6, 1.5, 0.6, 0, 0, 0);
    b.box('black', 0.6, 0.01, 0.005, 0, 1.08, 0.303);
    b.box('chrome', 0.04, 0.3, 0.04, 0.24, 0.85, 0.32);
    b.box('chrome', 0.18, 0.04, 0.01, 0, 1.35, 0.302);
    b.col(0, 0, 0.6, 0.6);
  },
  stove(b) {
    b.box('enamel', 0.5, 0.85, 0.58, 0, 0, 0);
    b.box('black', 0.5, 0.01, 0.58, 0, 0.85, 0);
    for (const [x, z] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) b.cyl('metal', 0.07, 0.07, 0.015, x, 0.86, z, 10);
    b.box('black', 0.4, 0.32, 0.006, 0, 0.29, 0.29);              // рама духовки
    b.box('glass', 0.34, 0.24, 0.006, 0, 0.33, 0.297);            // стекло дверцы поверх тёмной рамы
    b.box('chrome', 0.36, 0.025, 0.03, 0, 0.63, 0.305);           // ручка духовки
    for (let i = 0; i < 4; i++) b.cyl('plastic_dark', 0.018, 0.018, 0.03, -0.15 + i * 0.1, 0.74, 0.3, 8).rotation.x = Math.PI / 2;
    b.col(0, 0, 0.5, 0.58);
  },
  kitchen_counter(b, o) {
    const w = o.w || 1.2;
    b.box('enamel', w, 0.82, 0.58, 0, 0, 0);
    for (let i = 0; i < Math.round(w / 0.4); i++) b.box('chrome', 0.1, 0.015, 0.02, -w / 2 + 0.2 + i * 0.4, 0.7, 0.3);
    if (!o.sink) {
      b.box('wood_dark', w, 0.04, 0.6, 0, 0.82, 0.01);
    } else {
      // Столешница с вырезом под мойку: врезная раковина с настоящей чашей
      const sx = o.sinkX || 0, hw = 0.46, hd = 0.34, cz = 0.02;       // размеры выреза
      const left = (sx - hw / 2) - (-w / 2), right = w / 2 - (sx + hw / 2);
      b.box('wood_dark', left, 0.04, 0.6, -w / 2 + left / 2, 0.82, 0.01);
      b.box('wood_dark', right, 0.04, 0.6, w / 2 - right / 2, 0.82, 0.01);
      const fz0 = 0.01 - 0.3, fz1 = 0.01 + 0.3;
      b.box('wood_dark', hw, 0.04, (cz - hd / 2) - fz0, sx, 0.82, (fz0 + cz - hd / 2) / 2);
      b.box('wood_dark', hw, 0.04, fz1 - (cz + hd / 2), sx, 0.82, (fz1 + cz + hd / 2) / 2);
      // чаша из нержавейки: дно на 0.66, стенки до уровня столешницы
      b.box('chrome', hw - 0.02, 0.01, hd - 0.02, sx, 0.66, cz);
      b.box('chrome', hw - 0.02, 0.2, 0.015, sx, 0.66, cz - hd / 2 + 0.0075);
      b.box('chrome', hw - 0.02, 0.2, 0.015, sx, 0.66, cz + hd / 2 - 0.0075);
      b.box('chrome', 0.015, 0.2, hd - 0.03, sx - hw / 2 + 0.0075 + 0.01, 0.66, cz);
      b.box('chrome', 0.015, 0.2, hd - 0.03, sx + hw / 2 - 0.0075 - 0.01, 0.66, cz);
      b.box('black', 0.05, 0.004, 0.05, sx, 0.671, cz);
      // смеситель у задней стенки
      b.cyl('chrome', 0.018, 0.018, 0.26, sx, 0.86, -0.24, 8);
      b.box('chrome', 0.02, 0.02, 0.18, sx, 1.1, -0.16);
    }
    b.col(0, 0, w, 0.6);
  },
  wall_cabinet(b, o) {
    const w = o.w || 1.0;
    b.box('enamel', w, 0.6, 0.32, 0, 0, 0);
    b.box('black', 0.005, 0.56, 0.005, 0, 0.02, 0.162);
  },
  kettle(b) {
    b.cyl('enamel', 0.07, 0.09, 0.18, 0, 0, 0, 12);
    b.cyl('enamel', 0.03, 0.04, 0.03, 0, 0.18, 0, 8);
    const spout = b.cyl('enamel', 0.012, 0.02, 0.12, 0.09, 0.07, 0, 6);
    spout.rotation.z = -0.8;
    // дужка-ручка над крышкой: две стойки и перекладина
    for (const sz of [-1, 1]) b.box('black', 0.02, 0.1, 0.02, 0, 0.15, sz * 0.065);
    b.box('black', 0.02, 0.02, 0.15, 0, 0.25, 0);
  },
  radio(b) {
    b.box('wood_dark', 0.32, 0.18, 0.12, 0, 0, 0);
    b.box('fabric', 0.16, 0.12, 0.005, -0.06, 0.03, 0.061);
    b.box('plastic_beige', 0.08, 0.06, 0.005, 0.09, 0.08, 0.061);
    // телескопическая антенна: низ касается крышки
    const ant = b.cyl('chrome', 0.004, 0.004, 0.35, 0.05, 0.18, -0.04, 4);
    ant.rotation.z = -0.5;
    ant.position.x = 0.12 - 0.175 * Math.sin(0.5) + 0.0; ant.position.y = 0.18 + 0.175 * Math.cos(0.5);
  },
  bathtub(b) {
    // Полая эмалированная ванна 0.7 x 1.6 x 0.58: цоколь, борта, закатанный бортик, слив, смеситель на стене
    const w = 0.7, l = 1.6, h = 0.58, t = 0.06, base = 0.2;
    b.box('enamel', w, base, l, 0, 0.0, 0);                                   // днище (внутренняя поверхность на y=0.2)
    b.box('enamel', t, h - base, l, -(w - t) / 2, base, 0);                   // борта
    b.box('enamel', t, h - base, l, (w - t) / 2, base, 0);
    b.box('enamel', w - 2 * t, h - base, t, 0, base, -(l - t) / 2);           // торцы
    b.box('enamel', w - 2 * t, h - base, t, 0, base, (l - t) / 2);
    b.box('enamel', 0.09, 0.025, l, -(w - 0.09) / 2, h, 0);                   // бортик
    b.box('enamel', 0.09, 0.025, l, (w - 0.09) / 2, h, 0);
    b.box('enamel', w - 0.18, 0.025, 0.09, 0, h, -(l - 0.09) / 2);
    b.box('enamel', w - 0.18, 0.025, 0.09, 0, h, (l - 0.09) / 2);
    b.cyl('chrome', 0.035, 0.035, 0.012, 0, base, 0.62, 12);                  // слив
    b.cyl('chrome', 0.02, 0.02, 0.01, 0, 0.36, 0.745, 10).rotation.x = Math.PI / 2;  // перелив
    // смеситель на стене у изголовья (стена за -Z торцом)
    b.box('chrome', 0.22, 0.05, 0.05, 0, 0.84, -0.905);
    for (const sx of [-1, 1]) b.cyl('chrome', 0.02, 0.02, 0.03, sx * 0.08, 0.85, -0.85, 8);
    const spout = b.cyl('chrome', 0.014, 0.014, 0.16, 0, 0.82, -0.82, 8);
    spout.rotation.x = Math.PI / 2;
    spout.position.y = 0.82; spout.position.z = -0.8;
    b.col(0, 0, w, l);
  },
  toilet(b) {
    b.box('ceramic', 0.36, 0.4, 0.5, 0, 0, 0.05);
    b.box('ceramic', 0.38, 0.35, 0.18, 0, 0.42, -0.2);
    b.box('plastic_white', 0.38, 0.03, 0.48, 0, 0.4, 0.06);
    b.col(0, 0, 0.4, 0.62);
  },
  washbasin(b) {
    // Раковина-«тюльпан» с углублённой чашей: стенки + дно, смеситель на заднем борту
    b.box('ceramic', 0.5, 0.06, 0.4, 0, 0.74, 0);              // дно чаши
    b.box('ceramic', 0.5, 0.09, 0.04, 0, 0.8, -0.18);          // задний борт
    b.box('ceramic', 0.5, 0.09, 0.04, 0, 0.8, 0.18);           // передний
    b.box('ceramic', 0.04, 0.09, 0.32, -0.23, 0.8, 0);         // боковые
    b.box('ceramic', 0.04, 0.09, 0.32, 0.23, 0.8, 0);
    b.box('black', 0.05, 0.004, 0.05, 0, 0.8, 0.0);            // слив
    b.cyl('ceramic', 0.06, 0.08, 0.74, 0, 0, -0.1, 10);        // пьедестал
    b.box('chrome', 0.04, 0.1, 0.04, 0, 0.89, -0.18);          // смеситель
    b.box('chrome', 0.025, 0.025, 0.12, 0, 0.97, -0.12);
    b.col(0, 0, 0.5, 0.4);
  },
  mirror(b, o) {
    const w = o.w || 0.5, h = o.h || 0.7;
    b.box('wood_dark', w + 0.05, h + 0.05, 0.02, 0, -0.025, 0);
    b.box('mirror', w, h, 0.005, 0, 0, 0.012);
  },
  washer(b) {
    b.box('enamel', 0.6, 0.85, 0.55, 0, 0, 0);
    b.cyl('glass', 0.18, 0.18, 0.02, 0, 0.42, 0.28, 16).rotation.x = Math.PI / 2;
    b.col(0, 0, 0.6, 0.55);
  },
  coatrack(b, o) {
    // Вешалка-планка на стене с крючками; одежда висит на крючках (верх на уровне крючков)
    b.box('wood', 1.0, 0.1, 0.03, 0, 1.6, 0);
    for (let i = 0; i < 5; i++) b.box('brass', 0.02, 0.02, 0.09, -0.4 + i * 0.2, 1.64, 0.05);
    const coats = o.coats || ['cloth_dark', 'fabric'];
    const slots = coats.length >= 3 ? [-0.4, 0, 0.4] : coats.length === 2 ? [-0.2, 0.2] : [0];
    coats.forEach((c, i) => {
      const x = slots[i];
      b.box('black', 0.02, 0.07, 0.02, x, 1.6, 0.09);         // петелька вешалки
      b.box(c, 0.36, 0.88, 0.14, x, 0.72, 0.1);
    });
    b.col(0, 0.08, 1.0, 0.3);
  },
  shoe_cabinet(b) {
    b.box('veneer', 0.8, 0.85, 0.35, 0, 0, 0);
    b.box('black', 0.78, 0.005, 0.005, 0, 0.62, 0.177);
    b.box('brass', 0.1, 0.015, 0.02, 0, 0.72, 0.18);
    b.col(0, 0, 0.8, 0.35);
  },
  shoes(b, o) {
    const mat = o.mat || 'black';
    const sc = o.scale || 1;
    b.box(mat, 0.1 * sc, 0.08 * sc, 0.27 * sc, -0.07 * sc, 0, 0);
    b.box(mat, 0.1 * sc, 0.08 * sc, 0.27 * sc, 0.07 * sc, 0, 0.03);
  },
  crt_tv(b) {
    b.box('wood_dark', 0.7, 0.5, 0.45, 0, 0, 0);
    b.box('plastic_dark', 0.56, 0.5, 0.48, 0, 0.5, 0);
    const scr = b.dynamic(b.box(b.a.uniqueMaterial('screen_glow'), 0.44, 0.34, 0.01, -0.03, 0.58, 0.24));
    b.parts.screen = scr;
    b.col(0, 0, 0.7, 0.48);
  },
  bookshelf(b, o) {
    // Открытый стеллаж: боковины, задняя стенка, полки; книги стоят на полках
    const w = o.w || 0.8, h = o.h || 1.8, d = 0.3, t = 0.025;
    b.box('wood', t, h, d, -w / 2 + t / 2, 0, 0);
    b.box('wood', t, h, d, w / 2 - t / 2, 0, 0);
    b.box('wood', w - 2 * t, h, 0.012, 0, 0, -d / 2 + 0.006);
    const gap = (h - t) / 4;
    for (let s = 0; s <= 4; s++) b.box('wood', w - 2 * t, t, d - 0.012, 0, s * gap, 0.006);
    for (let s = 0; s < 4; s++) {
      const y0 = s * gap + t;
      for (let i = 0; i < Math.floor((w - 2 * t - 0.04) / 0.045); i++) {
        if ((i * 7 + s * 3) % 11 === 0) continue;
        b.box(['books', 'fabric_red', 'fabric', 'wood_dark'][(i + s) % 4], 0.035, Math.min(gap - 0.06, 0.2 + ((i + s) % 3) * 0.03), 0.2, -w / 2 + t + 0.04 + i * 0.045, y0, 0.01);
      }
    }
    b.col(0, 0, w, d);
  },
  plant(b) {
    // Горшок с землёй и пучок листьев: каждый лист растёт из центра горшка (поворот вокруг основания)
    b.cyl('ceramic', 0.13, 0.1, 0.2, 0, 0, 0, 10);
    b.cyl('soil', 0.115, 0.115, 0.01, 0, 0.2, 0, 10);
    for (let i = 0; i < 7; i++) {
      const len = 0.4 + (i % 3) * 0.1;
      const pivot = new THREE.Group();
      pivot.position.set(Math.cos(i * 0.9) * 0.03, 0.2, Math.sin(i * 0.9) * 0.03);
      pivot.rotation.set(0, i * 0.9, 0);
      const tilt = new THREE.Group();
      tilt.rotation.z = 0.25 + (i % 3) * 0.12;
      const leaf = new THREE.Mesh(boxGeo(0.07, len, 0.015), b.m('plant'));
      leaf.position.y = len / 2;
      leaf.castShadow = true;
      tilt.add(leaf);
      pivot.add(tilt);
      b.group.add(pivot);
    }
  },
  radiator(b, o) {
    // Чугунная батарея: секции стоят на кронштейнах, подводка снизу к торцам
    const n = o.n || 8;
    const wTot = n * 0.08;
    for (let i = 0; i < n; i++) b.box('enamel', 0.07, 0.55, 0.12, -wTot / 2 + 0.04 + i * 0.08, 0.12, 0);
    for (const sx of [-1, 1]) {
      b.box('enamel', 0.03, 0.1, 0.04, sx * (wTot / 2 - 0.05), 0.02, -0.02);        // кронштейны на стене
      b.cyl('metal', 0.014, 0.014, 0.14, sx * (wTot / 2 + 0.01), 0, 0.0, 6);          // стояки подводки
    }
  },
  boxes(b, o) {
    // Стопка картонных коробок: нижние стоят на полу, верхние — на нижних
    const n = o.n || 3;
    const base = [
      { s: 0.42, x: -0.1, z: 0.0, ry: 0.08 },
      { s: 0.34, x: 0.24, z: 0.03, ry: -0.12 },
    ];
    const top = [
      { s: 0.3, x: -0.1, z: 0.0, ry: 0.4, on: 0 },
      { s: 0.26, x: 0.24, z: 0.03, ry: -0.3, on: 1 },
    ];
    for (let i = 0; i < Math.min(n, 2); i++) { const c = base[i]; b.box('cardboard', c.s, c.s * 0.8, c.s, c.x, 0, c.z, c.ry); }
    for (let i = 0; i < Math.min(Math.max(n - 2, 0), 2); i++) {
      const c = top[i], under = base[c.on];
      b.box('cardboard', c.s, c.s * 0.8, c.s, c.x, under.s * 0.8, c.z, c.ry);
    }
    b.col(0.07, 0, n > 1 ? 0.7 : 0.45, 0.5);
  },
  trash_bags(b) {
    b.sphere('trash_bag', 0.22, 0, 0.243, 0, 1, 1.1, 0.9);
    b.sphere('trash_bag', 0.18, 0.25, 0.18, 0.08, 1, 1.0, 1);
    b.col(0.1, 0, 0.6, 0.45);
  },
  doormat(b, o) {
    b.box(o.mat || 'rubber', 0.75, 0.012, 0.45, 0, 0, 0);
  },
  wall_carpet(b, o) {
    b.plane('rug', o.w || 2.2, o.h || 1.5, 0, o.y || 1.35, 0.005);
  },
  floor_rug(b, o) {
    b.plane('rug', o.w || 2.0, o.d || 1.4, 0, 0.006, 0, -Math.PI / 2);
  },
  picture(b, o) {
    b.box('wood_dark', (o.w || 0.3) + 0.04, (o.h || 0.4) + 0.04, 0.02, 0, -0.02 + (o.y || 1.5), 0);
    if (o.mat) b.sign(o.mat, o.w || 0.3, o.h || 0.4, 0, (o.y || 1.5) + (o.h || 0.4) / 2, 0.021);
    else b.plane('paper', o.w || 0.3, o.h || 0.4, 0, (o.y || 1.5) + (o.h || 0.4) / 2, 0.021);
    if (o.stand) b.box('wood_dark', 0.05, (o.h || 0.4) * 0.8, 0.03, 0, (o.y || 1.5) + 0.02, -0.025);   // подпорка рамки на полке
  },
  wall_clock(b, o) {
    const y = o.y || 1.9;
    const body = b.cyl('wood_dark', 0.16, 0.16, 0.04, 0, y, 0, 16);
    body.rotation.x = Math.PI / 2; body.position.y = y;
    const face = b.cyl('enamel', 0.14, 0.14, 0.01, 0, y, 0.025, 16);
    face.rotation.x = Math.PI / 2; face.position.y = y;
  },
  icon_shelf(b) {
    b.box('wood_dark', 0.4, 0.03, 0.15, 0, 1.75, 0);
    b.box('brass', 0.14, 0.18, 0.015, -0.08, 1.78, -0.04);
    b.box('brass', 0.1, 0.14, 0.015, 0.1, 1.78, -0.03);
    b.cyl('lamp_red', 0.02, 0.025, 0.05, 0.0, 1.78, 0.04, 8);
  },
  sideboard(b) {
    // Низкий шкаф + застеклённая горка (полая: боковины, задник, полка), посуда стоит на крышке шкафа и на полке
    b.box('veneer', 1.3, 0.8, 0.45, 0, 0, 0);
    b.box('black', 1.2, 0.005, 0.005, 0, 0.45, 0.226);
    b.box('veneer', 0.03, 0.9, 0.35, -0.635, 0.8, -0.05);
    b.box('veneer', 0.03, 0.9, 0.35, 0.635, 0.8, -0.05);
    b.box('veneer', 1.3, 0.03, 0.35, 0, 1.7, -0.05);
    b.box('veneer', 1.24, 0.9, 0.02, 0, 0.8, -0.215);
    b.box('veneer', 1.24, 0.02, 0.33, 0, 1.25, -0.05);
    b.box('glass', 1.2, 0.86, 0.01, 0, 0.82, 0.12);
    for (let i = 0; i < 6; i++) b.cyl('ceramic', 0.05, 0.04, 0.1, -0.5 + i * 0.2, 0.8, -0.05);
    for (let i = 0; i < 5; i++) b.box('ceramic', 0.02, 0.2, 0.2, -0.4 + i * 0.2, 1.27, -0.08);
    b.col(0, 0, 1.3, 0.45);
  },
  // --------- Коридор и лестница ---------
  electric_panel(b) {
    b.box('metal', 0.6, 0.9, 0.16, 0, 1.1, 0);
    const door = b.dynamic(b.box('metal', 0.58, 0.88, 0.02, 0, 1.11, 0.085));
    b.parts.door = door;
    b.sign(b.a.signMaterial(['#⚡', 'ЩЭ-6'], { w: 128, h: 128, bg: '#c9a024', fg: '#111', titleSize: 54, size: 22 }), 0.12, 0.12, 0, 1.75, 0.097);
    // кабельные лотки уходят вверх в потолок (h коридора 2.6)
    b.cyl('metal', 0.02, 0.02, 0.6, 0.2, 2.0, -0.03, 6);
    b.cyl('metal', 0.015, 0.015, 0.6, 0.24, 2.0, -0.03, 6);
  },
  notice_board(b, o) {
    b.box('wood_dark', 1.2, 0.8, 0.03, 0, 1.15, 0);
    // листки прикалывают на щит (y листа задаётся в данных от нижней кромки щита +0.4 — центр щита 1.55)
    (o.sheets || []).forEach((s) => b.sign(b.a.signMaterial(s.lines, s.opts || {}), s.w, s.h, s.x, s.y + 0.4, 0.02 + (s.dz || 0)));
  },
  fire_cabinet(b) {
    b.signBox(b.a.signMaterial(['#ПК', 'пожарный кран'], { w: 256, h: 256, bg: '#8f2a22', fg: '#e8d9c0', titleSize: 80 }), 0.55, 0.7, 0.2, 0, 1.0, 0);
  },
  cctv(b) {
    b.box('plastic_white', 0.06, 0.06, 0.12, 0, 0, -0.05);
    const cam = b.box('plastic_white', 0.09, 0.08, 0.2, 0, -0.08, 0.06);
    cam.rotation.x = 0.35;
    const led = b.dynamic(b.sphere(b.a.uniqueMaterial('lamp_off'), 0.008, 0.03, -0.06, 0.16));
    b.parts.led = led;
  },
  elevator(b, o) {
    // Закрытая (нерабочая) дверь второго лифта: накладной портал на стене, стиль как у рабочего лифта
    // Начало предмета — на 4 см перед стеной (как у прежней модели), поэтому сдвигаем группу назад к плоскости стены
    b.group.position.z = -0.04;
    liftPortal(b, { flush: true, label: o.label || '6', dead: true });
  },
  elevator_doors(b, o) {
    // Портал рабочего лифта: рамка вровень со стеной, проём 0.8 × 1.95, створки уходят в стену (ход 0.4 м)
    liftPortal(b, { flush: false, label: o.label || '6', dead: false });
  },
  lift_button(b) {
    // Вызывная панель: накладка на стене (z 0..0.02), две кнопки ▲ ▼
    b.box('metal', 0.1, 0.17, 0.02, 0, 1.04, 0);
    b.box('black', 0.07, 0.13, 0.004, 0, 1.06, 0.02);
    const up = b.dynamic(faceCyl(b, b.a.uniqueMaterial('lamp_off'), 0.016, 0, 1.13, 0.0245, 0.009));
    faceCyl(b, 'plastic_beige', 0.016, 0, 1.075, 0.0245, 0.009);
    b.parts.button = up;
  },
  light_switch(b, o) {
    // Выключатель: рамка и накладка 8×8 см, клавиша (одна или две) вровень со стеной; начало — низ рамки, z=0 — стена
    const keys = o.keys || 1;
    b.box('plastic_beige', 0.095, 0.095, 0.004, 0, -0.0075, 0.002);
    b.box('plastic_white', 0.08, 0.08, 0.012, 0, 0, 0.006);
    const kw = keys === 1 ? 0.04 : 0.032;
    b.parts.keys = [];
    for (let i = 0; i < keys; i++) {
      const x = keys === 1 ? 0 : (i ? 1 : -1) * 0.018;
      const key = b.dynamic(b.box('plastic_white', kw, 0.058, 0.008, x, 0.011, 0.015));
      key.rotation.x = 0.1;
      b.parts.keys.push(key);
    }
    b.parts.key = b.parts.keys[0];
    b.box('black', 0.002, 0.002, 0.001, 0, 0.04, 0.0125);
  },
  socket(b) {
    // Розетка: круглая накладка с двумя гнёздами, начало — центр, z=0 — стена
    faceCyl(b, 'plastic_white', 0.04, 0, 0, 0.005, 0.01);
    for (const x of [-0.0125, 0.0125]) faceCyl(b, 'black', 0.005, x, 0, 0.0105, 0.002);
  },
  trash_chute(b) {
    // Мусоропровод идёт сквозь плиту 7-го этажа до потолка (h комнаты 4.4)
    b.box('rust', 0.5, 4.4, 0.45, 0, 0, 0);
    b.box('metal', 0.42, 0.35, 0.06, 0, 0.75, 0.215);
    b.box('black', 0.3, 0.02, 0.02, 0, 0.92, 0.25);
    b.col(0, 0, 0.5, 0.45);
  },
  stairs(b) {
    // Лестничная клетка панельного дома. Предмет ставится в начало координат, все размеры — мировые (x 11.14..16.6, z -2.6..2.6).
    // 6-й этаж — площадка x 11.14..12.9 (y=0). Над ней — плита 7-го этажа (+2.72, подбой на 2.52).
    //   С площадки на север (-Z половина) вверх на восток идёт марш 1 до полуэтажа (+1.36) у восточной стены;
    //   с полуэтажа на юг (+Z половина) марш 2 возвращается на запад до плиты 7-го этажа.
    //   Вниз с площадки по +Z половине спускается марш до нижнего полуэтажа (-1.36) — он перекрыт приваренным щитом.
    const X0 = 12.9, SX = 0.28, R = 0.17, N = 7, XL = X0 + N * SX, XE = 16.6, ZN = -2.6, ZS = 2.6, G = 0.15;
    const YM = 1.36, Y7 = 2.72, SLAB = 0.2, TH = 0.34, PIT = -1.36;
    const ZC1 = (ZN - G) / 2, W1 = -G - ZN;     // северная половина
    const ZC2 = (ZS + G) / 2, W2 = ZS - G;      // южная половина
    const slope = Math.atan2(R, SX);
    // --- шахта под площадкой и нижний полуэтаж: пол, торцевые стены ниже уровня 6-го этажа
    b.plane('floor_concrete', XE - X0, ZS - ZN, (X0 + XE) / 2, PIT, 0, -Math.PI / 2);
    b.plane('wall_concrete', ZS - ZN, -PIT, X0, PIT / 2, 0, 0, Math.PI / 2);        // западная стенка шахты (под краем площадки)
    b.plane('wall_concrete', XE - X0, -PIT, (X0 + XE) / 2, PIT / 2, ZN, 0, 0);      // северная
    b.plane('wall_concrete', XE - X0, -PIT, (X0 + XE) / 2, PIT / 2, ZS, 0, Math.PI); // южная
    b.plane('wall_concrete', ZS - ZN, -PIT, XE, PIT / 2, 0, 0, -Math.PI / 2);       // восточная
    // --- плита 7-го этажа над площадкой и её торец
    b.box('wall_concrete', X0 - 11.14, SLAB, ZS - ZN, (11.14 + X0) / 2, Y7 - SLAB, 0);
    // --- полуэтаж +1.36 (плита с толщиной)
    b.box('wall_concrete', XE - XL, SLAB, ZS - ZN, (XL + XE) / 2, YM - SLAB, 0);
    // --- марш 1 (север): вверх на восток
    for (let i = 0; i < N; i++) {
      const top = (i + 1) * R;
      b.box('floor_concrete', SX, TH, W1, X0 + (i + 0.5) * SX, top - TH, ZC1);
    }
    // --- марш 2 (юг): от полуэтажа вверх на запад до плиты 7-го этажа
    for (let j = 0; j < N; j++) {
      const top = YM + (j + 1) * R;
      b.box('floor_concrete', SX, TH, W2, XL - (j + 0.5) * SX, top - TH, ZC2);
    }
    // --- марш вниз (юг): от площадки на восток до нижнего полуэтажа
    for (let k = 0; k < N; k++) {
      const top = -(k + 1) * R;
      const bot = Math.max(top - TH, PIT);
      b.box('floor_concrete', SX, top - bot, W2, X0 + (k + 0.5) * SX, bot, ZC2);
    }
    // --- перила: стойки и поручень по краю проёма между маршами
    const railBox = (xa, ya, xb, yb, z) => {
      const L = Math.hypot(xb - xa, yb - ya);
      const m = b.box('wood_dark', L, 0.05, 0.06, (xa + xb) / 2, 0, z);
      m.position.y = (ya + yb) / 2;
      m.rotation.z = Math.atan2(yb - ya, xb - xa);
    };
    const balusters = (x, yBase, z, h = 0.9) => b.box('metal', 0.022, h, 0.022, x, yBase, z);
    for (let i = 0; i < N; i++) if (i % 2 === 0 || i === N - 1) balusters(X0 + (i + 0.5) * SX, (i + 1) * R, -G + 0.04);
    railBox(X0 + 0.5 * SX, R + 0.9, XL - 0.5 * SX, N * R + 0.9, -G + 0.04);
    for (let j = 0; j < N; j++) if (j % 2 === 0 || j === N - 1) balusters(XL - (j + 0.5) * SX, YM + (j + 1) * R, G - 0.04);
    railBox(XL - 0.5 * SX, YM + R + 0.9, X0 + 0.5 * SX, YM + N * R + 0.9, G - 0.04);
    for (let k = 0; k < N; k++) if (k % 2 === 0 || k === N - 1) balusters(X0 + (k + 0.5) * SX, -(k + 1) * R, G - 0.04);
    railBox(X0 + 0.5 * SX, -R + 0.9, XL - 0.5 * SX, -N * R + 0.9, G - 0.04);
    // ограждение края плиты 7-го этажа над северной половиной проёма
    for (let z = -2.4; z <= -0.3; z += 0.35) balusters(X0 - 0.04, Y7, z);
    b.box('wood_dark', 0.06, 0.05, W1 - 0.1, X0 - 0.04, Y7 + 0.9, ZC1);
    // --- решётка на седьмой этаж (на замке) у подножия марша 1, под торцом плиты
    const XG = X0 - 0.02, HG = Y7 - SLAB - 0.02;
    for (let z = ZN + 0.12; z < -G - 0.05; z += 0.12) b.box('metal', 0.02, HG, 0.02, XG, 0, z);
    for (const y of [0.3, 1.2, HG - 0.05]) b.box('metal', 0.03, 0.05, W1, XG, y, ZC1);
    for (const z of [ZN + 0.03, -G - 0.03]) b.box('metal', 0.05, HG, 0.05, XG, 0, z);
    b.box('rust', 0.04, 0.12, 0.09, XG - 0.035, 1.05, -0.5);       // навесной замок
    b.box('metal', 0.02, 0.05, 0.2, XG - 0.015, 1.15, -0.42);      // петля-проушина
    // --- металлический щит, приваренный к перилам нижнего марша (до подбоя марша 2)
    const HS = Y7 - SLAB - 0.02;
    b.box('metal', 0.04, HS + 0.3, ZS - (-G), XG, -0.3, (ZS - G) / 2);
    for (const y of [0.35, 1.25, HS - 0.12]) b.box('rust', 0.03, 0.07, ZS + G, XG - 0.03, y, (ZS - G) / 2);
    for (const z of [-G + 0.04, ZS - 0.04]) b.box('rust', 0.03, HS, 0.07, XG - 0.03, 0, z);
    b.sign(b.a.signMaterial(['#ПРОХОД ЗАКРЫТ', 'Режим ЧС', 'Штаб ГОЧС г.о.'], { w: 512, h: 256, bg: '#d6c94a', fg: '#111', titleSize: 46, size: 26 }), 0.9, 0.45, XG - 0.047, 1.65, 1.35, 0, -Math.PI / 2);
    // Игрок остаётся на площадке: всё восточнее x=12.75 — недоступно
    b.col((12.75 + XE) / 2, 0, XE - 12.75, ZS - ZN);
  },
  stair_window_stuff(b) {
    b.box('metal', 0.12, 0.1, 0.12, 0, 0, 0);
    b.box('paper', 0.04, 0.012, 0.012, 0.02, 0.1, 0.02);
  },
  // --------- Особое ---------
  water_stack(b) {
    // Запасы воды Лапина — инстансинг повторяющихся бутылок; между слоями прокладки из картона
    const geo = cylGeo(0.045, 0.045, 0.3, 8);
    const mat = b.a.material('glass_wired');
    const count = 42;
    const inst = new THREE.InstancedMesh(geo, mat, count);
    const m = new THREE.Matrix4();
    let k = 0;
    for (let layer = 0; layer < 3; layer++) for (let r = 0; r < 2; r++) for (let c = 0; c < 7; c++) {
      m.makeTranslation(-0.3 + c * 0.1, 0.02 + 0.15 + layer * 0.311, -0.05 + r * 0.1);
      inst.setMatrixAt(k++, m);
    }
    inst.userData.dynamic = true;
    b.group.add(inst);
    for (let layer = 0; layer < 3; layer++) b.box('cardboard', 0.75, 0.01, 0.25, 0, layer * 0.311 + 0.01, 0);
  },
  led_strip(b, o) {
    b.box(b.a.material('led_purple'), o.w || 1.8, 0.02, 0.02, 0, o.y || 2.3, 0);
  },
  crowbar(b) {
    // Лом лежит на полу, загнутый конец чуть в стороне
    b.box('rust', 0.025, 0.025, 0.8, 0, 0, 0);
    b.box('rust', 0.025, 0.025, 0.14, 0.04, 0, -0.44, -0.6);
  },
};

export function buildProp(name, assets, opts = {}) {
  const fn = PROPS[name];
  const b = new PropBuilder(assets);
  if (!fn) { console.warn(`[Props] неизвестный предмет ${name}`); return b.done(); }
  fn(b, opts);
  return b.done();
}
