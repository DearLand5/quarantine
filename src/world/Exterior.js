// Вид из окон: двор с оцеплением, палатки штаба, машины с мигалками, соседние дома.
// Всё освещено «вручную» (MeshBasicMaterial без тумана), поэтому почти ничего не стоит по производительности.
import * as THREE from 'three';
import { boxGeo, planeGeo, cylGeo } from './geometry.js';
import { Random } from '../utils/Random.js';

const GROUND_Y = -16.5;

export function buildExterior(assets) {
  const group = new THREE.Group();
  group.name = 'exterior';
  const rand = new Random(14);
  const basic = (color, opts = {}) => new THREE.MeshBasicMaterial({ color, fog: false, ...opts });
  const blinkers = [];
  const flickerWindows = [];

  // Небо с засветкой города
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 4; skyCanvas.height = 128;
  const sctx = skyCanvas.getContext('2d');
  const grad = sctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, '#05070a'); grad.addColorStop(0.55, '#0d1216'); grad.addColorStop(0.75, '#2a2620'); grad.addColorStop(1, '#0a0a09');
  sctx.fillStyle = grad; sctx.fillRect(0, 0, 4, 128);
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(110, 16, 12), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.position.y = -10;
  sky.renderOrder = -10;
  group.add(sky);

  // Земля двора
  const groundMat = new THREE.MeshBasicMaterial({ color: 0x1a1c1a, map: assets.texture('ground'), fog: false });
  const ground = new THREE.Mesh(planeGeo(260, 260, 0, 0), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = GROUND_Y;
  group.add(ground);

  // Фасад собственного дома (виден из бокового окна лестницы), соседние дома
  const facadeTex = assets.texture('facade');
  const facadeMat = new THREE.MeshBasicMaterial({ map: facadeTex, fog: false, color: 0xbfbfbf });
  const buildings = [
    { x: 0, z: -62, w: 80, h: 30, ry: 0 },
    { x: -55, z: -10, w: 60, h: 30, ry: Math.PI / 2 },
    { x: 60, z: 6, w: 70, h: 26, ry: -Math.PI / 2 },
    { x: 18, z: -95, w: 50, h: 44, ry: 0 },
  ];
  for (const b of buildings) {
    const mesh = new THREE.Mesh(planeGeo(b.w, b.h, rand.range(0, 24), 0), facadeMat);
    mesh.position.set(b.x, GROUND_Y + b.h / 2, b.z);
    mesh.rotation.y = b.ry;
    group.add(mesh);
    // Несколько окон, которые иногда гаснут и загораются
    for (let i = 0; i < 6; i++) {
      const wm = basic(rand.pick([0xd8b066, 0xc9a35a, 0x9fb4c8]));
      const win = new THREE.Mesh(planeGeo(1.1, 1.3), wm);
      const along = rand.range(-b.w / 2 + 3, b.w / 2 - 3);
      const y = GROUND_Y + 3 + rand.int(0, Math.floor(b.h / 3) - 2) * 3;
      const off = new THREE.Vector3(along, 0, 0.05).applyAxisAngle(new THREE.Vector3(0, 1, 0), b.ry);
      win.position.set(b.x + off.x, y, b.z + off.z);
      win.rotation.y = b.ry;
      group.add(win);
      flickerWindows.push({ mesh: win, timer: rand.range(3, 20), on: true });
    }
  }

  // Оцепление: забор, палатки, машины, прожекторы — к северу от дома
  const fenceMat = basic(0x3c4038);
  for (let x = -40; x <= 40; x += 2.5) {
    const post = new THREE.Mesh(boxGeo(0.12, 2.2, 0.12), fenceMat);
    post.position.set(x, GROUND_Y + 1.1, -24);
    group.add(post);
  }
  const fenceNet = new THREE.Mesh(planeGeo(80, 2, 0, 0), basic(0x2c302a, { transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  fenceNet.position.set(0, GROUND_Y + 1.1, -24);
  group.add(fenceNet);
  const tapeMat = basic(0xb8962e);
  const tape = new THREE.Mesh(boxGeo(80, 0.08, 0.02), tapeMat);
  tape.position.set(0, GROUND_Y + 1.6, -23.9);
  group.add(tape);

  const tentMat = basic(0x9a9c94);
  for (const [x, z] of [[-8, -32], [6, -34]]) {
    const tent = new THREE.Mesh(boxGeo(6, 2.6, 4), tentMat);
    tent.position.set(x, GROUND_Y + 1.3, z);
    group.add(tent);
    const roof = new THREE.Mesh(cylGeo(0.01, 3.4, 1.2, 4), tentMat);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.2, 1, 0.85);
    roof.position.set(x, GROUND_Y + 3.2, z);
    group.add(roof);
    const glowWin = new THREE.Mesh(planeGeo(2.5, 0.8), basic(0xe8e0c0));
    glowWin.position.set(x, GROUND_Y + 1.5, z + 2.01);
    group.add(glowWin);
  }
  const vanMat = basic(0x2a2e2c);
  for (const [x, z, ry] of [[-18, -29, 0.2], [16, -28, -0.3], [26, -40, 1.2]]) {
    const van = new THREE.Mesh(boxGeo(5, 2.3, 2.2), vanMat);
    van.position.set(x, GROUND_Y + 1.15, z);
    van.rotation.y = ry;
    group.add(van);
    const ant = new THREE.Mesh(cylGeo(0.03, 0.03, 2.5, 4), fenceMat);
    ant.position.set(x, GROUND_Y + 3.4, z);
    group.add(ant);
    for (const [col, phase] of [[0x3a6cff, 0], [0xff3a24, 0.5]]) {
      const m = basic(col);
      const lamp = new THREE.Mesh(boxGeo(0.35, 0.15, 0.25), m);
      lamp.position.set(x + (phase ? 0.3 : -0.3), GROUND_Y + 2.4, z);
      group.add(lamp);
      blinkers.push({ mat: m, base: new THREE.Color(col), phase: phase + rand.next() * 0.2, speed: 2.2 });
    }
  }
  // Прожекторы на мачтах
  for (const [x, z] of [[-24, -26], [22, -25]]) {
    const mast = new THREE.Mesh(cylGeo(0.08, 0.1, 7, 6), fenceMat);
    mast.position.set(x, GROUND_Y + 3.5, z);
    group.add(mast);
    const head = new THREE.Mesh(boxGeo(1.2, 0.6, 0.4), basic(0xfff6dd));
    head.position.set(x, GROUND_Y + 7, z + 0.2);
    group.add(head);
    const beam = new THREE.Mesh(cylGeo(0.3, 6, 18, 12), basic(0xfff6dd, { transparent: true, opacity: 0.045, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.set(x * 0.7, GROUND_Y + 4, z + 6);
    beam.rotation.x = -1.0;
    beam.rotation.z = x > 0 ? 0.4 : -0.4;
    group.add(beam);
  }
  // Фонари вдоль дороги
  for (let x = -50; x <= 50; x += 12) {
    const pole = new THREE.Mesh(cylGeo(0.06, 0.08, 6, 5), fenceMat);
    pole.position.set(x, GROUND_Y + 3, -45);
    group.add(pole);
    const light = new THREE.Mesh(boxGeo(0.6, 0.15, 0.3), basic(0xffb35a));
    light.position.set(x, GROUND_Y + 6, -45);
    group.add(light);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(4, 16), basic(0x3a2a14, { transparent: true, opacity: 0.6, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(x, GROUND_Y + 0.02, -45);
    group.add(pool);
  }

  let time = 0;
  function update(dt) {
    time += dt;
    for (const b of blinkers) {
      const on = Math.sin((time * b.speed + b.phase) * Math.PI * 2) > 0.2;
      b.mat.color.copy(b.base).multiplyScalar(on ? 1 : 0.08);
    }
    for (const w of flickerWindows) {
      w.timer -= dt;
      if (w.timer <= 0) {
        w.on = !w.on;
        w.mesh.visible = w.on;
        w.timer = w.on ? rand.range(8, 40) : rand.range(2, 15);
      }
    }
  }

  function dispose() {
    group.traverse((o) => {
      if (o.geometry && !o.geometry.parameters?.cached) o.geometry.dispose?.();
      if (o.material && o.material !== facadeMat) o.material.dispose?.();
    });
    skyTex.dispose();
  }

  return { group, update, dispose };
}
