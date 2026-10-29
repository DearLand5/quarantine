// Контакты и звонки: входящие и исходящие вызовы, пропущенные, голосовые сообщения, сбои связи.
import { CALLS, OUTGOING } from '../data/calls.js';
import { CHATS } from '../data/messages.js';

export class ContactManager {
  constructor(gameState, bus, chats) {
    this.gs = gameState;
    this.bus = bus;
    this.chats = chats;
    this.ctx = null;
    this.active = null;     // текущий звонок { id, def, state: 'ringing'|'talking', line, timer, dir }
  }

  get log() { return this.gs.data.phone.calls; }

  contacts() {
    // Контакты = видимые личные чаты + неизвестные, появившиеся по ходу сюжета
    const ids = [];
    for (const [id, def] of Object.entries(CHATS)) {
      if (def.type === 'group' || !def.with || def.with === 'mchs') continue;
      if (this.chats.chat(id)?.visible) ids.push(def.with);
    }
    return ids;
  }

  incoming(callId) {
    if (this.active) return false;
    const def = CALLS[callId];
    if (!def) return false;
    this.active = { id: callId, def, state: 'ringing', line: -1, timer: 22, dir: 'in', started: this.gs.time };
    this.bus.emit('call:ringing', { call: this.active, from: def.from });
    this.bus.emit('sound:loop', { id: 'ringtone', name: 'ringtone', bus: 'ui' });
    return true;
  }

  accept() {
    const a = this.active;
    if (!a || a.state !== 'ringing') return;
    if (this.chats.signal <= 0) { this.fail('Нет сети'); return; }
    a.state = 'talking'; a.line = -1; a.timer = 0.6;
    this.bus.emit('sound:stopLoop', { id: 'ringtone' });
    this.bus.emit('call:accepted', { call: a });
  }

  decline(missed = false) {
    const a = this.active;
    if (!a) return;
    this.bus.emit('sound:stopLoop', { id: 'ringtone' });
    this.log.unshift({ contact: a.def.from, dir: 'in', status: missed ? 'missed' : 'declined', time: this.gs.time, duration: 0 });
    this.active = null;
    this.bus.emit('call:ended', { status: missed ? 'missed' : 'declined' });
    if (a.def.onMissed) this.chats.runSequence(a.def.onMissed, { delay: 6 });
    this.gs.setFlag(`${a.def.from}_call_missed`);
  }

  fail(text) {
    const a = this.active;
    this.bus.emit('sound:stopLoop', { id: 'ringtone' });
    this.active = null;
    this.bus.emit('call:ended', { status: 'failed', text });
    if (a) this.log.unshift({ contact: a.def.from, dir: a.dir, status: 'failed', time: this.gs.time, duration: 0 });
  }

  /** Исходящий звонок: сценарий или короткий исход с текстом */
  dial(contactId) {
    if (this.active) return;
    const out = OUTGOING[contactId] || { fallback: 'Абонент не отвечает.' };
    this.bus.emit('call:dialing', { contact: contactId });
    if (this.chats.signal <= 0) {
      setTimeout(() => this.bus.emit('call:ended', { status: 'failed', text: 'Нет сети' }), 1200);
      this.log.unshift({ contact: contactId, dir: 'out', status: 'failed', time: this.gs.time, duration: 0 });
      return;
    }
    const useCall = out.call && (!out.cond || out.cond(this.ctx));
    if (useCall) {
      const def = CALLS[out.call];
      this.active = { id: out.call, def, state: 'talking', line: -1, timer: 2.5, dir: 'out', started: this.gs.time };
      this.bus.emit('call:accepted', { call: this.active });
      return;
    }
    if (out.clue) this.ctx?.clue(out.clue);
    if (contactId === 'vetrov') this.ctx?.vetrovPing(true);
    setTimeout(() => this.bus.emit('call:ended', { status: 'none', text: out.fallback }), 2600);
    this.log.unshift({ contact: contactId, dir: 'out', status: 'none', time: this.gs.time, duration: 0 });
  }

  update(dt) {
    const a = this.active;
    if (!a) return;
    a.timer -= dt;
    if (a.state === 'ringing') {
      if (a.timer <= 0) this.decline(true);
      return;
    }
    if (a.timer > 0) return;
    a.line++;
    const line = a.def.lines[a.line];
    if (!line) { this.end(); return; }
    a.timer = line.dur;
    this.bus.emit('call:line', { call: a, line, from: a.def.from });
    if (line.glitch) this.bus.emit('phone:glitch');
  }

  end() {
    const a = this.active;
    if (!a) return;
    this.active = null;
    this.log.unshift({ contact: a.def.from, dir: a.dir, status: 'answered', time: this.gs.time, duration: Math.max(1, Math.round((this.gs.time - a.started) * 60 / (this.gs.data.timeScale || 10))) });
    this.bus.emit('call:ended', { status: a.def.drop ? 'dropped' : 'ended', text: a.def.drop ? 'Связь прервалась' : '' });
    if (a.def.onEnd) this.gs.setFlag(a.def.onEnd);
    if (a.def.from === 'mom') this.gs.setFlag('mom_call_done');
  }

  hangup() {
    if (!this.active) return;
    if (this.active.state === 'ringing') this.decline(false);
    else this.end();
  }
}
