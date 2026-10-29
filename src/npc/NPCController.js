// Управление одним жильцом: перемещение по графу, открывание дверей по пути, видимость «за дверью»,
// реакция на приближение игрока, разговорная анимация, коллайдер и зона взаимодействия.
import * as THREE from 'three';
import { HumanoidModel } from './HumanoidModel.js';
import { boxGeo } from '../world/geometry.js';

const HIT_MAT = new THREE.MeshBasicMaterial({ visible: false });
const tmpV = new THREE.Vector3();

export class NPCController {
  constructor(id, def, deps) {
    this.id = id;
    this.def = def;
    this.world = deps.world;
    this.nav = deps.nav;
    this.gs = deps.gs;
    this.bus = deps.bus;
    this.physics = deps.physics;
    this.model = new HumanoidModel(def.look, { lambert: deps.lambert });
    this.root = new THREE.Group();
    this.root.add(this.model.root);
    this.root.name = `npc:${id}`;
    this.hit = new THREE.Mesh(boxGeo(0.6, 1.7, 0.6), HIT_MAT);
    this.hit.position.y = 0.85;
    this.hit.userData.hitId = `npc:${id}`;
    this.root.add(this.hit);

    const rt = this.runtime;
    const start = this.nav.pos(rt.node || def.homeNode);
    this.x = rt.x ?? start.x;
    this.z = rt.z ?? start.z;
    this.yaw = rt.yaw ?? 0;
    this.node = rt.node || def.homeNode;
    this.path = [];
    this.waitDoor = null;
    this.closeBehind = null;
    this.activity = rt.activity || 'home';
    this.speed = 0;
    this.talking = false;
    this.lookTarget = null;
    this.forceDoorway = false;  // стоит в проёме своей двери (разговор)
    this.gone = false;
    this.circle = { x: this.x, z: this.z, r: 0.28, id, disabled: false };
    this.physics.circles.push(this.circle);
    this.patrolIndex = 0;
    this.sync();
  }

  get runtime() {
    const store = this.gs.data.npcRuntime;
    if (!store[this.id]) store[this.id] = {};
    return store[this.id];
  }

  save() { Object.assign(this.runtime, { x: this.x, z: this.z, yaw: this.yaw, node: this.node, activity: this.activity }); }

  get moving() { return this.path.length > 0; }

  goTo(nodeId) {
    const dest = this.path.length ? this.path[this.path.length - 1] : this.node;
    if (dest === nodeId) return;
    // Если уже идём — продолжаем к ближайшему узлу и перестраиваем путь от него
    const from = this.path.length ? this.path[0] : this.node;
    const p = this.nav.path(from, nodeId);
    if (!p) { console.warn(`[NPC ${this.id}] нет пути ${from} -> ${nodeId}`); return; }
    this.path = this.path.length ? p : p.slice(1);
  }

  teleport(nodeId) {
    const p = this.nav.pos(nodeId);
    this.x = p.x; this.z = p.z; this.node = nodeId; this.path = [];
  }

  /** Находится ли NPC внутри своей квартиры (за дверью) */
  isInside() {
    if (this.def.insideVisible) return this.node.startsWith('zina') || this.node === 'in45';
    return this.node.startsWith('in');
  }

  update(dt, playerPos) {
    if (this.gone) { this.root.visible = false; this.circle.disabled = true; return; }
    // Движение по пути
    this.speed = 0;
    if (this.path.length && !this.talking) {
      const next = this.path[0];
      const doorId = this.nav.doorBetween(this.node, next);
      if (doorId && !this.handleDoor(doorId)) {
        // ждём открытия двери
      } else {
        const target = this.nav.pos(next);
        const dx = target.x - this.x, dz = target.z - this.z;
        const d = Math.hypot(dx, dz);
        const sp = this.def.speed || 1;
        const step = Math.min(d, sp * dt);
        // Не идём сквозь игрока: если он рядом на пути — ждём
        const pd = Math.hypot(playerPos.x - (this.x + dx / (d || 1) * 0.5), playerPos.z - (this.z + dz / (d || 1) * 0.5));
        if (pd > 0.55 || d < 0.05) {
          this.x += (dx / (d || 1)) * step;
          this.z += (dz / (d || 1)) * step;
          this.speed = step / Math.max(dt, 1e-4);
          if (d > 0.05) this.turnTo(Math.atan2(dx, dz), dt, 8);
        }
        if (d < 0.05) {
          const prev = this.node;
          this.node = next;
          this.path.shift();
          if (this.closeBehind && this.nav.doorBetween(prev, next) === this.closeBehind) {
            const doorRef = this.closeBehind;
            this.closeBehind = null;
            setTimeout(() => this.setDoor(doorRef, false), 600);
          }
        }
      }
    }

    // Голова и корпус — к игроку, если он близко
    const pdist = Math.hypot(playerPos.x - this.x, playerPos.z - this.z);
    const near = pdist < 3.2 && this.root.visible && !(this.isInside() && !this.def.insideVisible);
    if (this.talking || (near && !this.moving)) {
      this.lookTarget = tmpV.set(playerPos.x, playerPos.y ?? 1.6, playerPos.z);
      if (this.talking || pdist < 1.8) this.turnTo(Math.atan2(playerPos.x - this.x, playerPos.z - this.z), dt, this.talking ? 4 : 1.5);
    } else if (this.activity === 'listen') {
      this.lookTarget = null;
      this.turnTo(0, dt, 3);   // лицом к двери 52 (на юг)
    } else if (this.activity === 'smoke') {
      this.lookTarget = null;
      this.turnTo(Math.PI / 2, dt, 2);   // к окну на лестнице
    } else if (this.activity === 'panel') {
      this.lookTarget = null;
      this.turnTo(Math.PI, dt, 3);
    } else this.lookTarget = null;

    this.sync();
    this.model.update(dt, { speed: this.speed, talking: this.talking, lookAt: this.lookTarget, activity: this.moving ? 'walk' : this.activity });
  }

  turnTo(target, dt, rate) {
    let d = target - this.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.yaw += d * Math.min(1, dt * rate);
  }

  /** Возвращает true, когда через дверь можно пройти */
  handleDoor(doorId) {
    const door = this.world.getDoor(doorId);
    if (!door) return true;
    const st = this.gs.door(doorId);
    if (!st.open) {
      if (this.waitDoor !== doorId) {
        this.waitDoor = doorId;
        this.setDoor(doorId, true);
      }
      return false;
    }
    if (door.amount < 0.85 && door.target >= 0.9) return false;
    if (st.chained && st.open && door.target < 0.5) {
      // Цепочка — снимаем
      st.chained = false;
      door.apply();
      return false;
    }
    this.waitDoor = null;
    if (!this.closeBehind) this.closeBehind = doorId;
    return true;
  }

  setDoor(doorId, open) {
    const st = this.gs.door(doorId);
    if (st.open === open) return;
    if (open) { st.open = true; if (st.chained) st.chained = false; }
    else { st.open = false; }
    const door = this.world.getDoor(doorId);
    door?.apply();
    this.bus.emit('door:changed', { id: doorId, open, by: this.id });
    this.bus.emit('sound:play', { name: open ? 'door_open' : 'door_close', pos: door?.sidePoint(1, 0.1), volume: 0.9 });
  }

  sync() {
    this.root.position.set(this.x, 0, this.z);
    this.root.rotation.y = this.yaw;
    const door = this.world.getDoor(this.def.door);
    const hidden = this.isInside() && !this.def.insideVisible && door && door.isClosed && !this.forceDoorway;
    this.root.visible = !hidden && !this.gone;
    this.circle.x = this.x; this.circle.z = this.z;
    this.circle.disabled = !this.root.visible;
    this.hit.visible = false;
  }

  headPosition(out = new THREE.Vector3()) {
    return out.set(this.x, this.model.eyeHeight || 1.6, this.z);
  }
}
