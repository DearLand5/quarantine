// Сохранения в localStorage: автосохранение + 3 ручных слота, версионирование и миграции структуры.
// Фотографии хранятся отдельно (по ключу на снимок), чтобы не дублироваться в каждом слоте.
import { SAVE_VERSION } from '../core/GameState.js';
import { fmtTime } from '../utils/time.js';

const PREFIX = 'topolinaya14.save.';
export const SLOTS = ['auto', 'slot1', 'slot2', 'slot3'];

// Миграции: ключ — версия, из которой обновляем.
const MIGRATIONS = {
  1: (d) => { d.phone.usedResponses = d.phone.usedResponses || {}; return d; },
  2: (d) => { d.story.clues = d.story.clues || []; d.stats = d.stats || { playSeconds: 0, photosTaken: 0, messagesSent: 0 }; return d; },
};

export class SaveManager {
  constructor(gameState, bus) {
    this.gs = gameState;
    this.bus = bus;
  }

  available() {
    try { const k = '__t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch (e) { return false; }
  }

  meta(slot) {
    try {
      const raw = localStorage.getItem(PREFIX + slot);
      if (!raw) return null;
      return JSON.parse(raw).meta || null;
    } catch (e) { return { broken: true }; }
  }

  latest() {
    let best = null;
    for (const s of SLOTS) {
      const m = this.meta(s);
      if (m && !m.broken && (!best || m.savedAt > best.meta.savedAt)) best = { slot: s, meta: m };
    }
    return best;
  }

  save(slot, locationName = '') {
    this.bus.emit('save:before');
    const data = this.gs.serialize();
    const meta = {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      gameTime: fmtTime(data.time),
      location: locationName,
      chapter: data.chapter,
      playSeconds: Math.round(data.stats.playSeconds),
    };
    try {
      localStorage.setItem(PREFIX + slot, JSON.stringify({ meta, data }));
      this.bus.emit('save:done', { slot, meta });
      return true;
    } catch (e) {
      console.error('[Save] ошибка сохранения', e);
      const quota = e && (e.name === 'QuotaExceededError' || e.code === 22);
      this.bus.emit('save:error', { slot, message: quota ? 'Недостаточно места в хранилище браузера. Удалите старые сохранения.' : 'Не удалось сохранить игру.' });
      return false;
    }
  }

  load(slot) {
    try {
      const raw = localStorage.getItem(PREFIX + slot);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      let data = parsed.data;
      let v = data.version || 1;
      if (v > SAVE_VERSION) throw new Error('Сохранение создано более новой версией игры');
      while (v < SAVE_VERSION) {
        if (MIGRATIONS[v]) data = MIGRATIONS[v](data);
        v++;
        data.version = v;
      }
      return data;
    } catch (e) {
      console.error('[Save] ошибка загрузки', e);
      this.bus.emit('save:error', { slot, message: `Сохранение повреждено или несовместимо: ${e.message}` });
      return null;
    }
  }

  remove(slot) { try { localStorage.removeItem(PREFIX + slot); } catch (e) { /* хранилище недоступно */ } }
}
