// Задания и их цели. Состояние — в GameState.data.story.quests.
import { QUESTS } from '../data/quests.js';

export class QuestManager {
  constructor(gameState, bus) {
    this.gs = gameState;
    this.bus = bus;
    this.unseen = 0;
  }

  get store() { return this.gs.data.story.quests; }

  start(id) {
    if (!QUESTS[id] || this.store[id]) return;
    this.store[id] = { done: false, objectives: {}, started: this.gs.time };
    this.unseen++;
    this.bus.emit('quest:started', { id });
    this.announce(id);
  }

  isActive(id) { const q = this.store[id]; return !!q && !q.done; }
  isDone(id) { return !!this.store[id]?.done; }
  objectiveDone(qid, oid) { return !!this.store[qid]?.objectives[oid]; }

  objective(qid, oid) {
    if (!this.store[qid]) this.start(qid);
    const q = this.store[qid];
    if (q.done || q.objectives[oid]) return;
    q.objectives[oid] = true;
    this.bus.emit('quest:objective', { id: qid, objective: oid });
    if (QUESTS[qid].objectives.every((o) => q.objectives[o.id])) this.complete(qid);
    else this.announce(qid);
  }

  complete(id) {
    const q = this.store[id];
    if (!q || q.done) return;
    q.done = true;
    for (const o of QUESTS[id].objectives) q.objectives[o.id] = true;
    this.bus.emit('quest:completed', { id });
    this.bus.emit('hud:objective', { text: `✓ ${QUESTS[id].title}` });
  }

  /** Показать текущую невыполненную цель задания */
  announce(id) {
    const q = this.store[id];
    const next = QUESTS[id].objectives.find((o) => !q.objectives[o.id]);
    if (next) this.bus.emit('hud:objective', { text: next.text, title: QUESTS[id].title });
  }

  current() {
    const ids = Object.keys(this.store).filter((id) => !this.store[id].done);
    if (!ids.length) return null;
    const id = ids[ids.length - 1];
    const next = QUESTS[id].objectives.find((o) => !this.store[id].objectives[o.id]);
    return next ? { quest: QUESTS[id].title, text: next.text } : null;
  }

  visible() {
    return Object.keys(this.store).map((id) => ({
      title: QUESTS[id].title,
      done: this.store[id].done,
      objectives: QUESTS[id].objectives.map((o) => ({ text: o.text, done: !!this.store[id].objectives[o.id] })),
    })).reverse();
  }
}
