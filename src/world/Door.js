// Дверь: полотно на петлях с плавной анимацией, цепочкой, глазком, номером и пломбой.
// Логическое состояние (open/locked/chained/sealed) хранится в GameState; объект Door — только визуал и коллайдер.
import * as THREE from 'three';
import { boxGeo, cylGeo } from './geometry.js';

const HIT_MAT = new THREE.MeshBasicMaterial({ visible: false });

export class Door {
  constructor(def, assets, state) {
    this.def = def;
    this.id = def.id;
    this.state = state;                 // ссылка на объект состояния из GameState
    this.amount = state.open ? 1 : 0;   // 0 — закрыта, 1 — открыта
    this.target = this.amount;
    this.root = new THREE.Group();
    this.root.position.set(def.x, 0, def.z);
    if (def.axis === 'z') this.root.rotation.y = Math.PI / 2;
    this.maxAngle = def.interior ? 1.75 : 1.6;
    this.hits = [];
    this.build(assets);
    this.apply();
  }

  build(assets) {
    const { w, h, style, number } = this.def;
    const frameMat = assets.material(style === 'stair' ? 'metal' : (style === 'door_painted' ? 'enamel' : 'wood_dark'));
    // Наличники с обеих сторон и коробка, перекрывающая толщину стены
    const depth = 0.2;
    const add = (geo, mat, x, y, z, parent = this.root) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true; m.receiveShadow = true;
      parent.add(m);
      return m;
    };
    add(boxGeo(0.07, h + 0.07, depth), frameMat, -w / 2 - 0.035, (h + 0.07) / 2, 0);
    add(boxGeo(0.07, h + 0.07, depth), frameMat, w / 2 + 0.035, (h + 0.07) / 2, 0);
    add(boxGeo(w + 0.14, 0.07, depth), frameMat, 0, h + 0.035, 0);
    add(boxGeo(w, 0.02, depth), assets.material('wood_dark'), 0, 0.01, 0);

    // Петля: полотно вращается вокруг вертикальной оси на краю проёма
    const hingeX = this.def.hinge * (w / 2);
    this.pivot = new THREE.Group();
    this.pivot.position.set(hingeX, 0, 0);
    this.root.add(this.pivot);
    const leafW = w - 0.01;
    const leafX = -this.def.hinge * leafW / 2;
    this.leaf = new THREE.Group();
    this.pivot.add(this.leaf);

    if (style === 'stair') {
      const mat = assets.material('door_painted');
      add(boxGeo(leafW, 0.12, 0.05), mat, leafX, 0.06, 0, this.leaf);
      add(boxGeo(leafW, 0.12, 0.05), mat, leafX, h - 0.06, 0, this.leaf);
      add(boxGeo(leafW, 0.12, 0.05), mat, leafX, 0.95, 0, this.leaf);
      add(boxGeo(0.1, h, 0.05), mat, leafX - leafW / 2 + 0.05, h / 2, 0, this.leaf);
      add(boxGeo(0.1, h, 0.05), mat, leafX + leafW / 2 - 0.05, h / 2, 0, this.leaf);
      add(boxGeo(leafW - 0.2, 0.83, 0.05), mat, leafX, 0.53, 0, this.leaf);
      const glass = add(boxGeo(leafW - 0.2, h - 1.13, 0.01), assets.material('glass_wired'), leafX, 0.95 + (h - 1.07) / 2, 0, this.leaf);
      glass.castShadow = false;
      add(boxGeo(0.12, 0.03, 0.08), assets.material('metal'), leafX + this.def.hinge * (-leafW / 2 + 0.12), 1.0, 0, this.leaf);
    } else {
      add(boxGeo(leafW, h - 0.01, 0.05), assets.material(style), leafX, (h - 0.01) / 2, 0, this.leaf);
      const handleMat = assets.material(style === 'door_leather' ? 'brass' : 'chrome');
      const hx = leafX - this.def.hinge * (leafW / 2 - 0.08);
      for (const side of [-1, 1]) {
        add(boxGeo(0.03, 0.03, 0.05), handleMat, hx, 1.0, side * 0.045, this.leaf);
        add(boxGeo(0.12, 0.022, 0.022), handleMat, hx + this.def.hinge * 0.05, 1.0, side * 0.075, this.leaf);
        add(boxGeo(0.03, 0.06, 0.008), handleMat, hx, 0.88, side * 0.03, this.leaf);
      }
      if (this.def.peephole) {
        const ph = add(cylGeo(0.012, 0.012, 0.07, 8), assets.material('chrome'), leafX, 1.55, 0, this.leaf);
        ph.rotation.x = Math.PI / 2;
      }
      if (number) {
        const plate = assets.signMaterial([number], { w: 128, h: 96, bg: '#c8b98a', fg: '#2b2416', size: 64, pad: 12, aged: true });
        // номер с обеих сторон коридора: лицевая сторона — где открывается дверь
        const face = this.def.openDir;
        const p = add(boxGeo(0.11, 0.08, 0.005), plate, leafX, 1.72, face * 0.028, this.leaf);
        if (face < 0) p.rotation.y = Math.PI;
      }
      if (this.def.cameraEye) {
        const cam = add(cylGeo(0.018, 0.018, 0.03, 10), assets.material('black'), leafX + 0.12, 1.62, this.def.openDir * 0.035, this.leaf);
        cam.rotation.x = Math.PI / 2;
      }
    }

    // Цепочка (видна изнутри, когда заперта на цепочку)
    if (this.def.initial?.chained !== undefined) {
      const side = -this.def.openDir;
      this.chain = add(boxGeo(0.16, 0.012, 0.012), assets.material('chrome'), leafX - this.def.hinge * (leafW / 2 - 0.12), 1.32, side * 0.04, this.leaf);
    }

    // Пломба: бумажные полоски крест-накрест (кв. 52)
    if (this.def.initial?.sealed) {
      const sealMat = assets.signMaterial(['ОПЕЧАТАНО', 'УК «Тополь-Сервис»', '14.03.2021', 'М.П.'], { w: 256, h: 512, bg: '#e8e2d0', fg: '#3a2a22', size: 26, pad: 30 });
      this.sealGroup = new THREE.Group();
      this.root.add(this.sealGroup);
      const face = this.def.openDir;
      const s1 = add(boxGeo(0.09, 0.9, 0.003), sealMat, 0, 1.2, face * 0.06, this.sealGroup);
      s1.rotation.z = 0.5;
      const s2 = add(boxGeo(0.09, 0.9, 0.003), sealMat, 0, 1.2, face * 0.062, this.sealGroup);
      s2.rotation.z = -0.5;
      this.sealTorn = add(boxGeo(0.09, 0.32, 0.003), sealMat, w / 2 + 0.02, 1.35, face * 0.1, this.root);
      this.sealTorn.rotation.z = -0.3;
      this.sealTorn.visible = false;
    }

    // Невидимые зоны взаимодействия: изнутри и снаружи двери
    this.hitBody = new THREE.Mesh(boxGeo(w, h * 0.8, 0.22), HIT_MAT);
    this.hitBody.position.set(0, h * 0.45, 0);
    this.hitBody.userData.hitId = `door:${this.id}`;
    this.root.add(this.hitBody);
    this.hits.push(this.hitBody);
    if (this.def.peephole) {
      // Глазок доступен только со стороны, противоположной открыванию (изнутри квартиры)
      const ph = new THREE.Mesh(boxGeo(0.16, 0.16, 0.1), HIT_MAT);
      ph.position.set(leafX, 1.55, -this.def.openDir * 0.1);
      ph.userData.hitId = `peephole:${this.id}`;
      this.root.add(ph);
      this.hits.push(ph);
      this.hitPeephole = ph;
    }
  }

  /** Состояние из GameState -> визуал */
  apply() {
    const s = this.state;
    const chainedLimit = s.chained && s.open ? 0.1 : 1;
    this.target = s.open ? chainedLimit : 0;
    if (this.chain) this.chain.visible = !!s.chained;
    if (this.sealGroup) {
      this.sealGroup.visible = !!s.sealed;
      if (this.sealTorn) this.sealTorn.visible = !s.sealed;
    }
  }

  snap() { this.apply(); this.amount = this.target; this.updateTransform(); }

  get isClosed() { return this.amount < 0.03; }
  get isMoving() { return Math.abs(this.amount - this.target) > 0.002; }

  updateTransform() {
    // Знак угла подобран так, чтобы полотно уходило в сторону openDir.
    const sign = this.def.openDir * this.def.hinge;
    const eased = this.amount * this.amount * (3 - 2 * this.amount);
    this.pivot.rotation.y = sign * eased * this.maxAngle;
  }

  update(dt) {
    if (!this.isMoving) return false;
    const speed = this.target > this.amount ? 1.25 : 1.6;
    const d = this.target - this.amount;
    this.amount += Math.sign(d) * Math.min(Math.abs(d), speed * dt);
    this.updateTransform();
    return true;
  }

  /** AABB-коллайдер полотна, когда дверь закрыта (или приоткрыта на цепочку). */
  collider() {
    if (!this.isClosed && this.amount > 0.15) return null;
    const { x, z, w, axis } = this.def;
    return axis === 'x'
      ? { minX: x - w / 2, maxX: x + w / 2, minZ: z - 0.06, maxZ: z + 0.06, door: this.id }
      : { minX: x - 0.06, maxX: x + 0.06, minZ: z - w / 2, maxZ: z + w / 2, door: this.id };
  }

  /** Точка снаружи/внутри двери для звуков и NPC */
  sidePoint(side = 1, dist = 0.6) {
    const { x, z, axis, openDir } = this.def;
    const n = side * openDir * dist;
    return axis === 'x' ? new THREE.Vector3(x, 1.5, z + n) : new THREE.Vector3(x + n, 1.5, z);
  }
}
