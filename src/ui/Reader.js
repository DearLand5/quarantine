// Просмотр записок, документов и экранов: лист бумаги (или «экран») поверх игры.
import { el } from '../utils/dom.js';

export class Reader {
  constructor(root) {
    this.root = root;
    this.node = null;
    this.resolve = null;
  }

  get isOpen() { return !!this.node; }

  show({ title = '', text = '', screen = false } = {}) {
    this.close();
    const paper = el('div', { class: `paper ${screen ? 'screen' : ''}` }, [title ? el('h4', { text: title }) : null, text]);
    this.node = el('div', { class: 'reader' }, [
      paper,
      el('button', { class: 'r-close', text: 'Закрыть', onclick: (e) => { e.stopPropagation(); this.close(); } }),
    ]);
    this.node.addEventListener('pointerdown', (e) => { if (e.target === this.node) this.close(); });
    this.root.appendChild(this.node);
    return new Promise((r) => { this.resolve = r; });
  }

  close() {
    if (!this.node) return;
    this.node.remove();
    this.node = null;
    const r = this.resolve;
    this.resolve = null;
    r?.();
  }
}
