// Сюжетные события: условие + действие, срабатывают один раз (или повторно, если repeat).
// Проверяются дважды в секунду, а также мгновенно по флагам. «Сработавшие» сохраняются.
import { STORY_EVENTS } from '../data/storyEvents.js';
import { CH2_EVENTS } from '../data/chapter2.js';
import { CH3_EVENTS } from '../data/chapter3.js';

const ALL_EVENTS = [...STORY_EVENTS, ...CH2_EVENTS, ...CH3_EVENTS];

export class EventManager {
  constructor(gameState, bus) {
    this.gs = gameState;
    this.bus = bus;
    this.ctx = null;
    this.timer = 0;
    this.delayed = [];   // { id, at (playSeconds) }
    bus.on('flag:changed', () => { this.timer = Math.min(this.timer, 0.05); });
  }

  get fired() { return this.gs.data.story.fired; }

  update(dt) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.5;
    const now = this.gs.data.stats.playSeconds;
    const chapter = this.gs.data.chapter || 1;
    for (const ev of ALL_EVENTS) {
      if ((ev.chapter || 1) !== chapter) continue;
      if (this.fired[ev.id] && !ev.repeat) continue;
      let ok = false;
      try { ok = ev.cond(this.ctx); } catch (e) { console.error(`[Events] ${ev.id}:`, e); }
      if (!ok) continue;
      this.fired[ev.id] = now;
      try { ev.do(this.ctx); } catch (e) { console.error(`[Events] действие ${ev.id}:`, e); }
      this.bus.emit('story:event', { id: ev.id });
    }
  }

  firedAt(id) { return this.fired[id]; }
}
