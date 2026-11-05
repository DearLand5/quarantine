// Процедурная модель человека с иерархией суставов и анимацией: дыхание, ходьба, жесты при разговоре,
// моргание, поворот головы к собеседнику. Внешность задаётся данными (рост, комплекция, одежда, причёска, аксессуары).
// Low-poly: сужающиеся конечности (Lathe), торс с талией, лицо с носом/ушами/бровями/глазами. Геометрия и материалы кэшируются.
// Модель — временная замена: тот же интерфейс реализует GltfHumanoid (загрузка GLB со скелетом).
import * as THREE from 'three';
import { boxGeo, cylGeo, sphereGeo } from '../world/geometry.js';

const matCache = new Map();
function mat(color, rough = 0.85, lambert = false, double = false) {
  const key = `${color}:${rough}:${lambert}:${double ? 'd' : 's'}`;
  if (!matCache.has(key)) {
    const side = double ? THREE.DoubleSide : THREE.FrontSide;
    matCache.set(key, lambert ? new THREE.MeshLambertMaterial({ color, side }) : new THREE.MeshStandardMaterial({ color, roughness: rough, side }));
  }
  return matCache.get(key);
}

// Бледные «глаза» эха: не зависят от освещения, еле заметны
const echoEyeMat = new THREE.MeshBasicMaterial({ color: 0x9aa2ac, transparent: true, opacity: 0.55 });

// ---- кэш собственной геометрии ----
const gCache = new Map();
const qn = (v) => Math.round(v * 1000);
function cached(key, make) {
  let g = gCache.get(key);
  if (!g) { g = make(); gCache.set(key, g); }
  return g;
}
/** Конечность-«капсула» с разными радиусами сверху и снизу; верх на y=0, низ на y=-len. */
function limbGeo(rt, rb, len, seg = 8) {
  return cached(`l:${qn(rt)}:${qn(rb)}:${qn(len)}:${seg}`, () => new THREE.LatheGeometry([
    new THREE.Vector2(0, -len - rb), new THREE.Vector2(rb * 0.72, -len - rb * 0.7), new THREE.Vector2(rb, -len),
    new THREE.Vector2((rt + rb) * 0.5 * 1.06, -len * 0.5), new THREE.Vector2(rt, 0),
    new THREE.Vector2(rt * 0.72, rt * 0.7), new THREE.Vector2(0, rt),
  ], seg));
}
/** Профиль [радиус(единичный), y] → Lathe; масштаб по X/Z задаётся mesh.scale. */
const TORSO_P = [[0, 0], [0.8, 0], [0.86, 0.1], [0.8, 0.3], [0.86, 0.52], [1.0, 0.74], [0.97, 0.88], [0.78, 0.955], [0.36, 0.995], [0.3, 1.0], [0, 1.02]];
const HEAD_P = [[0, -1.0], [0.36, -0.95], [0.62, -0.72], [0.82, -0.38], [0.94, 0.0], [1.0, 0.3], [0.96, 0.62], [0.74, 0.9], [0.4, 1.02], [0, 1.07]];
function interp(P, y) {
  if (y <= P[0][1]) return P[0][0];
  for (let i = 0; i < P.length - 1; i++) {
    if (y <= P[i + 1][1]) { const t = (y - P[i][1]) / (P[i + 1][1] - P[i][1] || 1); return P[i][0] + (P[i + 1][0] - P[i][0]) * t; }
  }
  return P[P.length - 1][0];
}
function torsoGeo(h) {
  return cached(`t:${qn(h)}`, () => new THREE.LatheGeometry(TORSO_P.map(([r, f]) => new THREE.Vector2(r, f * h)), 12));
}
function headGeo(R) {
  return cached(`h:${qn(R)}`, () => new THREE.LatheGeometry(HEAD_P.map(([r, y]) => new THREE.Vector2(r * R, y * R)), 12));
}
function robeGeo(bottomY) {
  return cached(`r:${qn(bottomY)}`, () => new THREE.LatheGeometry([
    [0, bottomY], [1.3, bottomY], [1.2, bottomY * 0.8], [1.05, bottomY * 0.4], [0.95, 0], [0.9, 0.12], [0, 0.12],
  ].map(([r, y]) => new THREE.Vector2(r, y)), 12));
}
/** Шапка волос: часть сферы от макушки до thetaLen. */
function capGeo(r, thetaLen) {
  return cached(`cap:${qn(r)}:${qn(thetaLen)}`, () => new THREE.SphereGeometry(r, 12, 8, 0, Math.PI * 2, 0, thetaLen));
}
/** Капюшон: сфера с вырезом спереди (перед лица = phi π/2). */
function hoodGeo(r, thetaLen) {
  return cached(`hood:${qn(r)}:${qn(thetaLen)}`, () => new THREE.SphereGeometry(r, 12, 8, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0, thetaLen));
}
function torusGeo(r, tube) {
  return cached(`tor:${qn(r)}:${qn(tube * 10)}`, () => new THREE.TorusGeometry(r, tube, 4, 12));
}

const _c = new THREE.Color();
function shade(hex, f) { _c.setHex(hex); _c.multiplyScalar(f); return _c.getHex(); }
const _v = new THREE.Vector3();
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export class HumanoidModel {
  constructor(look, { lambert = false, echo = false } = {}) {
    this.look = look;
    this.root = new THREE.Group();
    this.lambert = lambert;
    this.echo = echo;
    this.time = Math.random() * 10;
    this.walkPhase = 0;
    this.walkBlend = 0;
    this.headYaw = 0; this.headPitch = 0;
    this.talk = 0;
    this.gesture = 0;
    this.talkL = 0;
    this.lids = [];
    this.blinkT = -1;
    this.nextBlink = this.time + 1 + Math.random() * 3;
    // микро-подёргивания эха
    this.twNext = this.time + 1.5 + Math.random() * 2;
    this.twYaw = 0; this.twPitch = 0; this.twRoll = 0; this.twArm = 0;
    this.build(look, echo);
  }

  m(color, rough) { return mat(color, rough, this.lambert); }

  build(L, echo) {
    const H = L.height || 1.72;
    const k = H / 1.72;
    const bw = L.build || 1;
    const style = L.hairStyle || 'short';
    const has = (x) => !!L.extra?.includes(x);
    const woman = style === 'bun' || style === 'long';
    const sw = woman ? 0.9 : 1;
    const th = echo ? 0.6 : 1; // тонкость конечностей
    const skinC = L.skin || 0xd2aa90, topC = L.top || 0x444444, botC = L.bottom || 0x222222;
    const skin = this.m(skinC, echo ? 0.9 : 0.7);
    const top = this.m(topC);
    const topDark = this.m(shade(topC, 0.72));
    const topLight = this.m(shade(topC, 1.3));
    const bottom = this.m(botC);
    const shoe = this.m(echo ? 0x060606 : 0x1a1714, 0.6);
    const hairM = this.m(L.hair || 0x2a2018, 0.95);
    const part = (geo, material, parent, x, y, z, cast = false) => {
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = cast;
      parent.add(mesh);
      return mesh;
    };

    const legLen = 0.86 * k * (echo ? 1.07 : 1);
    this.hips = new THREE.Group();
    this.hips.position.y = legLen;
    this.baseHipY = legLen;
    this.legLen = legLen;
    this.root.add(this.hips);

    // Ноги: бедро и голень сужаются, обувь с носком
    this.legs = [];
    for (const side of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(side * 0.095 * bw, 0, 0);
      this.hips.add(hip);
      part(limbGeo(0.075 * bw * th, 0.054 * bw * th, legLen * 0.5), bottom, hip, 0, 0, 0, true);
      const knee = new THREE.Group();
      knee.position.y = -legLen * 0.5;
      hip.add(knee);
      part(limbGeo(0.054 * bw * th, 0.036 * bw * th, legLen * 0.5 - 0.07), bottom, knee, 0, 0, 0, true);
      const sh = part(sphereGeo(1, 8, 6), shoe, knee, 0, -legLen * 0.5 + 0.042, 0.04, true);
      sh.scale.set(0.05 * bw * (echo ? 0.8 : 1), 0.042, echo ? 0.15 : 0.12);
      this.legs.push({ hip, knee });
    }

    // Таз и корпус (грудь шире талии)
    const pelvis = part(sphereGeo(1, 10, 7), bottom, this.hips, 0, -0.02, 0, true);
    pelvis.scale.set(0.17 * bw * (woman ? 1.05 : 1), 0.115, 0.12 * bw);
    this.spine = new THREE.Group();
    this.hips.add(this.spine);
    const torsoH = (echo ? 0.64 : 0.58) * k;
    const halfW = 0.19 * bw * sw, halfD = 0.115 * bw;
    this.torso = part(torsoGeo(torsoH), top, this.spine, 0, 0, 0, true);
    this.torso.scale.set(halfW, 1, halfD);
    this.torsoBase = { x: halfW, z: halfD };
    const frontZ = (f, mul = 1) => halfD * interp(TORSO_P, f) * mul;
    const hoodie = has('hoodie'), vest = has('vest'), robe = has('robe');

    if (!echo) {
      // воротник и пуговицы
      part(cylGeo(0.06, 0.074, 0.032, 10), hoodie ? top : topLight, this.spine, 0, torsoH - 0.006, 0);
      if (!hoodie && !robe && !vest) {
        const bm = this.m(shade(topC, 0.5), 0.5);
        for (const f of [0.62, 0.42]) part(sphereGeo(0.008, 5, 4), bm, this.spine, 0, f * torsoH, frontZ(f) + 0.002);
      }
    }
    if (robe) {
      // длинный халат до колен с поясом
      const bottomY = -legLen * 0.5;
      const sk = part(robeGeo(bottomY), top, this.spine, 0, 0, 0, true);
      sk.scale.set(0.2 * bw, 1, 0.14 * bw);
      const belt = part(cylGeo(1, 1, 0.05, 12), this.m(shade(topC, 0.5), 0.8), this.spine, 0, 0.13, 0);
      belt.scale.set(0.19 * bw, 1, 0.133 * bw);
      part(boxGeo(0.05, 0.07, 0.02), this.m(shade(topC, 0.5), 0.8), this.spine, 0.04, 0.1, 0.133 * bw);
      for (const s of [-1, 1]) {
        const lap = part(boxGeo(0.03, 0.26, 0.012), topLight, this.spine, s * 0.05, torsoH * 0.62, frontZ(0.7) + 0.004);
        lap.rotation.z = -s * 0.28;
      }
    }
    if (vest) {
      const vm = this.m(0x2a3022);
      const v = part(torsoGeo(torsoH), vm, this.spine, 0, 0.0, 0, true);
      v.scale.set(halfW * 1.06, 1, halfD * 1.13);
      const bm = this.m(0x14170f, 0.5);
      for (const f of [0.78, 0.6, 0.42]) part(sphereGeo(0.009, 5, 4), bm, this.spine, 0, f * torsoH, frontZ(f, 1.13) + 0.002);
      for (const s of [-1, 1]) part(boxGeo(0.075, 0.07, 0.014), this.m(0x232a1c), this.spine, s * 0.095 * bw, 0.2, frontZ(0.3, 1.13) + 0.002);
    }
    if (hoodie) {
      part(boxGeo(0.22 * bw, 0.11, 0.022), topDark, this.spine, 0, 0.12, frontZ(0.22) + 0.006);
      const dm = this.m(0xcfcfc8, 0.9);
      for (const s of [-1, 1]) part(cylGeo(0.004, 0.004, 0.17, 4), dm, this.spine, s * 0.032, torsoH - 0.11, frontZ(0.8) + 0.008);
      // капюшон-воротник на шее
      part(cylGeo(0.085, 0.13, 0.095, 10), top, this.spine, 0, torsoH + 0.004, -0.006, true);
      if (style !== 'hood') { const hb = part(sphereGeo(0.08, 8, 6), top, this.spine, 0, torsoH - 0.03, -0.1, true); hb.scale.set(1.4, 0.8, 0.8); }
    }
    if (has('shawl')) {
      const sm = this.m(0x6a3a3a, 1);
      const sh = part(cylGeo(0.1, 0.225, 0.2, 10), sm, this.spine, 0, torsoH - 0.095, 0, true);
      sh.scale.set(1.08 * bw * sw, 1, 0.74 * bw);
      const tail = part(boxGeo(0.14 * bw, 0.2, 0.02), sm, this.spine, 0.02, torsoH - 0.22, frontZ(0.65) + 0.012);
      tail.rotation.z = 0.12;
    }

    // Шея и голова
    const neckH = echo ? 0.2 : 0.08;
    this.neck = new THREE.Group();
    this.neck.position.y = torsoH;
    this.spine.add(this.neck);
    const nr = echo ? 0.028 : 0.048 * (woman ? 0.9 : 1);
    part(cylGeo(nr * 0.92, nr * 1.08, neckH + 0.05, 8), skin, this.neck, 0, neckH / 2 - 0.005, 0, true);
    this.head = new THREE.Group();
    this.head.position.y = neckH;
    this.neck.add(this.head);
    const R = 0.11 * (0.95 + 0.05 * k) * (echo ? 0.9 : 1);
    const hsx = echo ? 0.8 : 0.93, hsy = echo ? 1.22 : 1.02, hsz = echo ? 0.88 : 1.05;
    const skull = part(headGeo(R), skin, this.head, 0, R, 0, true);
    skull.scale.set(hsx, hsy, hsz);
    // z поверхности лица на высоте y (в координатах головы) при смещении x
    const faceZ = (x, y) => {
      const r = interp(HEAD_P, (y - R) / (R * hsy));
      const ex = x / (hsx * R * Math.max(r, 0.01));
      return hsz * R * r * Math.sqrt(Math.max(0, 1 - ex * ex));
    };
    const eyeY = R * (echo ? 1.2 : 1.02);

    if (echo) {
      for (const s of [-1, 1]) {
        const e = part(sphereGeo(0.0065, 5, 4), echoEyeMat, this.head, s * 0.03, eyeY, faceZ(s * 0.03, eyeY) - 0.001);
        e.castShadow = false;
      }
      this.mouth = part(boxGeo(0.001, 0.001, 0.001), skin, this.head, 0, R * 0.5, 0);
      this.mouth.visible = false;
    } else {
      const white = this.m(0xe6e2d8, 0.4), iris = this.m(0x1c130e, 0.3), lidM = skin;
      for (const s of [-1, 1]) {
        const ex = s * 0.036, ez = faceZ(ex, eyeY) - 0.003;
        const w = part(sphereGeo(0.0165, 8, 6), white, this.head, ex, eyeY, ez);
        w.scale.set(1, 0.85, 1);
        const ir = part(sphereGeo(0.0085, 6, 5), iris, this.head, ex, eyeY, ez + 0.0143);
        ir.scale.set(1, 1, 0.4);
        const lid = part(sphereGeo(0.0195, 8, 6), lidM, this.head, ex, eyeY, ez);
        lid.scale.set(1, 0.001, 1); lid.visible = false;
        this.lids.push(lid);
        const br = part(boxGeo(0.034, 0.006, 0.009), hairM, this.head, s * 0.04, eyeY + 0.028, faceZ(s * 0.04, eyeY + 0.028) + 0.001);
        br.rotation.z = -s * 0.07; br.rotation.y = s * 0.35;
        // уши
        const ear = part(sphereGeo(0.02, 6, 5), skin, this.head, s * hsx * R * 0.98, R * 1.0, -0.004);
        ear.scale.set(0.38, 1, 0.7);
      }
      const nose = part(sphereGeo(0.016, 6, 5), skin, this.head, 0, R * 0.78, faceZ(0, R * 0.78) + 0.004);
      nose.scale.set(0.8, 1.35, 1.1); nose.rotation.x = 0.25;
      this.mouth = part(boxGeo(0.044, 0.008, 0.01), this.m(woman ? 0x7a3a3a : 0x5a2e2a), this.head, 0, R * 0.46, faceZ(0, R * 0.46) + 0.002);
      if (has('glasses')) {
        const gm = this.m(0x2a2620, 0.4);
        for (const s of [-1, 1]) {
          const x = s * 0.038;
          part(torusGeo(0.0235, 0.0028), gm, this.head, x, eyeY, faceZ(x, eyeY) + 0.016);
          const tp = part(boxGeo(0.0032, 0.0032, 0.1), gm, this.head, s * (hsx * R * 0.99 + 0.001), eyeY + 0.004, 0.05);
          tp.rotation.y = -s * 0.05;
        }
        part(boxGeo(0.02, 0.004, 0.004), gm, this.head, 0, eyeY + 0.006, faceZ(0, eyeY) + 0.016);
      }
      if (has('mustache')) {
        for (const s of [-1, 1]) {
          const mm = part(boxGeo(0.04, 0.014, 0.014), hairM, this.head, s * 0.02, R * 0.62, faceZ(s * 0.02, R * 0.62) + 0.006);
          mm.rotation.z = s * 0.14; mm.rotation.y = s * 0.4;
        }
      }
    }

    // Причёска
    const cap = (thetaLen, tilt, sy = 1.14) => {
      const h = part(capGeo(R, thetaLen), hairM, this.head, 0, R * 1.06, -0.004, true);
      h.scale.set(1.07, sy, 1.14); h.rotation.x = -tilt;
      return h;
    };
    if (!echo) {
      if (style === 'short') {
        cap(1.45, 0.5);
        for (const s of [-1, 1]) part(boxGeo(0.012, 0.04, 0.026), hairM, this.head, s * hsx * R * 0.95, R * 0.95, 0.02);
      }
      if (style === 'bun') {
        cap(1.45, 0.5);
        part(sphereGeo(R * 0.5, 8, 6), hairM, this.head, 0, R * 1.95, -R * 0.8, true);
      }
      if (style === 'long') {
        cap(1.6, 0.45);
        const back = part(cylGeo(R * 0.82, R * 0.62, 0.32, 8), hairM, this.head, 0, 0.005, -R * 0.64, true);
        back.scale.set(1, 1, 0.6);
      }
      if (style === 'hood') {
        cap(1.45, 0.5);
        const hood = part(hoodGeo(R * 1.36, 2.2), top, this.head, 0, R * 1.0, -0.012, true);
        hood.material = mat(topC, 0.85, this.lambert, true);
        hood.scale.set(0.98, 1.1, 1.12); hood.position.y = R * 1.05; hood.rotation.x = -0.12;
      }
    }

    // Руки: плечо, предплечье, манжета, кисть с большим пальцем
    this.arms = [];
    const armLen = (echo ? 0.82 : 0.6) * k;
    const upperLen = armLen * 0.5, foreLen = armLen * 0.47;
    for (const side of [-1, 1]) {
      const sh = new THREE.Group();
      sh.position.set(side * (halfW * 0.97 + 0.012), torsoH - 0.055, 0);
      this.spine.add(sh);
      const cap2 = part(sphereGeo(0.047 * bw * th, 8, 6), top, sh, 0, 0, 0, true);
      cap2.scale.set(1, 0.95, 1);
      part(limbGeo(0.05 * bw * th, 0.042 * bw * th, upperLen), top, sh, 0, 0, 0, true);
      const el = new THREE.Group();
      el.position.y = -upperLen;
      sh.add(el);
      part(limbGeo(0.042 * bw * th, 0.031 * bw * th, foreLen), top, el, 0, 0, 0, true);
      const wristY = -foreLen;
      if (echo) {
        const palm = part(sphereGeo(0.03, 6, 5), skin, el, 0, wristY - 0.03, 0, true);
        palm.scale.set(0.8, 1.3, 0.45);
        const fl = [0.2, 0.24, 0.21];
        for (let i = 0; i < 3; i++) {
          const f = part(cylGeo(0.0055, 0.0032, fl[i], 5), skin, el, (i - 1) * 0.013, wristY - 0.05 - fl[i] / 2, 0.0);
          f.rotation.z = (i - 1) * 0.07; f.rotation.x = 0.1;
        }
        const tb = part(cylGeo(0.005, 0.003, 0.12, 5), skin, el, -side * 0.026, wristY - 0.07, 0.008);
        tb.rotation.z = -side * 0.35;
      } else {
        part(cylGeo(0.0385 * bw, 0.0385 * bw, 0.034, 8), topDark, el, 0, wristY + 0.012, 0);
        const hand = part(sphereGeo(0.03, 7, 5), skin, el, 0, wristY - 0.04, 0.004, true);
        hand.scale.set(0.95, 1.55, 0.7);
        const thumb = part(sphereGeo(0.012, 5, 4), skin, el, -side * 0.025, wristY - 0.03, 0.014);
        thumb.scale.set(0.85, 1.8, 0.85); thumb.rotation.z = -side * 0.25;
      }
      this.arms.push({ sh, el, side });
    }
    if (has('cane')) {
      const handY = legLen + torsoH - 0.055 - armLen * 0.97;
      const caneLen = Math.max(0.6, handY + 0.04);
      const cm = this.m(0x3a2618);
      const el = this.arms[1].el;
      this.cane = part(cylGeo(0.011, 0.013, caneLen, 6), cm, el, 0, -foreLen - 0.04 - caneLen / 2 + 0.04, 0.03, true);
      const crook = part(cylGeo(0.013, 0.013, 0.08, 6), cm, el, 0, -foreLen - 0.04 + 0.045, 0.03);
      crook.rotation.x = Math.PI / 2;
    }
    this.stoop = L.stoop || 0;
    this.headR = R;
    this.eyeHeight = legLen + torsoH + neckH + eyeY;
  }

  /** state: { speed, talking, lookAt: Vector3|null, activity, headTilt?, roll? } */
  update(dt, state) {
    this.time += dt;
    const t = this.time;
    const echo = this.echo;
    const speed = state.speed || 0;
    const walking = speed > 0.05;
    const k8 = Math.min(1, dt * 8);
    this.walkBlend += ((walking ? 1 : 0) - this.walkBlend) * Math.min(1, dt * 6);
    const wb = this.walkBlend, idle = 1 - wb;
    this.walkPhase += dt * (walking ? 2.0 + speed * 3.2 : 0);
    const swing = walking ? Math.min(0.6, 0.25 + speed * 0.3) : 0;
    const s = Math.sin(this.walkPhase);
    const sway = echo ? 0 : Math.sin(t * 0.5);
    // Ноги: шаг, а в покое лёгкий перенос веса с ноги на ногу
    this.legs[0].hip.rotation.x = s * swing;
    this.legs[1].hip.rotation.x = -s * swing;
    this.legs[0].knee.rotation.x = Math.max(0, -s) * swing * 1.2 + idle * Math.max(0, sway) * 0.1;
    this.legs[1].knee.rotation.x = Math.max(0, s) * swing * 1.2 + idle * Math.max(0, -sway) * 0.1;
    const shift = sway * 0.012 * idle;
    this.hips.position.x = shift;
    this.legs[0].hip.rotation.z = -shift / this.legLen;
    this.legs[1].hip.rotation.z = -shift / this.legLen;
    const bounce = walking ? Math.abs(Math.cos(this.walkPhase)) * 0.025 : 0;
    this.hips.position.y = this.baseHipY + bounce - idle * Math.abs(sway) * 0.004;
    // Таз и плечи поворачиваются в противофазе
    const twist = s * 0.07 * Math.min(1, swing / 0.4) * wb;
    this.hips.rotation.y = twist;
    this.hips.rotation.z = sway * 0.018 * idle;

    // Дыхание и сутулость
    const breath = echo ? 0 : Math.sin(t * 1.6) * 0.012;
    this.spine.rotation.x = this.stoop + breath * 0.5 + (state.activity === 'listen' ? 0.15 : 0) + (echo ? 0.05 : 0);
    this.spine.rotation.y = -twist * 1.6;
    this.spine.rotation.z = -this.hips.rotation.z * 0.9;
    this.torso.scale.x = this.torsoBase.x * (1 + breath * 0.8);
    this.torso.scale.z = this.torsoBase.z * (1 + breath * 1.2);

    // Подёргивания эха
    if (echo) {
      if (t > this.twNext) {
        this.twNext = t + 2 + Math.random() * 4;
        this.twYaw = (Math.random() - 0.5) * 0.35;
        this.twPitch = (Math.random() - 0.5) * 0.18;
        this.twRoll = (Math.random() - 0.5) * 0.25;
        this.twArm = (Math.random() - 0.5) * 0.3;
      }
      const dec = Math.exp(-dt * 7);
      this.twYaw *= dec; this.twPitch *= dec; this.twRoll *= dec; this.twArm *= dec;
    }

    // Руки: противофаза шагу, жесты при разговоре (иногда обеими руками), курение
    this.talk += ((state.talking ? 1 : 0) - this.talk) * Math.min(1, dt * 4);
    this.gesture += dt * (1.3 + Math.sin(t * 0.7) * 0.5);
    const lgate = sstep(0.2, 0.7, Math.sin(t * 0.43 + 1.7));
    this.talkL += (this.talk * lgate - this.talkL) * Math.min(1, dt * 3);
    for (const a of this.arms) {
      let shX, shZ = a.side * (echo ? 0.03 : 0.06), elX;
      if (echo) {
        shX = 0.05 + this.twArm * a.side; elX = -0.06;
      } else {
        shX = walking ? s * swing * 0.85 * a.side : Math.sin(t * 0.9 + a.side) * 0.03;
        elX = walking ? -0.2 - Math.max(0, -s * a.side) * swing * 0.6 : -0.12;
        const g = a.side > 0 ? this.talk : this.talkL;
        if (g > 0.01) {
          const ph = a.side > 0 ? 0 : 1.9;
          shX -= g * (0.35 + Math.sin(this.gesture * 2.3 + ph) * 0.15);
          elX -= g * (0.7 + Math.sin(this.gesture * 3.1 + ph) * 0.25);
          shZ += a.side * g * (0.1 + Math.sin(this.gesture * 1.7 + ph) * 0.06);
        }
        if (state.activity === 'smoke' && a.side > 0) { shX = -0.5; elX = -1.9 + Math.max(0, Math.sin(t * 0.6)) * 0.3; }
        if (state.activity === 'listen' && a.side < 0) { shX = -0.6; shZ = -0.4; elX = -1.6; }
        if (state.activity === 'panel' && a.side > 0) { shX = -1.4; elX = -0.4; }
        if (this.cane && a.side > 0 && !this.talk) { shX = -0.15 + (walking ? s * 0.1 : 0); elX = -0.1; }
      }
      a.sh.rotation.x += (shX - a.sh.rotation.x) * k8;
      a.sh.rotation.z += (shZ - a.sh.rotation.z) * k8;
      a.el.rotation.x += (elX - a.el.rotation.x) * k8;
    }
    // Рот при разговоре
    this.mouth.scale.y = 1 + (state.talking ? Math.abs(Math.sin(t * 14)) * 3 : 0);
    this.mouth.scale.x = 1 - (state.talking ? Math.abs(Math.sin(t * 9)) * 0.15 : 0);

    // Моргание
    if (this.lids.length) {
      if (this.blinkT < 0 && t > this.nextBlink) { this.blinkT = 0; this.nextBlink = t + 2.5 + Math.random() * 4.5; }
      let amt = 0;
      if (this.blinkT >= 0) {
        this.blinkT += dt;
        if (this.blinkT > 0.16) this.blinkT = -1; else amt = Math.sin(this.blinkT / 0.16 * Math.PI);
      }
      for (const l of this.lids) { l.visible = amt > 0.06; l.scale.y = Math.max(0.001, amt); }
    }

    // Голова поворачивается к цели (в локальных координатах модели)
    let tyaw = echo ? 0 : Math.sin(t * 0.37) * 0.08, tpitch = state.activity === 'listen' ? 0.1 : 0;
    if (state.lookAt) {
      const local = this.root.worldToLocal(_v.copy(state.lookAt));
      tyaw = THREE.MathUtils.clamp(Math.atan2(local.x, local.z), -1.2, 1.2);
      const eye = this.eyeHeight;
      tpitch = THREE.MathUtils.clamp(-Math.atan2(local.y - eye, Math.hypot(local.x, local.z)), -0.5, 0.5);
    }
    if (state.headTilt) { tpitch += state.headTilt; }
    this.headYaw += (tyaw - this.headYaw) * Math.min(1, dt * 5);
    this.headPitch += (tpitch - this.headPitch) * Math.min(1, dt * 5);
    this.neck.rotation.y = this.headYaw * 0.6 + this.twYaw * 0.5;
    this.head.rotation.y = this.headYaw * 0.4 + this.twYaw * 0.5;
    this.head.rotation.x = this.headPitch + this.twPitch + (state.talking ? Math.sin(t * 5) * 0.04 : 0);
    this.head.rotation.z = (state.roll || 0) + this.twRoll;
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
