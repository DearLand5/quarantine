// Память и отношения персонажей. Не одно число «доверия», а набор осей, известных фактов, убеждений,
// обещаний, увиденных событий и истории взаимодействий. Всё хранится в GameState.data.npcs.
import { CHARACTERS } from '../data/characters.js';

const NPC_RELATIONS = {
  zinaida: { marina: 40, gennady: 5, denis: 15, olga: 30, vetrov: 50 },
  marina: { zinaida: 35, gennady: -15, denis: 5, olga: 25 },
  denis: { gennady: -35, zinaida: 20, lisa: 25, marina: 10 },
  gennady: { denis: -40, zinaida: 0, marina: -5, olga: -10, artur: -20 },
  olga: { gennady: -10, zinaida: 25 },
};

export class RelationshipSystem {
  constructor(gameState, bus) {
    this.gs = gameState;
    this.bus = bus;
  }

  ensureAll() {
    for (const id of Object.keys(CHARACTERS)) this.get(id);
  }

  get(id) {
    const store = this.gs.data.npcs;
    if (!store[id]) {
      store[id] = {
        trust: CHARACTERS[id]?.trust ?? 0,   // доверие к игроку
        respect: 0,                           // уважение (можно уважать, не доверяя)
        fear: 0,                              // страх (растёт с событиями)
        suspicion: 0,                         // подозрительность к игроку
        knows: [],                            // известные факты (id)
        beliefs: {},                          // факт -> true/false (может быть ошибочным)
        promises: [],                         // { id, status, t }
        witnessed: [],                        // события, увиденные лично
        statements: [],                       // что персонаж утверждал
        relations: { ...(NPC_RELATIONS[id] || {}) },
        history: [],                          // { t, text }
        met: false,                           // встречались ли вживую
        missing: false,
      };
    }
    return store[id];
  }

  adjust(id, deltas, reason = '') {
    const r = this.get(id);
    for (const [k, v] of Object.entries(deltas)) {
      r[k] = Math.max(-100, Math.min(100, (r[k] || 0) + v));
    }
    if (reason) this.log(id, reason);
    this.bus.emit('rel:changed', { id, deltas, record: r });
  }

  log(id, text) {
    const r = this.get(id);
    r.history.push({ t: Math.round(this.gs.time), text });
    if (r.history.length > 60) r.history.shift();
  }

  learn(id, fact, source = 'player') {
    const r = this.get(id);
    if (r.knows.includes(fact)) return false;
    r.knows.push(fact);
    this.log(id, `узнал(а): ${fact} (${source})`);
    this.bus.emit('rel:learned', { id, fact, source });
    return true;
  }

  knows(id, fact) { return this.get(id).knows.includes(fact); }

  believe(id, fact, value) { this.get(id).beliefs[fact] = value; }

  believes(id, fact) { return this.get(id).beliefs[fact]; }

  witness(id, event) {
    const r = this.get(id);
    if (!r.witnessed.includes(event)) r.witnessed.push(event);
    this.learn(id, event, 'witness');
  }

  state(id, statement) { this.get(id).statements.push({ t: Math.round(this.gs.time), statement }); }

  promise(id, pid) {
    const r = this.get(id);
    if (!r.promises.find((p) => p.id === pid)) r.promises.push({ id: pid, status: 'open', t: Math.round(this.gs.time) });
  }

  promiseStatus(id, pid) { return this.get(id).promises.find((p) => p.id === pid)?.status || null; }

  keep(id, pid) {
    const p = this.get(id).promises.find((x) => x.id === pid);
    if (p && p.status === 'open') { p.status = 'kept'; this.adjust(id, { trust: 8 }, `обещание выполнено: ${pid}`); }
  }

  breakPromise(id, pid) {
    const p = this.get(id).promises.find((x) => x.id === pid);
    if (p && p.status !== 'broken') { p.status = 'broken'; this.adjust(id, { trust: -15, suspicion: 15 }, `обещание нарушено: ${pid}`); }
  }

  /** Сообщение в общий чат: факт становится известен всем участникам. */
  broadcast(fact, members) {
    for (const id of members) this.learn(id, fact, 'chat');
  }

  /** Сводка для отладки и финального экрана */
  summary(id) {
    const r = this.get(id);
    const t = r.trust;
    const word = t >= 40 ? 'доверяет' : t >= 15 ? 'симпатизирует' : t > -15 ? 'насторожен(а)' : t > -40 ? 'не доверяет' : 'враждебен(на)';
    return { trust: t, word, respect: r.respect, missing: r.missing };
  }
}
