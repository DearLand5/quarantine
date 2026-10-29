// Простая и надёжная 2D-физика на плоскости XZ: круг игрока/NPC против AABB стен, мебели и закрытых дверей.
// Этаж плоский, поэтому полноценный 3D-движок не нужен; это экономит батарею телефона.
export class PhysicsSystem {
  constructor() {
    this.static = [];
    this.dynamicProviders = [];   // функции, возвращающие массив AABB (двери, NPC)
    this.circles = [];            // круглые препятствия (NPC): { x, z, r, id }
  }

  setStatic(colliders) { this.static = colliders; }
  addProvider(fn) { this.dynamicProviders.push(fn); }

  collectDynamic() {
    const out = [];
    for (const fn of this.dynamicProviders) {
      const res = fn();
      if (res) for (const c of res) if (c) out.push(c);
    }
    return out;
  }

  /**
   * Перемещение круга радиуса r из (x,z) на (dx,dz) с разрешением столкновений.
   * Движение разбивается на шаги, чтобы на низком FPS не «проскочить» тонкую стену.
   */
  move(x, z, dx, dz, r, ignoreId = null) {
    const dist = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.ceil(dist / (r * 0.5)));
    const dyn = this.collectDynamic();
    let px = x, pz = z;
    for (let s = 0; s < steps; s++) {
      px += dx / steps;
      pz += dz / steps;
      for (let iter = 0; iter < 3; iter++) {
        let pushed = false;
        for (const list of [this.static, dyn]) {
          for (const b of list) {
            const res = pushOut(px, pz, r, b);
            if (res) { px = res[0]; pz = res[1]; pushed = true; }
          }
        }
        for (const c of this.circles) {
          if (c.id === ignoreId || c.disabled) continue;
          const ddx = px - c.x, ddz = pz - c.z;
          const d = Math.hypot(ddx, ddz);
          const min = r + c.r;
          if (d < min && d > 1e-5) { px = c.x + (ddx / d) * min; pz = c.z + (ddz / d) * min; pushed = true; }
        }
        if (!pushed) break;
      }
    }
    return [px, pz];
  }

  /** Пересекает ли отрезок (2D) какой-нибудь статический или динамический коллайдер — для проверки «через стену». */
  segmentBlocked(x0, z0, x1, z1, ignore = null) {
    const dyn = this.collectDynamic();
    for (const list of [this.static, dyn]) {
      for (const b of list) {
        if (b === ignore || b.glimpse) continue;
        if (segmentAABB(x0, z0, x1, z1, b)) return true;
      }
    }
    return false;
  }
}

function pushOut(px, pz, r, b) {
  const cx = Math.max(b.minX, Math.min(px, b.maxX));
  const cz = Math.max(b.minZ, Math.min(pz, b.maxZ));
  const dx = px - cx, dz = pz - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return null;
  if (d2 > 1e-8) {
    const d = Math.sqrt(d2);
    return [cx + (dx / d) * r, cz + (dz / d) * r];
  }
  // Центр внутри прямоугольника — выталкиваем по кратчайшей оси
  const left = px - b.minX, right = b.maxX - px, top = pz - b.minZ, bottom = b.maxZ - pz;
  const m = Math.min(left, right, top, bottom);
  if (m === left) return [b.minX - r, pz];
  if (m === right) return [b.maxX + r, pz];
  if (m === top) return [px, b.minZ - r];
  return [px, b.maxZ + r];
}

function segmentAABB(x0, z0, x1, z1, b) {
  // Алгоритм Лианга–Барски
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
  return t0 < t1 && t1 > 0.02 && t0 < 0.98;
}
