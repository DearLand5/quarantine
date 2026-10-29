// Процедурная модель человека с иерархией суставов и анимацией: дыхание, ходьба, жесты при разговоре,
// поворот головы к собеседнику. Внешность задаётся данными (рост, комплекция, одежда, причёска, аксессуары).
// Модель — временная замена: тот же интерфейс реализует GltfHumanoid (загрузка GLB со скелетом).
import * as THREE from 'three';
import { boxGeo, cylGeo, sphereGeo } from '../world/geometry.js';

const matCache = new Map();
function mat(color, rough = 0.85, lambert = false) {
  const key = `${color}:${rough}:${lambert}`;
  if (!matCache.has(key)) {
    matCache.set(key, lambert ? new THREE.MeshLambertMaterial({ color }) : new THREE.MeshStandardMaterial({ color, roughness: rough }));
  }
  return matCache.get(key);
}

export class HumanoidModel {
  constructor(look, { lambert = false, echo = false } = {}) {
    this.look = look;
    this.root = new THREE.Group();
    this.lambert = lambert;
    this.time = Math.random() * 10;
    this.walkPhase = 0;
    this.headYaw = 0; this.headPitch = 0;
    this.talk = 0;
    this.gesture = 0;
    this.build(look, echo);
  }

  m(color, rough) { return mat(color, rough, this.lambert); }

  build(L, echo) {
    const H = L.height || 1.72;
    const k = H / 1.72;
    const bw = L.build || 1;
    const skin = this.m(L.skin || 0xd2aa90, 0.7);
    const top = this.m(L.top || 0x444444);
    const bottom = this.m(L.bottom || 0x222222);
    const shoe = this.m(0x1a1714, 0.6);
    const hairM = this.m(L.hair || 0x2a2018, 0.95);
    const add = (geo, material, parent, x, y, z) => {
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const legLen = 0.86 * k;
    this.hips = new THREE.Group();
    this.hips.position.y = legLen;
    this.baseHipY = legLen;
    this.root.add(this.hips);

    // Ноги
    this.legs = [];
    for (const side of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(side * 0.1 * bw, 0, 0);
      this.hips.add(hip);
      add(boxGeo(0.13 * bw, legLen * 0.52, 0.15 * bw), bottom, hip, 0, -legLen * 0.26, 0);
      const knee = new THREE.Group();
      knee.position.y = -legLen * 0.5;
      hip.add(knee);
      add(boxGeo(0.11 * bw, legLen * 0.48, 0.12 * bw), bottom, knee, 0, -legLen * 0.24, 0);
      add(boxGeo(0.11 * bw, 0.07, 0.26), shoe, knee, 0, -legLen * 0.5 + 0.035, 0.05);
      this.legs.push({ hip, knee });
    }

    // Корпус
    this.spine = new THREE.Group();
    this.hips.add(this.spine);
    const torsoH = 0.58 * k;
    add(boxGeo(0.36 * bw, torsoH, 0.21 * bw), top, this.spine, 0, torsoH / 2, 0);
    add(boxGeo(0.34 * bw, 0.14, 0.2 * bw), bottom, this.spine, 0, 0.02, 0);
    if (L.extra?.includes('robe')) add(boxGeo(0.4 * bw, 0.55, 0.24 * bw), top, this.spine, 0, -0.22, 0);
    if (L.extra?.includes('vest')) add(boxGeo(0.38 * bw, torsoH * 0.7, 0.23 * bw), this.m(0x2a3022), this.spine, 0, torsoH * 0.55, 0);
    if (L.extra?.includes('shawl')) add(boxGeo(0.42 * bw, 0.16, 0.26 * bw), this.m(0x6a3a3a, 1), this.spine, 0, torsoH - 0.08, 0);

    // Шея и голова
    this.neck = new THREE.Group();
    this.neck.position.y = torsoH;
    this.spine.add(this.neck);
    add(cylGeo(0.05, 0.055, 0.1, 8), skin, this.neck, 0, 0.04, 0);
    this.head = new THREE.Group();
    this.head.position.y = 0.1;
    this.neck.add(this.head);
    const headR = 0.11 * (0.95 + 0.05 * k);
    const skull = add(sphereGeo(headR, 14, 10), skin, this.head, 0, headR, 0);
    skull.scale.set(0.92, 1.08, 1.0);
    // Лицо: глаза, нос, рот — простые формы, но дают ощущение взгляда
    const eyeM = this.m(echo ? 0x000000 : 0x14110e, 0.3);
    for (const s of [-1, 1]) add(sphereGeo(0.014, 6, 4), eyeM, this.head, s * 0.038, headR * 1.08, headR * 0.86);
    add(boxGeo(0.022, 0.04, 0.03), skin, this.head, 0, headR * 0.92, headR * 0.98);
    this.mouth = add(boxGeo(0.045, 0.008, 0.01), this.m(0x5a2e2a), this.head, 0, headR * 0.62, headR * 0.92);
    if (L.extra?.includes('glasses')) {
      const gm = this.m(0x2a2620, 0.4);
      for (const s of [-1, 1]) {
        const lens = add(cylGeo(0.026, 0.026, 0.006, 10), gm, this.head, s * 0.04, headR * 1.08, headR * 0.95);
        lens.rotation.x = Math.PI / 2;
      }
      add(boxGeo(0.03, 0.005, 0.005), gm, this.head, 0, headR * 1.1, headR * 0.96);
    }
    if (L.extra?.includes('mustache')) add(boxGeo(0.07, 0.016, 0.02), hairM, this.head, 0, headR * 0.72, headR * 0.96);
    // Причёска
    const style = L.hairStyle || 'short';
    if (style === 'short') { const h = add(sphereGeo(headR * 1.04, 12, 8), hairM, this.head, 0, headR * 1.12, -0.01); h.scale.set(0.95, 0.8, 1.0); }
    if (style === 'bun') {
      const h = add(sphereGeo(headR * 1.05, 12, 8), hairM, this.head, 0, headR * 1.12, -0.015); h.scale.set(0.96, 0.85, 1.0);
      add(sphereGeo(headR * 0.45, 8, 6), hairM, this.head, 0, headR * 1.7, -headR * 0.6);
    }
    if (style === 'long') {
      const h = add(sphereGeo(headR * 1.06, 12, 8), hairM, this.head, 0, headR * 1.1, -0.02); h.scale.set(1, 0.9, 1.02);
      add(boxGeo(headR * 1.9, headR * 2.4, headR * 0.6), hairM, this.head, 0, headR * 0.3, -headR * 0.55);
    }
    if (style === 'hood') {
      const h = add(sphereGeo(headR * 1.04, 12, 8), hairM, this.head, 0, headR * 1.15, 0); h.scale.set(0.95, 0.75, 1.0);
      add(boxGeo(0.3 * bw, 0.22, 0.12), top, this.spine, 0, torsoH - 0.02, -0.14);
    }
    if (style === 'none_echo') { /* без волос */ }

    // Руки
    this.arms = [];
    const armLen = (echo ? 0.82 : 0.62) * k;
    for (const side of [-1, 1]) {
      const sh = new THREE.Group();
      sh.position.set(side * (0.2 * bw + 0.02), torsoH - 0.06, 0);
      this.spine.add(sh);
      add(boxGeo(0.09 * bw, armLen * 0.5, 0.1 * bw), top, sh, 0, -armLen * 0.25, 0);
      const el = new THREE.Group();
      el.position.y = -armLen * 0.5;
      sh.add(el);
      add(boxGeo(0.08 * bw, armLen * 0.45, 0.085 * bw), top, el, 0, -armLen * 0.22, 0);
      add(boxGeo(0.07, 0.09, 0.05), skin, el, 0, -armLen * 0.47, 0.01);
      this.arms.push({ sh, el, side });
    }
    if (L.extra?.includes('cane')) {
      this.cane = add(cylGeo(0.012, 0.012, 0.85, 6), this.m(0x3a2618), this.arms[1].el, 0, -armLen * 0.5 - 0.4, 0.05);
    }
    this.stoop = L.stoop || 0;
    this.headR = headR;
    this.eyeHeight = legLen + torsoH + 0.1 + headR * 1.08;
  }

  /** state: { speed, talking, lookAt: Vector3|null, activity } */
  update(dt, state) {
    this.time += dt;
    const t = this.time;
    const speed = state.speed || 0;
    const walking = speed > 0.05;
    this.walkPhase += dt * (walking ? 2.0 + speed * 3.2 : 0);
    const swing = walking ? Math.min(0.6, 0.25 + speed * 0.3) : 0;
    const s = Math.sin(this.walkPhase);
    this.legs[0].hip.rotation.x = s * swing;
    this.legs[1].hip.rotation.x = -s * swing;
    this.legs[0].knee.rotation.x = Math.max(0, -s) * swing * 1.2;
    this.legs[1].knee.rotation.x = Math.max(0, s) * swing * 1.2;
    const bounce = walking ? Math.abs(Math.cos(this.walkPhase)) * 0.025 : 0;
    this.hips.position.y = this.baseHipY + bounce;

    // Дыхание и сутулость
    const breath = Math.sin(t * 1.6) * 0.012;
    this.spine.rotation.x = this.stoop + breath * 0.5 + (state.activity === 'listen' ? 0.15 : 0);
    this.spine.scale.y = 1 + breath * 0.3;

    // Руки: противофаза шагу, жесты при разговоре, курение
    this.talk += ((state.talking ? 1 : 0) - this.talk) * Math.min(1, dt * 4);
    this.gesture += dt * (1.3 + Math.sin(t * 0.7) * 0.5);
    for (const a of this.arms) {
      const phase = a.side < 0 ? 1 : -1;
      let shX = walking ? s * swing * 0.8 * phase : Math.sin(t * 0.9 + a.side) * 0.03;
      let shZ = a.side * 0.06;
      let elX = walking ? -0.25 : -0.12;
      if (this.talk > 0.01 && a.side > 0) {
        shX -= this.talk * (0.35 + Math.sin(this.gesture * 2.3) * 0.15);
        elX -= this.talk * (0.7 + Math.sin(this.gesture * 3.1) * 0.25);
      }
      if (state.activity === 'smoke' && a.side > 0) { shX = -0.5; elX = -1.9 + Math.max(0, Math.sin(t * 0.6)) * 0.3; }
      if (state.activity === 'listen' && a.side < 0) { shX = -0.6; shZ = -0.4; elX = -1.6; }
      if (state.activity === 'panel' && a.side > 0) { shX = -1.4; elX = -0.4; }
      if (this.cane && a.side > 0 && !this.talk) { shX = -0.15 + (walking ? s * 0.1 : 0); elX = -0.1; }
      a.sh.rotation.x += (shX - a.sh.rotation.x) * Math.min(1, dt * 8);
      a.sh.rotation.z += (shZ - a.sh.rotation.z) * Math.min(1, dt * 8);
      a.el.rotation.x += (elX - a.el.rotation.x) * Math.min(1, dt * 8);
    }
    // Рот при разговоре
    this.mouth.scale.y = 1 + (state.talking ? Math.abs(Math.sin(t * 14)) * 3 : 0);

    // Голова поворачивается к цели (в локальных координатах модели)
    let tyaw = Math.sin(t * 0.37) * 0.08, tpitch = state.activity === 'listen' ? 0.1 : 0;
    if (state.lookAt) {
      const local = this.root.worldToLocal(state.lookAt.clone());
      tyaw = THREE.MathUtils.clamp(Math.atan2(local.x, local.z), -1.2, 1.2);
      const eye = this.eyeHeight;
      tpitch = THREE.MathUtils.clamp(-Math.atan2(local.y - eye, Math.hypot(local.x, local.z)), -0.5, 0.5);
    }
    if (state.headTilt) { tpitch += state.headTilt; }
    this.headYaw += (tyaw - this.headYaw) * Math.min(1, dt * 5);
    this.headPitch += (tpitch - this.headPitch) * Math.min(1, dt * 5);
    this.neck.rotation.y = this.headYaw * 0.6;
    this.head.rotation.y = this.headYaw * 0.4;
    this.head.rotation.x = this.headPitch + (state.talking ? Math.sin(t * 5) * 0.04 : 0);
    if (state.roll) this.head.rotation.z = state.roll;
  }

  setLayer(layer) { this.root.traverse((o) => o.layers.set(layer)); }
}

/** Адаптер для GLB-моделей со скелетной анимацией: клипы 'idle', 'walk', 'talk' (если есть). */
export class GltfHumanoid {
  constructor(gltf, look) {
    this.root = new THREE.Group();
    const scene = gltf.scene;
    const box = new THREE.Box3().setFromObject(scene);
    const h = box.max.y - box.min.y || 1;
    const k = (look.height || 1.72) / h;
    scene.scale.setScalar(k);
    scene.position.y = -box.min.y * k;
    scene.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.root.add(scene);
    this.mixer = new THREE.AnimationMixer(scene);
    this.actions = {};
    for (const clip of gltf.animations || []) this.actions[clip.name.toLowerCase()] = this.mixer.clipAction(clip);
    this.current = null;
    this.eyeHeight = (look.height || 1.72) * 0.93;
    this.play('idle');
  }

  play(name) {
    const next = this.actions[name] || this.actions.idle;
    if (!next || next === this.current) return;
    next.reset().fadeIn(0.25).play();
    this.current?.fadeOut(0.25);
    this.current = next;
  }

  update(dt, state) {
    this.play(state.speed > 0.05 ? 'walk' : state.talking ? 'talk' : 'idle');
    this.mixer.update(dt);
  }

  setLayer(layer) { this.root.traverse((o) => o.layers.set(layer)); }
}
