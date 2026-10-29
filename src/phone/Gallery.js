// Галерея: снимки с камеры телефона и полученные фото. Просмотрщик с масштабированием щипком и панорамированием.
// Снимки камеры сохраняются в localStorage отдельно от сохранений; процедурные — генерируются заново.
import { PAINT_2D, PHOTO_META } from './PhotoFactory.js';
import { el } from '../utils/dom.js';
import { fmtTime } from '../utils/time.js';
import { charName } from '../data/characters.js';

const STORE = 'topolinaya14.photo.';

export class Gallery {
  constructor(gameState, bus) {
    this.gs = gameState;
    this.bus = bus;
    this.cache = new Map();
    this.pending = new Map();
    this.render3D = null;   // (key) => Promise<dataUrl>, задаётся Game
  }

  get entries() { return this.gs.data.phone.gallery; }

  list() { return [...this.entries].sort((a, b) => b.time - a.time); }

  get(id) { return this.entries.find((e) => e.id === id) || null; }

  hasTag(tag) { return this.entries.some((e) => (e.tags || []).includes(tag)); }

  ensureReceived(key, from) {
    const id = `r_${key}`;
    if (!this.get(id)) {
      const meta = PHOTO_META[key] || { caption: '', tags: [] };
      this.entries.push({ id, key, from, time: this.gs.time, tags: meta.tags, caption: meta.caption, source: 'received' });
    }
    this.src(id);
    return id;
  }

  addCamera(dataUrl, tags, caption) {
    const id = `c_${Date.now().toString(36)}`;
    this.entries.push({ id, from: 'player', time: this.gs.time, tags, caption, source: 'camera' });
    this.cache.set(id, dataUrl);
    try { localStorage.setItem(STORE + id, dataUrl); }
    catch (e) { this.bus.emit('hud:toast', { text: 'Мало места: снимок не сохранится после перезагрузки', error: true }); }
    this.gs.data.stats.photosTaken++;
    this.bus.emit('gallery:added', { id, tags });
    return id;
  }

  /** dataURL снимка; для асинхронных (3D) возвращает null и пришлёт gallery:ready позже. */
  src(id) {
    if (this.cache.has(id)) return this.cache.get(id);
    const e = this.get(id);
    if (!e) return null;
    if (e.source === 'camera') {
      let data = null;
      try { data = localStorage.getItem(STORE + id); } catch (err) { /* недоступно */ }
      if (data) { this.cache.set(id, data); return data; }
      return null;
    }
    if (PAINT_2D[e.key]) {
      const data = PAINT_2D[e.key]().toDataURL('image/jpeg', 0.8);
      this.cache.set(id, data);
      return data;
    }
    if (this.render3D && !this.pending.has(id)) {
      const p = this.render3D(e.key).then((data) => {
        if (data) { this.cache.set(id, data); this.bus.emit('gallery:ready', { id }); }
        this.pending.delete(id);
      }).catch((err) => { console.warn('[Gallery] 3D-кадр не получен', err); this.pending.delete(id); });
      this.pending.set(id, p);
    }
    return null;
  }

  removeStored() {
    // Очистка снимков при новой игре
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(STORE)) localStorage.removeItem(k);
      }
    } catch (e) { /* недоступно */ }
    this.cache.clear();
  }

  // ------------------------------------------------------------ просмотрщик
  openViewer(container, id, { onSend } = {}) {
    const e = this.get(id);
    if (!e) return;
    const img = el('img', { src: this.src(id) || '', alt: e.caption || 'фото', draggable: 'false' });
    const stage = el('div', { class: 'v-stage' }, [img]);
    const info = `${e.source === 'camera' ? 'Камера' : charName(e.from)} · ${fmtTime(e.time)}${e.caption ? ' · ' + e.caption : ''}`;
    const viewer = el('div', { class: 'viewer' }, [
      el('div', { class: 'v-bar' }, [
        el('button', { text: '‹ Назад', onclick: () => close() }),
        el('span', { class: 'cap', text: info }),
        onSend ? el('button', { text: 'Отправить', onclick: () => { close(); onSend(id); } }) : el('span'),
      ]),
      stage,
      el('div', { class: 'v-zoom' }, [
        el('button', { text: '−', onclick: () => zoomBy(1 / 1.5) }),
        el('button', { text: '+', onclick: () => zoomBy(1.5) }),
      ]),
    ]);
    container.appendChild(viewer);
    const offReady = this.bus.on('gallery:ready', ({ id: rid }) => { if (rid === id) img.src = this.src(id); });

    // Масштабирование и панорамирование (pointer events, работает пальцами и мышью)
    let scale = 1, tx = 0, ty = 0, base = { w: 1, h: 1 };
    const pointers = new Map();
    let pinch = null, last = null, lastTap = 0;
    const fit = () => {
      const r = stage.getBoundingClientRect();
      const ar = (img.naturalWidth || 4) / (img.naturalHeight || 3);
      base.w = Math.min(r.width, r.height * ar);
      base.h = base.w / ar;
      img.style.width = `${base.w}px`; img.style.height = `${base.h}px`;
      apply();
    };
    const clampPan = () => {
      const r = stage.getBoundingClientRect();
      const maxX = Math.max(0, (base.w * scale - r.width) / 2), maxY = Math.max(0, (base.h * scale - r.height) / 2);
      tx = Math.max(-maxX, Math.min(maxX, tx)); ty = Math.max(-maxY, Math.min(maxY, ty));
    };
    const apply = () => {
      clampPan();
      img.style.transform = `translate(${-base.w * scale / 2 + tx}px, ${-base.h * scale / 2 + ty}px) scale(${scale})`;
    };
    const zoomBy = (k) => { scale = Math.max(1, Math.min(6, scale * k)); apply(); };
    img.addEventListener('load', fit);
    requestAnimationFrame(fit);
    stage.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      stage.setPointerCapture?.(ev.pointerId);
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), scale };
      } else {
        last = { x: ev.clientX, y: ev.clientY };
        const now = performance.now();
        if (now - lastTap < 280) { scale = scale > 1.2 ? 1 : 2.5; tx = ty = 0; apply(); }
        lastTap = now;
      }
    });
    stage.addEventListener('pointermove', (ev) => {
      if (!pointers.has(ev.pointerId)) return;
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pinch && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        scale = Math.max(1, Math.min(6, pinch.scale * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d));
        apply();
      } else if (last) {
        tx += ev.clientX - last.x; ty += ev.clientY - last.y;
        last = { x: ev.clientX, y: ev.clientY };
        apply();
      }
    });
    const up = (ev) => { pointers.delete(ev.pointerId); if (pointers.size < 2) pinch = null; if (!pointers.size) last = null; };
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    stage.addEventListener('wheel', (ev) => { ev.preventDefault(); zoomBy(ev.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });

    const close = () => { offReady(); viewer.remove(); };
    this.bus.emit('gallery:viewed', { id, tags: e.tags });
    return close;
  }
}
