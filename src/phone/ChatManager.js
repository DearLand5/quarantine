// Логика переписок: хранение сообщений, проигрывание сюжетных цепочек с паузами и индикатором набора,
// выборы ответов, свободный ввод через распознавание намерений, фото, статусы доставки и зависимость от сети.
// Всё состояние (включая незавершённые цепочки) сериализуемо — цепочки ссылаются на данные по id.
import { CHATS, HISTORY, SEQUENCES, AMBIENT, RESPONSES, GROUP_ROUTING, PHOTO_REACTIONS, GROUP } from '../data/messages.js';
import { CHARACTERS } from '../data/characters.js';
import { recognize, matchOption } from './IntentRecognizer.js';
import { fmtDay } from '../utils/time.js';

const REPEAT_LINES = {
  zinaida: ['я ж тебе уже писала Кирюша'], denis: ['я выше ответил 🙃'], gennady: ['Я уже ответил.'],
  marina: ['Я писала выше'], mom: ['Я же тебе написала'], olga: ['Я ответила выше.'],
};

export class ChatManager {
  constructor(gameState, bus) {
    this.gs = gameState;
    this.bus = bus;
    this.ctx = null;           // сюжетный контекст (StoryContext), задаётся извне
    this.gallery = null;
    this.signal = 2;
    this.viewing = null;       // id открытого чата (для прочтения)
    this.ambientTimer = 70;
    this.seqCounter = 0;
  }

  get phone() { return this.gs.data.phone; }

  // ------------------------------------------------------------ инициализация
  initNewGame() {
    const p = this.phone;
    p.chats = {};
    p.chatOrder = [];
    p.keys = {};
    p.ambientPlayed = [];
    p.msgCounter = 0;
    for (const [id, def] of Object.entries(CHATS)) {
      p.chats[id] = { id, visible: !!def.visible, unread: 0, messages: [], lastActivity: 0, typing: null };
      for (const h of HISTORY[id] || []) {
        const { label, minutes } = parseAt(h.at);
        const msg = this.makeMessage(id, { from: h.from, text: h.text || '', photo: h.photo, sys: h.sys }, minutes, label);
        msg.status = 'read';
        if (h.photo) msg.photoId = this.ensurePhoto(h.photo, h.from);
        p.chats[id].messages.push(msg);
        p.chats[id].lastActivity = minutes;
      }
      p.chatOrder.push(id);
    }
    // Непрочитанные в группе — то, что пришло за последние полчаса до начала
    p.chats.house.unread = 4;
    p.chats.mchs.unread = 1;
  }

  makeMessage(chatId, data, minutes = this.gs.time, dayLabel = null) {
    const p = this.phone;
    p.msgCounter = (p.msgCounter || 0) + 1;
    return {
      id: `m${p.msgCounter}`, chat: chatId, from: data.from, text: data.text ?? '', time: minutes,
      day: dayLabel || fmtDay(minutes), status: data.from === 'player' ? 'sent' : 'received',
      replyTo: data.replyTo || null, photoId: null, voice: data.voice || null, sys: !!data.sys,
      deleted: false, edited: false, fake: !!data.fake, key: data.key || null,
    };
  }

  chat(id) { return this.phone.chats[id]; }
  def(id) { return CHATS[id]; }
  members(id) { return CHATS[id]?.type === 'group' ? CHATS[id].members : [CHATS[id]?.with].filter(Boolean); }

  title(id) {
    const d = CHATS[id];
    if (!d) return id;
    if (d.title) return d.title;
    return CHARACTERS[d.with]?.chatName || d.with;
  }

  totalUnread() {
    let n = 0;
    for (const c of Object.values(this.phone.chats)) if (c.visible) n += c.unread;
    return n;
  }

  setVisible(id) {
    const c = this.chat(id);
    if (c && !c.visible) { c.visible = true; this.bus.emit('chat:updated', { chat: id }); }
  }

  ensurePhoto(photoKey, from) {
    if (!this.gallery) return null;
    return this.gallery.ensureReceived(photoKey, from);
  }

  // ------------------------------------------------------------ публикация
  post(chatId, data) {
    const c = this.chat(chatId);
    if (!c) { console.warn('[Chat] нет чата', chatId); return null; }
    const msg = this.makeMessage(chatId, data);
    if (data.photo) msg.photoId = this.ensurePhoto(data.photo, data.from);
    if (data.photoId) msg.photoId = data.photoId;
    if (data.replyKey) msg.replyTo = this.phone.keys[data.replyKey] || null;
    c.messages.push(msg);
    c.lastActivity = this.gs.time;
    c.visible = true;
    if (data.key) this.phone.keys[data.key] = msg.id;
    // Чат поднимается наверх списка
    this.phone.chatOrder = [chatId, ...this.phone.chatOrder.filter((x) => x !== chatId)];
    const incoming = data.from !== 'player' || data.fake;
    if (incoming && !msg.sys) {
      if (this.viewing === chatId) msg.status = 'read';
      else c.unread++;
      // Сообщения игрока в этом чате считаются прочитанными, когда собеседник ответил
      for (const m of c.messages) if (m.from === 'player' && m.status === 'sent') m.status = 'read';
    }
    this.bus.emit('chat:message', { chat: chatId, msg, incoming });
    return msg;
  }

  findByKey(key) {
    const id = this.phone.keys[key];
    if (!id) return null;
    for (const c of Object.values(this.phone.chats)) {
      const m = c.messages.find((x) => x.id === id);
      if (m) return m;
    }
    return null;
  }

  findMessage(chatId, id) { return this.chat(chatId)?.messages.find((m) => m.id === id) || null; }

  markRead(chatId) {
    const c = this.chat(chatId);
    if (!c) return;
    if (c.unread) { c.unread = 0; this.bus.emit('chat:read', { chat: chatId }); }
    for (const m of c.messages) if (m.status === 'received') m.status = 'read';
  }

  // ------------------------------------------------------------ сюжетные цепочки
  runSequence(id, { delay = 0 } = {}) {
    if (!SEQUENCES[id]) { console.warn('[Chat] нет цепочки', id); return; }
    this.phone.activeSequences.push({ uid: `s${Date.now().toString(36)}${this.seqCounter++}`, seq: id, step: 0, phase: 'enter', timer: delay });
  }

  runInline(chatId, steps, { delay = 0 } = {}) {
    // Короткие ответы на свободный ввод; только данные (без функций), чтобы сохраняться
    this.phone.activeSequences.push({ uid: `i${this.seqCounter++}`, inline: steps.map((s) => ({ chat: chatId, ...s })), step: 0, phase: 'enter', timer: delay });
  }

  isRunning(id) { return this.phone.activeSequences.some((r) => r.seq === id); }

  stepsOf(run) {
    if (run.inline) return run.inline;
    if (run.ambient) return AMBIENT.find((a) => a.id === run.ambient)?.steps.map((s) => ({ chat: GROUP, ...s })) || [];
    if (run.photoReaction !== undefined) {
      const r = PHOTO_REACTIONS[run.photoReaction];
      return r ? r.steps.map((s) => ({ chat: run.chat, ...s, from: s.from === '$with' ? run.withFrom : s.from })) : [];
    }
    return SEQUENCES[run.seq] || [];
  }

  update(dt) {
    const runs = this.phone.activeSequences;
    for (let i = runs.length - 1; i >= 0; i--) {
      const run = runs[i];
      const finished = this.advance(run, dt);
      if (finished) {
        const idx = runs.indexOf(run);
        if (idx >= 0) runs.splice(idx, 1);
      }
    }
    this.checkChoiceTimeouts();
    this.deliverPending();
    this.updateAmbient(dt);
  }

  /** Возвращает true, когда цепочка закончилась. */
  advance(run, dt) {
    const steps = this.stepsOf(run);
    let guard = 0;
    while (guard++ < 50) {
      if (run.step >= steps.length) return true;
      const step = steps[run.step];
      const chatId = step.chat || run.chat || GROUP;

      if (run.phase === 'enter') {
        // Шаг-условие без содержимого прерывает цепочку; условие у сообщения — просто пропускает его
        if (step.cond) {
          const ok = this.safe(() => step.cond(this.ctx));
          const onlyCond = Object.keys(step).every((k) => k === 'cond' || k === 'chat');
          if (!ok) { if (onlyCond) return true; run.step++; continue; }
          if (onlyCond) { run.step++; continue; }
        }
        if (step.do && !step.text && !step.from) { this.safe(() => step.do(this.ctx)); run.step++; continue; }
        if (step.choice) { this.openChoice(run, step, step.choice.chat || chatId); return true; }
        if (step.run) {
          if (step.delay) { run.phase = 'runwait'; run.timer = step.delay; } else { this.runSequence(step.run); run.step++; }
          if (run.phase === 'runwait') return false;
          continue;
        }
        run.phase = 'delay';
        run.timer = step.wait ?? step.delay ?? defaultDelay(step);
      }

      if (run.phase === 'runwait') {
        run.timer -= dt; if (run.timer > 0) return false;
        this.runSequence(step.run); run.phase = 'enter'; run.step++; continue;
      }

      if (run.phase === 'delay') {
        run.timer -= dt;
        if (run.timer > 0) return false;
        if (step.wait !== undefined && !step.from && !step.sys) { run.phase = 'enter'; run.step++; continue; }
        if (step.del || step.edit) {
          const m = this.findByKey(step.del || step.edit);
          if (m) {
            if (step.del) { m.deleted = true; m.text = ''; } else { m.text = step.text; m.edited = true; }
            this.bus.emit('chat:changed', { chat: m.chat, msg: m });
          }
          run.phase = 'enter'; run.step++; continue;
        }
        if (step.sys) { this.post(chatId, { from: 'system', sys: true, text: step.sys }); run.phase = 'enter'; run.step++; continue; }
        // Без сети входящие ждут (как настоящая доставка)
        if (this.signal <= 0 && step.from !== 'player') { run.timer = 0.5; return false; }
        run.phase = 'typing';
        run.timer = step.typing ?? typingTime(step);
        if (run.timer > 0 && step.from !== 'player') this.setTyping(chatId, step.from);
      }

      if (run.phase === 'typing') {
        run.timer -= dt;
        if (run.timer > 0) return false;
        this.setTyping(chatId, null);
        this.post(chatId, {
          from: step.from, text: step.text, photo: step.photo, voice: step.voice, key: step.key,
          replyKey: step.reply, fake: step.fake,
        });
        if (step.do) this.safe(() => step.do(this.ctx));
        run.phase = 'enter';
        run.step++;
        continue;
      }
    }
    return false;
  }

  setTyping(chatId, from) {
    const c = this.chat(chatId);
    if (!c) return;
    const prev = c.typing;
    c.typing = from ? { from } : null;
    if (prev?.from !== from) this.bus.emit('chat:typing', { chat: chatId, from });
  }

  safe(fn) {
    try { return fn(); } catch (e) { console.error('[Chat] ошибка в сценарии', e); return false; }
  }

  // ------------------------------------------------------------ выборы
  openChoice(run, step, chatId) {
    const ch = step.choice;
    const list = this.phone.pendingChoices[chatId] || (this.phone.pendingChoices[chatId] = []);
    if (list.some((x) => x.id === ch.id)) return;
    list.push({ id: ch.id, seq: run.seq, step: run.step, expiresAt: ch.timeout ? this.gs.time + ch.timeout : null, openedAt: this.gs.time });
    this.bus.emit('chat:choice', { chat: chatId, id: ch.id });
  }

  choiceDef(pending) {
    const steps = SEQUENCES[pending.seq] || [];
    return steps[pending.step]?.choice || null;
  }

  /** Активные варианты ответа для чата (с учётом условий) */
  choicesFor(chatId) {
    const list = this.phone.pendingChoices[chatId] || [];
    const out = [];
    for (const p of list) {
      const def = this.choiceDef(p);
      if (!def) continue;
      for (const opt of def.options) {
        if (opt.cond && !this.safe(() => opt.cond(this.ctx))) continue;
        out.push({ pending: p, def, opt });
      }
    }
    return out;
  }

  hasChoice(chatId, id = null) {
    const list = this.phone.pendingChoices[chatId] || [];
    return id ? list.some((x) => x.id === id) : list.length > 0;
  }

  closeChoice(id) {
    for (const [chatId, list] of Object.entries(this.phone.pendingChoices)) {
      const filtered = list.filter((x) => x.id !== id);
      if (filtered.length !== list.length) { this.phone.pendingChoices[chatId] = filtered; this.bus.emit('chat:choice', { chat: chatId }); }
    }
  }

  choose(chatId, choiceId, optionId, typedText = null) {
    const list = this.phone.pendingChoices[chatId] || [];
    const pending = list.find((x) => x.id === choiceId);
    if (!pending) return false;
    const def = this.choiceDef(pending);
    const opt = def?.options.find((o) => o.id === optionId);
    if (!opt) return false;
    this.phone.pendingChoices[chatId] = list.filter((x) => x !== pending);
    if (typedText === null) this.sendPlayer(chatId, opt.text);
    this.gs.data.flags[`choice:${choiceId}`] = optionId;
    if (opt.do) this.safe(() => opt.do(this.ctx));
    this.bus.emit('chat:chosen', { chat: chatId, choice: choiceId, option: optionId });
    if (opt.next) this.runSequence(opt.next, { delay: 0.5 });
    return true;
  }

  checkChoiceTimeouts() {
    for (const [chatId, list] of Object.entries(this.phone.pendingChoices)) {
      for (const p of [...list]) {
        if (p.expiresAt !== null && this.gs.time >= p.expiresAt) {
          this.phone.pendingChoices[chatId] = this.phone.pendingChoices[chatId].filter((x) => x !== p);
          const def = this.choiceDef(p);
          this.gs.data.flags[`choice:${p.id}`] = 'timeout';
          if (def?.onTimeout) this.runSequence(def.onTimeout);
          this.bus.emit('chat:choice', { chat: chatId });
        }
      }
    }
  }

  // ------------------------------------------------------------ сообщения игрока
  canReach(chatId) {
    const d = CHATS[chatId];
    if (!d || d.readonly) return false;
    if (chatId === 'lyosha' && this.gs.flag('lyosha_lost')) return 'failed';
    return true;
  }

  sendPlayer(chatId, text, extra = {}) {
    const reach = this.canReach(chatId);
    const msg = this.post(chatId, { from: 'player', text, ...extra });
    if (!msg) return null;
    if (reach === 'failed') msg.status = 'failed';
    else if (this.signal <= 0) msg.status = 'pending';
    this.gs.data.stats.messagesSent++;
    this.bus.emit('sound:play', { name: 'send', bus: 'ui' });
    this.bus.emit('chat:sent', { chat: chatId, msg });
    // Факт общения запоминается участниками
    for (const id of this.members(chatId)) this.ctx?.rel.log(id, `игрок написал: «${text.slice(0, 60)}»`);
    return msg;
  }

  deliverPending() {
    if (this.signal <= 0) return;
    for (const c of Object.values(this.phone.chats)) {
      for (const m of c.messages) {
        if (m.status === 'pending') { m.status = 'sent'; this.bus.emit('chat:changed', { chat: c.id, msg: m }); }
      }
    }
  }

  sendFree(chatId, text) {
    text = String(text).trim().slice(0, 400);
    if (!text) return;
    const msg = this.sendPlayer(chatId, text);
    if (!msg || msg.status === 'failed') return;
    const result = recognize(text);
    // 1) Подходит ли текст к одному из ожидающих выборов?
    const options = this.choicesFor(chatId);
    const matched = matchOption(result, options.map((o) => ({ ...o.opt, _p: o })));
    if (matched) {
      this.choose(chatId, matched._p.pending.id, matched.id, text);
      return;
    }
    // 2) Свободный ответ персонажа по намерению
    const responder = this.pickResponder(chatId, result);
    if (!responder) return;
    const line = this.pickLine(responder, result.primary);
    if (!line) { this.ctx?.rel.log(responder, 'прочитал(а) и не ответил(а)'); return; }
    this.runInline(chatId, [{ from: responder, text: line }], { delay: 1.5 + Math.random() * 3 });
  }

  pickResponder(chatId, result) {
    const d = CHATS[chatId];
    if (!d) return null;
    const alive = (id) => !this.ctx?.rel.get(id).missing && !(id === 'zinaida' && this.gs.flag('zina_missing'));
    if (d.type !== 'group') return alive(d.with) ? d.with : null;
    const members = d.members;
    const mentioned = result.mentions.find((m) => members.includes(m) && alive(m));
    if (mentioned) return mentioned;
    const route = GROUP_ROUTING[result.primary] || GROUP_ROUTING.unknown;
    const candidates = route.filter((id) => members.includes(id) && alive(id) && RESPONSES[id]);
    if (!candidates.length) return null;
    // Первым отвечает тот, кому ещё есть что сказать
    for (const id of candidates) {
      const pool = RESPONSES[id][result.primary] || [];
      const used = this.phone.usedResponses[`${id}:${result.primary}`] || 0;
      if (used < pool.length) return id;
    }
    return result.primary === 'unknown' && Math.random() < 0.5 ? null : candidates[0];
  }

  pickLine(charId, intent) {
    const table = RESPONSES[charId] || {};
    const pool = table[intent] || table.unknown || [];
    const key = `${charId}:${table[intent] ? intent : 'unknown'}`;
    const used = this.phone.usedResponses[key] || 0;
    let idx = used;
    let line = null;
    while (idx < pool.length) {
      const v = pool[idx];
      idx++;
      if (v === null) { line = null; break; }
      if (typeof v === 'string') { line = v; break; }
      if (!v.cond || this.safe(() => v.cond(this.ctx))) {
        if (v.do) this.safe(() => v.do(this.ctx));
        line = v.text;
        break;
      }
    }
    this.phone.usedResponses[key] = idx;
    if (idx > pool.length || (line === null && used >= pool.length)) {
      const rep = REPEAT_LINES[charId];
      if (rep && (this.phone.usedResponses[`${key}:rep`] || 0) < 1) {
        this.phone.usedResponses[`${key}:rep`] = 1;
        return rep[0];
      }
      return null;
    }
    return line;
  }

  // ------------------------------------------------------------ фото
  sendPhoto(chatId, photoId) {
    const photo = this.gallery?.get(photoId);
    if (!photo) return;
    const msg = this.sendPlayer(chatId, '', { photoId });
    if (!msg || msg.status === 'failed') return;
    this.bus.emit('photo:sent', { chat: chatId, photo });
    const d = CHATS[chatId];
    const tags = photo.tags || [];
    const idx = PHOTO_REACTIONS.findIndex((r) => (r.chat === chatId || (r.chat === '*' && d.type === 'dm')) && r.tags.every((tg) => tags.includes(tg)));
    if (idx < 0) return;
    const usedKey = `photo:${chatId}:${idx}`;
    if (this.phone.usedResponses[usedKey] && PHOTO_REACTIONS[idx].tags.length) return;
    this.phone.usedResponses[usedKey] = 1;
    this.phone.activeSequences.push({ uid: `p${this.seqCounter++}`, photoReaction: idx, chat: chatId, withFrom: d.with || 'denis', step: 0, phase: 'enter', timer: 2 });
  }

  // ------------------------------------------------------------ бытовые разговоры
  updateAmbient(dt) {
    this.ambientTimer -= dt;
    if (this.ambientTimer > 0) return;
    this.ambientTimer = 55 + Math.random() * 70;
    const busy = this.phone.activeSequences.some((r) => (r.inline ? false : (r.ambient || (SEQUENCES[r.seq] || [])[0]?.chat === GROUP)));
    if (busy) { this.ambientTimer = 20; return; }
    const next = AMBIENT.find((a) => !this.phone.ambientPlayed.includes(a.id) && (!a.cond || this.safe(() => a.cond(this.ctx))));
    if (!next) return;
    this.phone.ambientPlayed.push(next.id);
    this.phone.activeSequences.push({ uid: `a${this.seqCounter++}`, ambient: next.id, step: 0, phase: 'enter', timer: 0 });
  }
}

function defaultDelay(step) {
  if (step.from === 'player') return 0;
  return 1.2 + Math.random() * 2.2;
}

function typingTime(step) {
  if (!step.text) return step.photo ? 1.2 : step.voice ? 2.5 : 0.8;
  // Скорость набора зависит от персонажа: пожилые печатают медленно
  const slow = step.from === 'zinaida' ? 0.085 : step.from === 'gennady' ? 0.06 : 0.04;
  return Math.min(9, 0.8 + step.text.length * slow);
}

function parseAt(at) {
  // '17:52' — сегодня; '25.10 19:02' — другой день
  const m = at.match(/^(\d{2})\.(\d{2}) (\d{2}):(\d{2})$/);
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  if (m) {
    const day = Number(m[1]), mon = Number(m[2]);
    const dayDiff = 26 - day + (mon < 10 ? 30 : 0);
    return { label: `${day} ${months[mon - 1]}`, minutes: Number(m[3]) * 60 + Number(m[4]) - dayDiff * 1440 };
  }
  const [h, mm] = at.split(':').map(Number);
  return { label: '26 октября', minutes: h * 60 + mm };
}
