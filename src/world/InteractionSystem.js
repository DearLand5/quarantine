// Поиск объекта под прицелом, подсказка и выполнение действия.
// Обработчики действий описаны в data/interactions.js и получают сюжетный контекст.
import * as THREE from 'three';

export class InteractionSystem {
  constructor(sceneManager, physics, bus) {
    this.sm = sceneManager;
    this.physics = physics;
    this.bus = bus;
    this.hits = [];
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 2.4;
    this.center = new THREE.Vector2(0, 0);
    this.timer = 0;
    this.current = null;      // { id, handler, label, distance, point }
    this.resolver = () => null;
    this.enabled = true;
    this.hold = null;         // удержание для действий с задержкой
  }

  setHits(list) { this.hits = list; }
  addHit(mesh) { this.hits.push(mesh); }
  removeHit(mesh) { this.hits = this.hits.filter((h) => h !== mesh); }
  setResolver(fn) { this.resolver = fn; }

  update(dt, playerPos) {
    if (this.hold) {
      this.hold.t += dt;
      this.bus.emit('interact:hold', { p: Math.min(1, this.hold.t / this.hold.duration) });
      if (this.hold.t >= this.hold.duration) {
        const h = this.hold; this.hold = null;
        this.bus.emit('interact:hold', { p: 0 });
        h.handler.action?.(h.hitId, h);
      }
    }
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.08;
    if (!this.enabled) { this.setCurrent(null); return; }
    this.raycaster.setFromCamera(this.center, this.sm.camera);
    const res = this.raycaster.intersectObjects(this.hits, false);
    let found = null;
    for (const r of res) {
      const id = r.object.userData.hitId;
      const handler = this.resolver(id, r.object);
      if (!handler) continue;
      const label = handler.label?.(id, r.object);
      if (!label) continue;
      // Проверка, что между игроком и объектом нет стены
      const ignore = id.startsWith('door:') || id.startsWith('peephole:') ? (b) => b.door === id.split(':')[1] : null;
      const blocked = this.blocked(playerPos, r.point, ignore);
      if (blocked) continue;
      found = { id, handler, label, distance: r.distance, point: r.point.clone(), object: r.object, important: handler.important?.(id) };
      break;
    }
    this.setCurrent(found);
  }

  blocked(from, point, ignoreFn) {
    // Отступаем немного от точки попадания к игроку, чтобы не задевать коллайдер самого предмета
    const dx = point.x - from.x, dz = point.z - from.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.35) return false;
    const k = (len - 0.32) / len;
    const tx = from.x + dx * k, tz = from.z + dz * k;
    const dyn = this.physics.collectDynamic();
    const lists = [this.physics.static, dyn];
    for (const list of lists) for (const b of list) {
      if (b.glimpse || (ignoreFn && ignoreFn(b))) continue;
      if (segmentHits(from.x, from.z, tx, tz, b)) return true;
    }
    return false;
  }

  setCurrent(found) {
    const prevId = this.current?.id, prevLabel = this.current?.label;
    this.current = found;
    if (found?.id !== prevId || found?.label !== prevLabel) this.bus.emit('interact:focus', found ? { label: found.label, sub: found.handler.sub?.(found.id), important: found.important } : null);
  }

  interact() {
    if (!this.current || !this.enabled) return false;
    const { id, handler } = this.current;
    const duration = handler.hold?.(id) || 0;
    if (duration > 0) {
      this.hold = { t: 0, duration, handler, hitId: id };
      return true;
    }
    this.bus.emit('player:interact-anim');
    handler.action?.(id, this.current);
    this.timer = 0;   // сразу обновить подсказку
    return true;
  }

  cancelHold() {
    if (this.hold) { this.hold = null; this.bus.emit('interact:hold', { p: 0 }); }
  }
}

function segmentHits(x0, z0, x1, z1, b) {
  let t0 = 0, t1 = 1;
  const dx = x1 - x0, dz = z1 - z0;
  const p = [-dx, dx, -dz, dz];
  const q = [x0 - b.minX, b.maxX - x0, z0 - b.minZ, b.maxZ - z0];
  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]) < 1e-9) { if (q[i] < 0) return false; continue; }
    const t = q[i] / p[i];
    if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
    else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return t0 <= t1;
}
