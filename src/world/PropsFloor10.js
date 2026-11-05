// Предметы главы 3 («десятый этаж»). Регистрируются в общем каталоге PROPS.
import * as THREE from 'three';
import { PROPS } from './Props.js';
import { planeGeo } from './geometry.js';

let fogMat = null;

Object.assign(PROPS, {
  fog_window(b) {
    // За окном десятого этажа нет ни двора, ни соседних домов — только ровная белёсая пустота
    if (!fogMat) {
      const c = document.createElement('canvas');
      c.width = 64; c.height = 128;
      const ctx = c.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, '#9aa3a6'); g.addColorStop(0.5, '#c4c9c6'); g.addColorStop(1, '#8e9592');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 128);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      fogMat = new THREE.MeshBasicMaterial({ map: tex, fog: false, color: 0x8c9290 });
      fogMat.name = 'fogwin#unique';
    }
    const m = new THREE.Mesh(planeGeo(1.6, 1.6), fogMat);
    m.position.set(0, 1.55, 0);
    m.userData.dynamic = true;
    b.group.add(m);
  },
  stair_down10(b) {
    // Марш вниз от площадки (локальная ось X — на восток): ступени уходят в темноту
    const n = 9, step = 0.27, rise = 0.17, w = 4.9;
    for (let i = 0; i < n; i++) b.box('floor_concrete', step, 0.08, w, 0.135 + i * step, -(i + 1) * rise, 0);
    b.box('wall_concrete', n * step, 0.12, w, n * step / 2, -(n + 1) * rise - 0.12, 0);
    for (const z of [-w / 2 + 0.03, w / 2 - 0.03]) b.box('wall_concrete', n * step + 0.4, (n + 2) * rise + 0.3, 0.06, n * step / 2, -(n + 2) * rise - 0.3, z);
    b.box('wall_concrete', 0.06, (n + 2) * rise + 0.3, w, n * step + 0.2, -(n + 2) * rise - 0.3, 0);
    b.plane('black', n * step, w, n * step / 2, -(n + 1) * rise - 0.13, 0, -Math.PI / 2);
    // Перила вдоль марша
    for (let i = 0; i <= n; i += 3) b.box('metal', 0.02, 0.9, 0.02, i * step, -i * rise, -w / 2 + 0.25);
    const rail = b.box('wood_dark', n * step + 0.1, 0.05, 0.06, n * step / 2, 0.9 - n * rise / 2, -w / 2 + 0.25);
    rail.rotation.z = -Math.atan2(rise, step);
    b.col(1.25, 0, 2.5, 5.2);
  },
  army_gear(b) {
    // Брошенное снаряжение: противогаз, каска, рация
    const mask = b.sphere('rubber', 0.11, 0, 0.07, 0, 1, 0.6, 1.1);
    mask.rotation.x = 0.4;
    b.cyl('metal', 0.045, 0.05, 0.09, 0.02, 0.02, 0.14, 10).rotation.x = Math.PI / 2;
    const helmet = b.sphere('plant', 0.15, 0.35, 0.05, -0.12, 1, 0.65, 1.05);
    helmet.rotation.z = 2.8;
    b.box('plastic_dark', 0.08, 0.2, 0.05, -0.25, 0, 0.18).rotation.x = -1.4;
    b.cyl('black', 0.006, 0.006, 0.22, -0.25, 0.04, 0.33, 4).rotation.x = Math.PI / 2;
    const lamp = b.dynamic(b.sphere(b.a.uniqueMaterial('lamp_red'), 0.008, -0.23, 0.07, 0.12));
    b.parts.led = lamp;
  },
});
