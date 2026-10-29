// Разговоры вживую: граф реплик с условиями и последствиями. Данные — data/dialogues.js.
// Узел: { speaker, text (строка|функция), choices?, next?, do?, end? }. Варианты: { text, cond, do, next, tag }.
import { DIALOGUES } from '../data/dialogues.js';
import { CHARACTERS, charName } from '../data/characters.js';

export class DialogueSystem {
  constructor(gameState, bus) {
    this.gs = gameState;
    this.bus = bus;
    this.ctx = null;
    this.active = null;   // { npc, graph, node, onEnd }
  }

  get isActive() { return !!this.active; }

  /** Ответ на стук: 'open' | { say, who } | null */
  doorResponse(npcId) {
    const g = DIALOGUES[npcId];
    if (!g?.door) return 'open';
    try { return g.door(this.ctx); } catch (e) { console.error(e); return 'open'; }
  }

  start(npcId, { entry = null, onEnd = null } = {}) {
    const graph = DIALOGUES[npcId];
    if (!graph) { console.warn('[Dialogue] нет диалога', npcId); return false; }
    let nodeId = entry;
    if (!nodeId) {
      for (const e of graph.entries) {
        let ok = false;
        try { ok = !e.cond || e.cond(this.ctx); } catch (err) { console.error(err); }
        if (ok) { nodeId = e.node; break; }
      }
    }
    if (!nodeId) return false;
    this.active = { npc: npcId, graph, node: null, onEnd };
    this.bus.emit('dialogue:start', { npc: npcId });
    this.ctx?.rel.get(npcId) && (this.ctx.rel.get(npcId).met = true);
    this.goto(nodeId);
    return true;
  }

  goto(nodeId) {
    const a = this.active;
    if (!a) return;
    if (!nodeId) { this.end(); return; }
    const node = a.graph.nodes[nodeId];
    if (!node) { console.warn('[Dialogue] нет узла', nodeId); this.end(); return; }
    a.node = nodeId;
    if (node.do) this.safe(() => node.do(this.ctx));
    if (!this.active) return;   // do мог завершить разговор
    const text = typeof node.text === 'function' ? this.safe(() => node.text(this.ctx)) : node.text;
    const speaker = node.speaker || a.npc;
    const choices = (node.choices || [])
      .map((c, i) => ({ ...c, index: i }))
      .filter((c) => !c.cond || this.safe(() => c.cond(this.ctx)))
      .map((c) => ({ text: typeof c.text === 'function' ? c.text(this.ctx) : c.text, index: c.index, tag: c.tag, seen: !!this.gs.flag(`dlg:${a.npc}:${nodeId}:${c.index}`) }));
    this.bus.emit('dialogue:line', {
      npc: a.npc, speaker, name: speaker === 'player' ? 'Вы' : speaker === 'narrator' ? '' : (CHARACTERS[speaker]?.short || charName(speaker)),
      text, choices, end: !!node.end && !choices.length, mood: node.mood,
    });
    if (speaker !== 'player' && speaker !== 'narrator' && text) {
      const voice = CHARACTERS[speaker]?.voice || { pitch: 150 };
      this.bus.emit('npc:speak', { id: speaker, text, pitch: voice.pitch, duration: Math.min(4.5, 0.6 + text.length * 0.035) });
    }
  }

  /** Продолжить реплику без вариантов */
  advance() {
    const a = this.active;
    if (!a) return;
    const node = a.graph.nodes[a.node];
    if (node.choices?.length) return;
    if (node.end || !node.next) { this.end(); return; }
    this.goto(node.next);
  }

  choose(index) {
    const a = this.active;
    if (!a) return;
    const node = a.graph.nodes[a.node];
    const c = node.choices?.[index];
    if (!c) return;
    this.gs.setFlag(`dlg:${a.npc}:${a.node}:${index}`, true);
    this.ctx?.rel.log(a.npc, `разговор: «${(typeof c.text === 'function' ? c.text(this.ctx) : c.text).slice(0, 50)}»`);
    if (c.do) this.safe(() => c.do(this.ctx));
    if (!this.active) return;
    if (c.next === null || c.end) { this.end(); return; }
    this.goto(c.next || node.next);
  }

  end() {
    const a = this.active;
    if (!a) return;
    this.active = null;
    this.bus.emit('dialogue:end', { npc: a.npc });
    a.onEnd?.();
  }

  safe(fn) { try { return fn(); } catch (e) { console.error('[Dialogue] ошибка в сценарии', e); return null; } }
}
