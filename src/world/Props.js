// Каталог процедурных предметов интерьера. Каждый предмет — функция, собирающая группу из примитивов
// с общими материалами. Возвращает { group, colliders, hits, parts }.
// Координаты внутри предмета: X — ширина, Z — глубина («перед» предмета смотрит в +Z), Y — от пола.
// Эти модели — заменяемые заготовки: WorldBuilder может подставить GLB из assets/models (см. README).
import * as THREE from 'three';
import { boxGeo, cylGeo, sphereGeo, planeGeo } from './geometry.js';

const HIT_MAT = new THREE.MeshBasicMaterial({ visible: false });

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
    // книги
    for (let i = 0; i < 14; i++) {
      const bw = 0.03 + (i % 3) * 0.012;
      b.box(i % 2 ? 'books' : 'fabric_red', bw, 0.22 + (i % 4) * 0.02, 0.18, -w / 2 + 0.1 + i * 0.05, 0.775, 0.05);
    }
    // посуда за стеклом
    for (let i = 0; i < 5; i++) b.cyl('ceramic', 0.04, 0.03, 0.09, -0.3 + i * 0.15, 1.175, 0);
    for (let i = 0; i < 4; i++) b.box('ceramic', 0.02, 0.18, 0.18, -0.25 + i * 0.16, 1.575, -0.05);
    b.box('glass', w / 3 - 0.05, 1.18, 0.01, 0, 0.76, d / 2);
    for (let i = 0; i < 9; i++) b.box(i % 3 ? 'books' : 'wood', 0.04, 0.24, 0.2, w / 6 + 0.08 + i * 0.05, 1.175, 0.05);
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
    const lid = b.box('plastic_dark', 0.34, 0.22, 0.012, 0, 0.02, -0.12);
    lid.rotation.x = -0.25;
    const screen = b.dynamic(b.plane(b.a.uniqueMaterial('screen_glow'), 0.3, 0.18, 0, 0.13, -0.098, -0.25));
    b.parts.screen = screen;
  },
  desklamp(b) {
    b.cyl('plastic_dark', 0.08, 0.09, 0.03, 0, 0, 0);
    const arm = b.box('chrome', 0.015, 0.38, 0.015, 0, 0.03, 0);
    arm.rotation.z = 0.25;
    b.cyl('plastic_dark', 0.05, 0.11, 0.12, 0.08, 0.34, 0.02);
    const bulb = b.dynamic(b.sphere(b.a.uniqueMaterial('lamp_on'), 0.035, 0.08, 0.35, 0.02));
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
    for (const [x, z] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) b.cyl('black', 0.07, 0.07, 0.02, x, 0.855, z, 10);
    b.box('glass', 0.38, 0.3, 0.01, 0, 0.3, 0.292);
    b.box('chrome', 0.36, 0.025, 0.03, 0, 0.66, 0.305);
    for (let i = 0; i < 4; i++) b.cyl('plastic_dark', 0.018, 0.018, 0.03, -0.15 + i * 0.1, 0.74, 0.3, 8).rotation.x = Math.PI / 2;
    b.col(0, 0, 0.5, 0.58);
  },
  kitchen_counter(b, o) {
    const w = o.w || 1.2;
    b.box('enamel', w, 0.82, 0.58, 0, 0, 0);
    b.box('wood_dark', w, 0.04, 0.6, 0, 0.82, 0.01);
    for (let i = 0; i < Math.round(w / 0.4); i++) b.box('chrome', 0.1, 0.015, 0.02, -w / 2 + 0.2 + i * 0.4, 0.7, 0.3);
    if (o.sink) {
      b.box('chrome', 0.45, 0.02, 0.4, o.sinkX || 0, 0.86, 0);
      b.box('black', 0.38, 0.005, 0.32, o.sinkX || 0, 0.875, 0);
      b.cyl('chrome', 0.015, 0.015, 0.25, o.sinkX || 0, 0.86, -0.22, 8);
      b.box('chrome', 0.02, 0.02, 0.16, o.sinkX || 0, 1.09, -0.15);
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
    b.box('black', 0.02, 0.1, 0.12, -0.0, 0.2, 0);
  },
  radio(b) {
    b.box('wood_dark', 0.32, 0.18, 0.12, 0, 0, 0);
    b.box('fabric', 0.16, 0.12, 0.005, -0.06, 0.03, 0.061);
    b.box('plastic_beige', 0.08, 0.06, 0.005, 0.09, 0.08, 0.061);
    b.cyl('chrome', 0.004, 0.004, 0.35, 0.12, 0.18, -0.04, 4).rotation.z = -0.5;
  },
  bathtub(b) {
    b.box('enamel', 0.7, 0.58, 1.6, 0, 0, 0);
    b.box('floor_bath', 0.56, 0.01, 1.44, 0, 0.58, 0);
    b.box('chrome', 0.04, 0.04, 0.2, 0, 0.75, -0.7);
    b.col(0, 0, 0.7, 1.6);
  },
  toilet(b) {
    b.box('ceramic', 0.36, 0.4, 0.5, 0, 0, 0.05);
    b.box('ceramic', 0.38, 0.35, 0.18, 0, 0.42, -0.2);
    b.box('plastic_white', 0.38, 0.03, 0.48, 0, 0.4, 0.06);
    b.col(0, 0, 0.4, 0.62);
  },
  washbasin(b) {
    b.box('ceramic', 0.5, 0.15, 0.4, 0, 0.72, 0);
    b.cyl('ceramic', 0.06, 0.08, 0.72, 0, 0, -0.05, 10);
    b.box('chrome', 0.03, 0.12, 0.03, 0, 0.87, -0.15);
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
    b.box('wood', 1.0, 0.1, 0.03, 0, 1.65, 0);
    for (let i = 0; i < 5; i++) b.box('brass', 0.02, 0.02, 0.08, -0.4 + i * 0.2, 1.68, 0.04);
    const coats = o.coats || ['cloth_dark', 'fabric'];
    coats.forEach((c, i) => b.box(c, 0.38, 0.9, 0.18, -0.3 + i * 0.42, 0.75, 0.1));
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
    const w = o.w || 0.8, h = o.h || 1.8;
    b.box('wood', w, h, 0.3, 0, 0, 0);
    for (let s = 0; s < 4; s++) {
      for (let i = 0; i < Math.floor(w / 0.05) - 2; i++) {
        if ((i * 7 + s * 3) % 11 === 0) continue;
        b.box(['books', 'fabric_red', 'fabric', 'wood_dark'][(i + s) % 4], 0.035, 0.2 + ((i + s) % 3) * 0.03, 0.2, -w / 2 + 0.07 + i * 0.045, 0.08 + s * (h / 4), 0.06);
      }
    }
    b.col(0, 0, w, 0.3);
  },
  plant(b) {
    b.cyl('soil', 0.13, 0.1, 0.22, 0, 0, 0, 10);
    for (let i = 0; i < 7; i++) {
      const leaf = b.box('plant', 0.06, 0.4 + (i % 3) * 0.1, 0.02, Math.cos(i) * 0.05, 0.2, Math.sin(i) * 0.05);
      leaf.rotation.set(Math.sin(i * 2) * 0.5, i, Math.cos(i * 3) * 0.5);
    }
  },
  radiator(b, o) {
    const n = o.n || 8;
    for (let i = 0; i < n; i++) b.box('enamel', 0.07, 0.55, 0.12, -n * 0.04 + i * 0.08 + 0.04, 0.12, 0);
    b.cyl('enamel', 0.015, 0.015, n * 0.08, 0, 0.6, 0, 6).rotation.z = Math.PI / 2;
  },
  boxes(b, o) {
    const n = o.n || 3;
    for (let i = 0; i < n; i++) {
      const s = 0.3 + (i % 2) * 0.12;
      const m = b.box('cardboard', s, s * 0.8, s, (i % 2) * 0.1, i > 1 ? 0.33 : 0, (i % 3) * 0.08 - 0.05, i * 0.3);
      m.rotation.y = i * 0.4;
    }
    b.col(0, 0, 0.55, 0.55);
  },
  trash_bags(b) {
    b.sphere('trash_bag', 0.22, 0, 0.2, 0, 1, 1.1, 0.9);
    b.sphere('trash_bag', 0.18, 0.25, 0.16, 0.08, 1, 1.0, 1);
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
    b.plane(o.mat || 'paper', o.w || 0.3, o.h || 0.4, 0, (o.y || 1.5) + (o.h || 0.4) / 2, 0.021);
  },
  wall_clock(b, o) {
    b.cyl('wood_dark', 0.16, 0.16, 0.04, 0, o.y || 1.9, 0, 16).rotation.x = Math.PI / 2;
    b.cyl('enamel', 0.14, 0.14, 0.01, 0, (o.y || 1.9), 0.025, 16).rotation.x = Math.PI / 2;
  },
  icon_shelf(b) {
    b.box('wood_dark', 0.4, 0.03, 0.15, 0, 1.75, 0);
    b.box('brass', 0.14, 0.18, 0.015, -0.08, 1.78, 0.0);
    b.box('brass', 0.1, 0.14, 0.015, 0.1, 1.78, 0.02);
    b.cyl('lamp_red', 0.02, 0.025, 0.05, 0.0, 1.78, 0.05, 8);
  },
  sideboard(b) {
    b.box('veneer', 1.3, 0.8, 0.45, 0, 0, 0);
    b.box('veneer', 1.3, 0.9, 0.35, 0, 0.8, -0.05);
    b.box('glass', 1.2, 0.8, 0.01, 0, 0.85, 0.13);
    for (let i = 0; i < 6; i++) b.cyl('ceramic', 0.05, 0.04, 0.1, -0.5 + i * 0.2, 0.85, -0.05);
    for (let i = 0; i < 5; i++) b.box('ceramic', 0.02, 0.2, 0.2, -0.4 + i * 0.2, 1.25, -0.08);
    b.col(0, 0, 1.3, 0.45);
  },
  // --------- Коридор и лестница ---------
  electric_panel(b) {
    b.box('metal', 0.6, 0.9, 0.16, 0, 1.1, 0);
    const door = b.dynamic(b.box('metal', 0.58, 0.88, 0.02, 0, 1.11, 0.085));
    b.parts.door = door;
    b.plane(b.a.signMaterial(['#⚡', 'ЩЭ-6'], { w: 128, h: 128, bg: '#c9a024', fg: '#111', titleSize: 54, size: 22 }), 0.12, 0.12, 0, 1.75, 0.097);
    b.cyl('metal', 0.02, 0.02, 1.0, 0.2, 2.0, -0.03, 6);
    b.cyl('metal', 0.015, 0.015, 1.0, 0.24, 2.0, -0.03, 6);
  },
  notice_board(b, o) {
    b.box('wood_dark', 1.2, 0.8, 0.03, 0, 1.15, 0);
    (o.sheets || []).forEach((s) => b.plane(b.a.signMaterial(s.lines, s.opts || {}), s.w, s.h, s.x, s.y, 0.02 + (s.dz || 0)));
  },
  fire_cabinet(b) {
    b.box(b.a.signMaterial(['#ПК', 'пожарный кран'], { w: 256, h: 256, bg: '#8f2a22', fg: '#e8d9c0', titleSize: 80 }), 0.55, 0.7, 0.2, 0, 1.0, 0);
  },
  cctv(b) {
    b.box('plastic_white', 0.06, 0.06, 0.12, 0, 0, -0.05);
    const cam = b.box('plastic_white', 0.09, 0.08, 0.2, 0, -0.08, 0.06);
    cam.rotation.x = 0.35;
    const led = b.dynamic(b.sphere(b.a.uniqueMaterial('lamp_off'), 0.008, 0.03, -0.06, 0.16));
    b.parts.led = led;
  },
  elevator(b) {
    b.box('metal', 1.2, 2.2, 0.08, 0, 0, 0);
    const l = b.box('door_metal', 0.47, 2.0, 0.02, -0.24, 0, 0.05);
    const r = b.box('door_metal', 0.47, 2.0, 0.02, 0.24, 0, 0.05);
    b.parts.left = b.dynamic(l); b.parts.right = b.dynamic(r);
    b.box('black', 0.005, 2.0, 0.025, 0, 0, 0.055);
    b.plane(b.a.signMaterial(['6'], { w: 64, h: 64, bg: '#111', fg: '#c84', size: 44, pad: 4 }), 0.08, 0.08, 0, 2.12, 0.045);
  },
  lift_button(b) {
    b.box('metal', 0.1, 0.2, 0.02, 0, 1.1, 0);
    const btn = b.dynamic(b.cyl(b.a.uniqueMaterial('lamp_off'), 0.02, 0.02, 0.015, 0, 1.18, 0.015, 10));
    btn.rotation.x = Math.PI / 2;
    b.parts.button = btn;
  },
  trash_chute(b) {
    b.box('rust', 0.5, 2.6, 0.45, 0, 0, 0);
    b.box('metal', 0.42, 0.35, 0.06, 0, 0.75, 0.24);
    b.col(0, 0, 0.5, 0.45);
  },
  stairs(b, o) {
    // Два марша: вниз (+Z половина) и вверх (-Z половина) от площадки на восток (+X)
    const n = 8, step = 0.28, rise = 0.17, w = 2.3;
    for (let i = 0; i < n; i++) {
      b.box('floor_concrete', step, 0.06, w, 0.14 + i * step, -(i + 1) * rise, 1.35);
      b.box('floor_concrete', step, 0.08 + (i + 1) * rise, w, 0.14 + i * step, 0, -1.35);
    }
    // шахта под маршем вниз
    b.box('black', n * step, 0.02, w, n * step / 2, -n * rise - 0.4, 1.35);
    b.box('wall_concrete', n * step + 0.3, 1.8, 0.05, n * step / 2, -1.8, 2.55);
    // перила
    for (let i = 0; i <= n; i += 2) {
      b.box('metal', 0.02, 0.9, 0.02, i * step, -(i) * rise, 0.15);
      b.box('metal', 0.02, 0.9, 0.02, i * step, (i) * rise, -0.15);
    }
    const rail1 = b.box('wood_dark', n * step + 0.1, 0.05, 0.06, n * step / 2, 0.9 - n * rise / 2, 0.15);
    rail1.rotation.z = -Math.atan2(rise, step);
    const rail2 = b.box('wood_dark', n * step + 0.1, 0.05, 0.06, n * step / 2, 0.9 + n * rise / 2, -0.15);
    rail2.rotation.z = Math.atan2(rise, step);
    // решётка наверх (замок) и металлический щит вниз
    for (let i = 0; i < 9; i++) b.box('metal', 0.02, 2.3, 0.02, 0.35, 0.2, -2.45 + i * 0.27);
    for (const y of [0.4, 1.3, 2.3]) b.box('metal', 0.03, 0.04, 2.3, 0.35, y, -1.35);
    b.box('rust', 0.04, 0.12, 0.1, 0.38, 1.05, -0.4);
    const sheet = b.box('metal', 0.04, 2.0, 2.3, 0.62, -0.25, 1.35);
    sheet.rotation.z = 0.02;
    b.plane(b.a.signMaterial(['#ПРОХОД ЗАКРЫТ', 'Режим ЧС', 'Штаб ГОЧС г.о.'], { w: 512, h: 256, bg: '#d6c94a', fg: '#111', titleSize: 46, size: 26 }), 0.9, 0.45, 0.595, 1.1, 1.35, 0, -Math.PI / 2);
    b.col(1.6, 0, 3.4, 5.2);
  },
  stair_window_stuff(b) {
    b.box('metal', 0.12, 0.1, 0.12, 0, 0, 0);
    b.box('paper', 0.04, 0.012, 0.012, 0.02, 0.1, 0.02);
  },
  // --------- Особое ---------
  water_stack(b) {
    // Запасы воды Лапина — инстансинг повторяющихся бутылок
    const geo = cylGeo(0.045, 0.045, 0.3, 8);
    const mat = b.a.material('glass_wired');
    const count = 42;
    const inst = new THREE.InstancedMesh(geo, mat, count);
    const m = new THREE.Matrix4();
    let k = 0;
    for (let layer = 0; layer < 3; layer++) for (let r = 0; r < 2; r++) for (let c = 0; c < 7; c++) {
      m.makeTranslation(-0.3 + c * 0.1, 0.15 + layer * 0.31, -0.05 + r * 0.1);
      inst.setMatrixAt(k++, m);
    }
    inst.userData.dynamic = true;
    b.group.add(inst);
    b.box('cardboard', 0.75, 0.02, 0.25, 0, 0, 0);
  },
  led_strip(b, o) {
    b.box(b.a.material('led_purple'), o.w || 1.8, 0.02, 0.02, 0, o.y || 2.3, 0);
  },
  crowbar(b) {
    const m = b.box('rust', 0.025, 0.8, 0.025, 0, 0, 0);
    m.rotation.z = 0.15;
  },
};

export function buildProp(name, assets, opts = {}) {
  const fn = PROPS[name];
  const b = new PropBuilder(assets);
  if (!fn) { console.warn(`[Props] неизвестный предмет ${name}`); return b.done(); }
  fn(b, opts);
  return b.done();
}
