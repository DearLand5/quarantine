// Сборка трёхмерного этажа из данных locations.js и furnishing.js.
// Статическая геометрия объединяется по материалам и комнатам (StaticBatcher), чтобы снизить число вызовов отрисовки.
import * as THREE from 'three';
import { ROOMS, DOORS, WINDOWS, FIXTURES } from '../data/locations.js';
import { FURNISHING } from '../data/furnishing.js';
import { planeGeo, boxGeo, cylGeo, sphereGeo } from './geometry.js';
import { buildProp } from './Props.js';
import { Door } from './Door.js';
import { batchStatic } from './StaticBatcher.js';
import { buildExterior } from './Exterior.js';

const HIT_MAT = new THREE.MeshBasicMaterial({ visible: false });
const GAP = 0.14;

export class WorldBuilder {
  constructor(assets, state) {
    this.assets = assets;
    this.state = state;
    this.root = new THREE.Group();
    this.root.name = 'world';
    this.staticRoot = new THREE.Group();
    this.dynamicRoot = new THREE.Group();
    this.root.add(this.staticRoot, this.dynamicRoot);
    this.colliders = [];        // статические AABB { minX, maxX, minZ, maxZ }
    this.hits = [];             // интерактивные зоны
    this.doors = new Map();
    this.named = new Map();     // именованные предметы и их части (laptop47, panel, cctv…)
    this.fixtures = [];
    this.rooms = new Map();
    this.exterior = null;
  }

  build() {
    for (const room of ROOMS) this.buildRoom(room);
    for (const def of DOORS) this.buildDoor(def);
    for (const item of FURNISHING) this.placeItem(item);
    for (const fx of FIXTURES) this.buildFixture(fx);
    this.exterior = buildExterior(this.assets);
    this.root.add(this.exterior.group);
    // Объединяем статическую геометрию
    const stats = batchStatic(this.staticRoot);
    this.batchStats = stats;
    return this;
  }

  // ------------------------------------------------------------------ комнаты
  buildRoom(room) {
    this.rooms.set(room.id, room);
    const zone = room.id;
    const a = this.assets;
    const floorMat = a.material(room.floor);
    const ceilMat = a.material(room.ceiling);
    const rects = room.floorRects || [{ x0: room.x0, x1: room.x1, z0: room.z0, z1: room.z1 }];
    for (const r of rects) {
      const w = r.x1 - r.x0, d = r.z1 - r.z0;
      const floor = new THREE.Mesh(planeGeo(w, d, r.x0, -r.z1), floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set((r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2);
      this.addStatic(floor, zone);
    }
    {
      const w = room.x1 - room.x0, d = room.z1 - room.z0;
      const ceil = new THREE.Mesh(planeGeo(w, d, room.x0, room.z0), ceilMat);
      ceil.rotation.x = Math.PI / 2;
      ceil.position.set((room.x0 + room.x1) / 2, room.h, (room.z0 + room.z1) / 2);
      ceil.castShadow = false;
      this.addStatic(ceil, zone);
      // Плинтус по периметру — небольшая деталь, сильно добавляющая «обжитости»
    }
    for (const side of ['n', 's', 'e', 'w']) this.buildWall(room, side);
    if (room.glimpse) {
      // В чужую прихожую зайти нельзя: невидимый барьер сразу за порогом
      this.colliders.push({ minX: room.x0, maxX: room.x1, minZ: room.z0, maxZ: room.z1, glimpse: room.id });
    }
  }

  buildWall(room, side) {
    const a = this.assets;
    const horizontal = side === 'n' || side === 's';
    const start = horizontal ? room.x0 : room.z0;
    const end = horizontal ? room.x1 : room.z1;
    const line = side === 'n' ? room.z0 : side === 's' ? room.z1 : side === 'w' ? room.x0 : room.x1;
    const outward = side === 'n' || side === 'w' ? -1 : 1;
    const openings = (room.openings || []).filter((o) => o.side === side)
      .map((o) => ({ ...o, a: o.at - o.w / 2, b: o.at + o.w / 2 }))
      .sort((p, q) => p.a - q.a);
    const H = room.h;
    const wain = room.wainscot;

    // Вертикальные полосы стены между проёмами
    let cursor = start;
    const solid = [];
    for (const o of openings) {
      if (o.a > cursor) solid.push([cursor, o.a]);
      cursor = Math.max(cursor, o.b);
    }
    if (cursor < end) solid.push([cursor, end]);

    const piece = (s0, s1, y0, y1) => {
      if (s1 - s0 < 0.005 || y1 - y0 < 0.005) return;
      const cut = wain && y0 < wain.h && y1 > wain.h ? [[y0, wain.h], [wain.h, y1]] : [[y0, y1]];
      for (const [p0, p1] of cut) {
        const matName = wain && p1 <= wain.h + 1e-4 ? wain.mat : room.wall;
        const w = s1 - s0, h = p1 - p0;
        const mesh = new THREE.Mesh(planeGeo(w, h, s0 - start, p0), a.material(matName));
        const c = (s0 + s1) / 2, cy = (p0 + p1) / 2;
        if (horizontal) mesh.position.set(c, cy, line);
        else mesh.position.set(line, cy, c);
        mesh.rotation.y = { n: 0, s: Math.PI, w: Math.PI / 2, e: -Math.PI / 2 }[side];
        this.addStatic(mesh, room.id);
      }
    };

    for (const [s0, s1] of solid) {
      piece(s0, s1, 0, H);
      this.pushWallCollider(horizontal, line, outward, s0, s1);
    }
    for (const o of openings) {
      const top = (o.sill || 0) + o.h;
      piece(o.a, o.b, top, H);                       // перемычка над проёмом
      if (o.sill) piece(o.a, o.b, 0, o.sill);        // подоконная часть
      if (o.window) {
        this.pushWallCollider(horizontal, line, outward, o.a, o.b);
        this.buildWindow(room, o, horizontal, line, outward);
      }
      if (o.open) this.buildReveal(room, o, horizontal, line, outward, GAP / 2 + 0.002, room.wall);
      // Плинтус не нужен в проёмах
    }
    // Плинтусы вдоль сплошных участков
    for (const [s0, s1] of solid) {
      const len = s1 - s0;
      if (len < 0.05) continue;
      const geo = boxGeo(len, 0.07, 0.015);
      const m = new THREE.Mesh(geo, a.material(room.floor === 'floor_concrete' || room.floor === 'floor_corridor' ? 'wall_paint_green' : 'wood_dark'));
      const c = (s0 + s1) / 2;
      const off = -outward * 0.008;
      if (horizontal) m.position.set(c, 0.035, line + off);
      else { m.position.set(line + off, 0.035, c); m.rotation.y = Math.PI / 2; }
      this.addStatic(m, room.id);
    }
  }

  pushWallCollider(horizontal, line, outward, s0, s1) {
    const t0 = outward < 0 ? line - 0.12 : line;
    const t1 = outward < 0 ? line : line + 0.12;
    if (horizontal) this.colliders.push({ minX: s0, maxX: s1, minZ: t0, maxZ: t1 });
    else this.colliders.push({ minX: t0, maxX: t1, minZ: s0, maxZ: s1 });
  }

  /** Откосы проёма: боковые и верхняя плоскости, закрывающие толщину стены. */
  buildReveal(room, o, horizontal, line, outward, depth, matName) {
    const mat = this.assets.material(matName);
    const y0 = o.sill || 0, y1 = y0 + o.h;
    const mid = line + outward * depth / 2;
    for (const edge of [o.a, o.b]) {
      const mesh = new THREE.Mesh(planeGeo(depth, y1 - y0, 0, y0), mat);
      const facing = edge === o.a ? 1 : -1; // откос смотрит внутрь проёма
      if (horizontal) { mesh.position.set(edge, (y0 + y1) / 2, mid); mesh.rotation.y = facing > 0 ? Math.PI / 2 : -Math.PI / 2; }
      else { mesh.position.set(mid, (y0 + y1) / 2, edge); mesh.rotation.y = facing > 0 ? 0 : Math.PI; }
      this.addStatic(mesh, room.id);
    }
    const top = new THREE.Mesh(planeGeo(o.b - o.a, depth), mat);
    top.rotation.x = Math.PI / 2;
    if (horizontal) top.position.set(o.at, y1, mid);
    else { top.position.set(mid, y1, o.at); top.rotation.z = Math.PI / 2; }
    this.addStatic(top, room.id);
    if (o.sill) {
      const sill = new THREE.Mesh(boxGeo(horizontal ? o.b - o.a + 0.1 : depth + 0.08, 0.04, horizontal ? depth + 0.08 : o.b - o.a + 0.1), this.assets.material('enamel'));
      if (horizontal) sill.position.set(o.at, y0 - 0.02, mid - outward * 0.04);
      else sill.position.set(mid - outward * 0.04, y0 - 0.02, o.at);
      this.addStatic(sill, room.id);
    }
  }

  buildWindow(room, o, horizontal, line, outward) {
    const depth = 0.32;
    this.buildReveal(room, o, horizontal, line, outward, depth, room.wainscot && (o.sill || 0) < room.wainscot.h ? room.wall : room.wall);
    const a = this.assets;
    const g = new THREE.Group();
    const w = o.b - o.a, h = o.h;
    const frameMat = a.material('enamel');
    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
    // Деревянная рама с форточкой: локальные оси — X вдоль стены, Z наружу
    add(boxGeo(w, 0.06, 0.08), frameMat, 0, 0.03, 0);
    add(boxGeo(w, 0.06, 0.08), frameMat, 0, h - 0.03, 0);
    add(boxGeo(0.06, h, 0.08), frameMat, -w / 2 + 0.03, h / 2, 0);
    add(boxGeo(0.06, h, 0.08), frameMat, w / 2 - 0.03, h / 2, 0);
    add(boxGeo(0.05, h, 0.08), frameMat, 0, h / 2, 0);
    add(boxGeo(w / 2, 0.04, 0.08), frameMat, -w / 4, h * 0.72, 0);
    const glass = add(boxGeo(w, h, 0.005), a.material('glass'), 0, h / 2, 0.02);
    glass.castShadow = false;
    g.position.y = o.sill || 0;
    const off = outward * (depth - 0.1);
    if (horizontal) { g.position.x = o.at; g.position.z = line + off; }
    else { g.position.x = line + off; g.position.z = o.at; g.rotation.y = Math.PI / 2; }
    for (const m of g.children) { m.castShadow = false; m.receiveShadow = true; }
    g.updateMatrixWorld(true);
    // Переносим детали окна в статическую группу
    for (const m of [...g.children]) {
      m.applyMatrix4(g.matrix);
      this.addStatic(m, room.id);
    }
    const def = WINDOWS[o.window] || {};
    if (def.curtains) {
      const mat = a.material('fabric');
      for (const s of [-1, 1]) {
        const c = new THREE.Mesh(boxGeo(horizontal ? 0.45 : 0.06, Math.min(2.4, (o.sill || 0) + h + 0.25), horizontal ? 0.06 : 0.45), mat);
        const along = o.at + s * (w / 2 + 0.12);
        const cy = c.geometry.parameters.height / 2 + 0.05;
        if (horizontal) c.position.set(along, cy, line - outward * 0.08);
        else c.position.set(line - outward * 0.08, cy, along);
        this.addStatic(c, room.id);
      }
    }
  }

  // ------------------------------------------------------------------ двери
  buildDoor(def) {
    const st = this.state.door(def.id);
    if (st._init !== true) {
      Object.assign(st, { open: false, locked: true, chained: false, sealed: false }, def.initial || {}, { _init: true });
    }
    const door = new Door(def, this.assets, st);
    door.snap();
    this.dynamicRoot.add(door.root);
    this.doors.set(def.id, door);
    this.hits.push(...door.hits);
  }

  // ------------------------------------------------------------------ предметы
  resolveMat(spec) {
    if (!spec) return spec;
    if (typeof spec === 'object' && spec.lines) return this.assets.signMaterial(spec.lines, spec.opts || {});
    if (spec === 'photo_mom') return this.assets.signMaterial(['', '◠◡◠  ◠◡◠', '', 'Анапа, 2019'], { w: 192, h: 256, bg: '#6f8c99', fg: '#f4ead0', size: 28 });
    if (spec === 'photo_p17') return this.assets.signMaterial(['#П/Я 17 · 1984', '', '♙ ♙ ♙ ♙ ♙ ♙', '♙ ♙ ♙ ♙ ♙', '', 'отдел акустики'], { w: 384, h: 280, bg: '#8a7a5a', fg: '#2a2016', titleColor: '#2a2016', size: 26, titleSize: 28 });
    return spec;
  }

  placeItem(item) {
    const parent = new THREE.Group();
    parent.position.set(item.x, item.y || 0, item.z);
    parent.rotation.y = item.rot || 0;
    parent.updateMatrixWorld(true);
    let built = null;
    if (!item.hitOnly) {
      const opts = { ...(item.opts || {}) };
      if (opts.mat && typeof opts.mat !== 'string') opts.mat = this.resolveMat(opts.mat);
      else if (opts.mat === 'photo_mom' || opts.mat === 'photo_p17') opts.mat = this.resolveMat(opts.mat);
      built = buildProp(item.prop, this.assets, opts);
      parent.add(built.group);
      parent.updateMatrixWorld(true);
      // Коллайдеры предмета в мировые координаты (поворот кратен 90°)
      for (const c of built.colliders) this.colliders.push(this.transformCollider(c, item));
      if (item.name) this.named.set(item.name, { group: built.group, parts: built.parts, item });
    }
    if (item.hit) {
      const [w, h, d] = item.hit.size;
      const [ox, oy, oz] = item.hit.offset || [0, 0, 0];
      const hit = new THREE.Mesh(boxGeo(w, h, d), HIT_MAT);
      hit.position.set(ox, oy + h / 2, oz);
      hit.userData.hitId = item.hit.id;
      hit.userData.room = item.room;
      parent.add(hit);
      this.hits.push(hit);
    }
    // Разносим меши: статические — в batching, динамические — в отдельную группу
    parent.updateMatrixWorld(true);
    const meshes = [];
    parent.traverse((o) => { if (o.isMesh || o.isInstancedMesh) meshes.push(o); });
    for (const m of meshes) {
      const world = m.matrixWorld.clone();
      m.removeFromParent();
      world.decompose(m.position, m.quaternion, m.scale);
      if (m.userData.hitId || m.userData.dynamic || m.isInstancedMesh || (m.material && m.material.name && m.material.name.includes('#unique'))) {
        this.dynamicRoot.add(m);
      } else {
        this.addStatic(m, item.room);
      }
    }
  }

  transformCollider(c, item) {
    const rot = Math.round(((item.rot || 0) / (Math.PI / 2)) % 4 + 4) % 4;
    let { x, z, w, d } = c;
    let wx = x, wz = z, ww = w, wd = d;
    if (rot === 1) { wx = z; wz = -x; ww = d; wd = w; }
    else if (rot === 2) { wx = -x; wz = -z; }
    else if (rot === 3) { wx = -z; wz = x; ww = d; wd = w; }
    const cx = item.x + wx, cz = item.z + wz;
    return { minX: cx - ww / 2, maxX: cx + ww / 2, minZ: cz - wd / 2, maxZ: cz + wd / 2 };
  }

  // ------------------------------------------------------------------ светильники
  buildFixture(fx) {
    const a = this.assets;
    const glowMat = a.uniqueMaterial(fx.type === 'emergency' ? 'lamp_red' : 'lamp_on');
    glowMat.color.setHex(fx.color);
    const g = new THREE.Group();
    g.position.set(fx.x, fx.y, fx.z);
    let glow = null;
    if (fx.type === 'plafond') {
      const base = new THREE.Mesh(cylGeo(0.2, 0.2, 0.03, 16), a.material('enamel'));
      base.position.y = 0.06;
      glow = new THREE.Mesh(sphereGeo(0.19, 14, 8), glowMat);
      glow.scale.set(1, 0.38, 1);
      g.add(base, glow);
    } else if (fx.type === 'bulb') {
      const wire = new THREE.Mesh(cylGeo(0.006, 0.006, 0.25, 4), a.material('black'));
      wire.position.y = 0.13;
      const sock = new THREE.Mesh(cylGeo(0.025, 0.025, 0.06, 8), a.material('black'));
      sock.position.y = 0.02;
      glow = new THREE.Mesh(sphereGeo(0.05, 10, 8), glowMat);
      glow.position.y = -0.04;
      g.add(wire, sock, glow);
    } else if (fx.type === 'chandelier') {
      const rod = new THREE.Mesh(cylGeo(0.01, 0.01, 0.3, 4), a.material('brass'));
      rod.position.y = 0.0;
      g.add(rod);
      glow = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const ang = (i / 3) * Math.PI * 2;
        const shade = new THREE.Mesh(cylGeo(0.05, 0.09, 0.1, 10), glowMat);
        shade.position.set(Math.cos(ang) * 0.2, -0.15, Math.sin(ang) * 0.2);
        glow.add(shade);
      }
      const arm = new THREE.Mesh(cylGeo(0.012, 0.012, 0.44, 4), a.material('brass'));
      arm.rotation.z = Math.PI / 2; arm.position.y = -0.12;
      g.add(arm, glow);
    } else if (fx.type === 'emergency') {
      const box = new THREE.Mesh(boxGeo(0.3, 0.1, 0.06), glowMat);
      const sign = new THREE.Mesh(planeGeo(0.28, 0.08), a.signMaterial(['ВЫХОД'], { w: 128, h: 40, bg: '#1d3', fg: '#fff', size: 26, pad: 4, aged: false, basic: true }));
      sign.position.set(0, 0.1, 0.02);
      sign.rotation.y = -Math.PI / 2;
      box.rotation.y = Math.PI / 2;
      g.add(box);
      glow = box;
    }
    this.dynamicRoot.add(g);
    const named = this.named.get(fx.id === 'L_desk47' ? 'desklamp47' : '');
    if (named?.parts?.bulb) glow = named.parts.bulb;
    this.fixtures.push({ def: fx, group: g, glow, glowMat: glow?.material || glowMat });
  }

  addStatic(mesh, zone) {
    mesh.userData.zone = zone;
    if (mesh.castShadow === undefined) mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.staticRoot.add(mesh);
  }

  getDoor(id) { return this.doors.get(id); }

  roomAt(x, z) {
    for (const room of this.rooms.values()) {
      if (x >= room.x0 - 0.07 && x <= room.x1 + 0.07 && z >= room.z0 - 0.07 && z <= room.z1 + 0.07) return room;
    }
    return null;
  }

  dispose() {
    this.root.traverse((o) => { if (o.geometry && o.userData.batched) o.geometry.dispose(); });
    this.exterior?.dispose?.();
  }
}
