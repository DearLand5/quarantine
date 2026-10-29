// Навигационный граф этажа (A*) и вычисление расписаний NPC.
import { NAV_NODES, NAV_EDGES, NAV_DOORS } from '../data/locations.js';

export class NavGraph {
  constructor() {
    this.nodes = NAV_NODES;
    this.adj = new Map();
    for (const id of Object.keys(NAV_NODES)) this.adj.set(id, []);
    for (const [a, b] of NAV_EDGES) { this.adj.get(a).push(b); this.adj.get(b).push(a); }
  }

  pos(id) { const p = this.nodes[id]; return p ? { x: p[0], z: p[1] } : null; }

  dist(a, b) { const p = this.nodes[a], q = this.nodes[b]; return Math.hypot(p[0] - q[0], p[1] - q[1]); }

  doorBetween(a, b) { return NAV_DOORS[`${a}|${b}`] || NAV_DOORS[`${b}|${a}`] || null; }

  nearest(x, z) {
    let best = null, bd = Infinity;
    for (const [id, [nx, nz]] of Object.entries(this.nodes)) {
      const d = (nx - x) ** 2 + (nz - z) ** 2;
      if (d < bd) { bd = d; best = id; }
    }
    return best;
  }

  path(from, to) {
    if (from === to) return [to];
    const open = new Set([from]);
    const came = new Map();
    const g = new Map([[from, 0]]);
    const f = new Map([[from, this.dist(from, to)]]);
    while (open.size) {
      let cur = null, best = Infinity;
      for (const n of open) { const v = f.get(n) ?? Infinity; if (v < best) { best = v; cur = n; } }
      if (cur === to) {
        const out = [cur];
        while (came.has(cur)) { cur = came.get(cur); out.unshift(cur); }
        return out;
      }
      open.delete(cur);
      for (const nb of this.adj.get(cur) || []) {
        const tentative = g.get(cur) + this.dist(cur, nb);
        if (tentative < (g.get(nb) ?? Infinity)) {
          came.set(nb, cur); g.set(nb, tentative); f.set(nb, tentative + this.dist(nb, to)); open.add(nb);
        }
      }
    }
    return null;
  }
}

/** Первое подходящее правило расписания. Ошибки в условиях не ломают игру. */
export function evaluateSchedule(def, ctx) {
  for (const rule of def.schedule || []) {
    let ok = false;
    try { ok = rule.when(ctx); } catch (e) { console.warn('[Schedule] ошибка условия', e); }
    if (ok) return rule;
  }
  return { at: def.homeNode, activity: 'home' };
}
