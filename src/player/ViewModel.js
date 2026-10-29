// Руки от первого лица: правая держит фонарик, левая поднимает телефон.
// Простые процедурные модели с анимацией покачивания, «тянуться к предмету» и подъёма телефона.
import * as THREE from 'three';
import { boxGeo, cylGeo, sphereGeo } from '../world/geometry.js';

export class ViewModel {
  constructor(camera, assets) {
    this.root = new THREE.Group();
    camera.add(this.root);
    const sleeve = assets.material('cloth_dark');
    const skin = assets.material('skin');
    const metal = assets.material('plastic_dark');

    const mk = (geo, mat, parent, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };

    // Правая рука с фонарём
    this.right = new THREE.Group();
    this.right.position.set(0.24, -0.28, -0.42);
    this.root.add(this.right);
    const ra = mk(boxGeo(0.09, 0.09, 0.42), sleeve, this.right, 0.03, -0.03, 0.2);
    ra.rotation.x = 0.1;
    mk(boxGeo(0.08, 0.075, 0.1), skin, this.right, 0, 0, -0.02);
    this.torch = new THREE.Group();
    this.right.add(this.torch);
    const body = mk(cylGeo(0.022, 0.022, 0.2, 10), metal, this.torch, 0, 0.02, -0.06);
    body.rotation.x = Math.PI / 2;
    const head = mk(cylGeo(0.034, 0.024, 0.06, 12), metal, this.torch, 0, 0.02, -0.18);
    head.rotation.x = Math.PI / 2;
    this.lens = mk(cylGeo(0.03, 0.03, 0.005, 12), new THREE.MeshBasicMaterial({ color: 0x222018 }), this.torch, 0, 0.02, -0.212);
    this.lens.rotation.x = Math.PI / 2;
    this.right.visible = false;

    // Левая рука с телефоном
    this.left = new THREE.Group();
    this.left.position.set(-0.2, -0.5, -0.38);
    this.root.add(this.left);
    mk(boxGeo(0.09, 0.09, 0.4), sleeve, this.left, -0.03, -0.05, 0.2);
    mk(boxGeo(0.085, 0.07, 0.11), skin, this.left, 0, -0.01, -0.02);
    this.phone = mk(boxGeo(0.075, 0.15, 0.009), metal, this.left, 0.01, 0.06, -0.05);
    this.phone.rotation.x = -0.35;
    this.phoneScreen = mk(boxGeo(0.068, 0.138, 0.002), new THREE.MeshBasicMaterial({ color: 0x9bb4c0 }), this.phone, 0, 0, 0.0056);
    this.left.visible = false;

    this.reach = 0;
    this.phoneUp = 0;
    this.phoneTarget = 0;
    this.torchOn = false;
    this.time = 0;
    this.hasTorch = false;
    for (const m of [ra]) m.castShadow = false;
    this.root.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.renderOrder = 10; } });
  }

  setTorch(has, on) {
    this.hasTorch = has;
    this.torchOn = on;
    this.right.visible = has && on;
    this.lens.material.color.setHex(on ? 0xfff6dd : 0x222018);
  }

  setPhone(up) { this.phoneTarget = up ? 1 : 0; }

  poke() { this.reach = 1; }

  update(dt, speed, bob) {
    this.time += dt;
    this.reach = Math.max(0, this.reach - dt * 3);
    this.phoneUp += (this.phoneTarget - this.phoneUp) * Math.min(1, dt * 7);
    this.left.visible = this.phoneUp > 0.02;
    const sway = Math.sin(this.time * 1.3) * 0.004;
    const reachCurve = Math.sin(this.reach * Math.PI);
    this.right.position.set(0.24 + bob.x * 0.4, -0.28 + bob.y * 0.6 + sway, -0.42 - reachCurve * 0.12);
    this.right.rotation.set(reachCurve * 0.2, 0, 0);
    this.left.position.set(-0.2 + this.phoneUp * 0.08, -0.55 + this.phoneUp * 0.3 + bob.y * 0.4, -0.38 - this.phoneUp * 0.02);
  }
}
