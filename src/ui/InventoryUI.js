// Окно инвентаря: сетка предметов, описание выбранного, действия «Использовать» и «Прочитать».
import { el, clear } from '../utils/dom.js';
import { ITEMS, CLUES } from '../data/items.js';

export class InventoryUI {
  constructor(root, bus, inventory, gameState, { onUse } = {}) {
    this.root = root;
    this.bus = bus;
    this.inventory = inventory;
    this.gs = gameState;
    this.onUse = onUse;
    this.node = null;
    this.selected = null;
    this.unsub = bus.on('inventory:changed', () => { if (this.isOpen) this.render(); });
  }

  get isOpen() { return !!this.node; }

  toggle() { this.isOpen ? this.close() : this.open(); }

  open() {
    if (this.node) return;
    this.node = el('div', { class: 'inventory' });
    this.node.addEventListener('pointerdown', (e) => { if (e.target === this.node) this.close(); });
    this.root.appendChild(this.node);
    const list = this.inventory.list;
    if (!this.selected || !list.find((i) => i.id === this.selected)) this.selected = list[0]?.id || null;
    this.render();
    this.bus.emit('ui:inventory', { open: true });
  }

  close() {
    if (!this.node) return;
    this.node.remove();
    this.node = null;
    this.bus.emit('ui:inventory', { open: false });
  }

  render() {
    const panel = el('div', { class: 'panel' });
    panel.appendChild(el('h2', {}, [
      el('span', { text: 'СУМКА' }),
      el('button', { class: 'close', text: 'Закрыть', onclick: () => this.close() }),
    ]));
    const grid = el('div', { class: 'list' });
    const items = this.inventory.list;
    if (!items.length) grid.appendChild(el('div', { class: 'empty', text: 'Пусто. Осмотрите квартиру.' }));
    for (const it of items) {
      const def = ITEMS[it.id];
      if (!def) continue;
      grid.appendChild(el('div', {
        class: `slot ${it.id === this.selected ? 'sel' : ''}`,
        onclick: () => { this.selected = it.id; this.bus.emit('sound:play', { name: 'tap', bus: 'ui' }); this.render(); },
      }, [
        el('div', { class: 'ico', text: def.icon }),
        el('div', { text: def.name }),
        it.qty > 1 ? el('div', { class: 'qty', text: `×${it.qty}` }) : null,
      ]));
    }
    const detail = el('div', { class: 'detail' });
    const def = this.selected ? ITEMS[this.selected] : null;
    if (def) {
      const acts = el('div', { class: 'acts' });
      if (def.use) acts.appendChild(el('button', { text: 'Использовать', onclick: () => this.onUse?.(this.selected) }));
      if (def.read) acts.appendChild(el('button', { text: 'Прочитать', onclick: () => this.onUse?.(this.selected, 'read') }));
      detail.append(el('h3', { text: `${def.icon} ${def.name}` }), el('p', { text: def.desc }), acts);
    } else {
      detail.appendChild(el('p', { text: 'Выберите предмет, чтобы рассмотреть его.' }));
    }
    const found = (this.gs.data.story.clues || []).length;
    detail.appendChild(el('div', { class: 'clues', text: `Найдено странностей: ${found} из ${Object.keys(CLUES).length}. Подробности — в «Заметках» телефона.` }));
    panel.append(grid, detail);
    clear(this.node);
    this.node.appendChild(panel);
  }

  dispose() { this.close(); this.unsub?.(); }
}
