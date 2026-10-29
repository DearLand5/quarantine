// Инвентарь игрока. Данные — массив { id, qty } в GameState, описания предметов — в data/items.js.
import { ITEMS } from '../data/items.js';

export class Inventory {
  constructor(gameState, bus) {
    this.gs = gameState;
    this.bus = bus;
  }

  get list() { return this.gs.data.inventory; }

  has(id, qty = 1) { return this.count(id) >= qty; }

  count(id) { return this.list.find((i) => i.id === id)?.qty || 0; }

  add(id, qty = 1, { silent = false } = {}) {
    if (!ITEMS[id]) { console.warn('[Inventory] неизвестный предмет', id); return; }
    const entry = this.list.find((i) => i.id === id);
    if (entry) entry.qty += qty; else this.list.push({ id, qty });
    this.bus.emit('inventory:changed', { id, qty, added: true });
    if (!silent) this.bus.emit('hud:toast', { text: `Получено: ${ITEMS[id].name}${qty > 1 ? ` ×${qty}` : ''}` });
    if (ITEMS[id].clue) this.bus.emit('clue:found', { id: ITEMS[id].clue });
  }

  remove(id, qty = 1) {
    const entry = this.list.find((i) => i.id === id);
    if (!entry) return false;
    entry.qty -= qty;
    if (entry.qty <= 0) this.gs.data.inventory = this.list.filter((i) => i !== entry);
    this.bus.emit('inventory:changed', { id, qty, removed: true });
    return true;
  }

  describe(id) { return ITEMS[id]; }
}
