// Интерфейс мессенджера «Дворик»: список чатов, лента сообщений, варианты ответа, свободный ввод, вложения.
import { el, clear, ICONS } from '../utils/dom.js';
import { CHARACTERS, charName } from '../data/characters.js';
import { fmtTime } from '../utils/time.js';

export class Messenger {
  constructor(phone, chats, gallery, bus) {
    this.phone = phone;
    this.chats = chats;
    this.gallery = gallery;
    this.bus = bus;
    this.current = null;
    this.listEl = null;
    this.feedEl = null;
    this.attachOpen = false;
  }

  avatar(id, size = 'm') {
    if (id === 'house') return el('div', { class: `ava ${size}`, style: { background: '#c9a24a' }, text: '14' });
    const c = CHARACTERS[id];
    return el('div', { class: `ava ${size}`, style: { background: c?.color || '#777' }, text: c?.initials || '?' });
  }

  // ------------------------------------------------------------ список чатов
  renderList(container) {
    this.current = null;
    this.chats.viewing = null;
    const scroll = el('div', { class: 'ph-scroll' });
    container.append(
      el('div', { class: 'ph-head' }, [
        el('span', { class: 'back', text: '‹', onclick: () => this.phone.go('home') }),
        el('div', { class: 'title' }, [el('span', { class: 'msgr-brand', text: 'Дворик' }), el('span', { class: 'sub', text: this.chats.signal > 0 ? 'в сети' : 'ожидание сети…' })]),
      ]),
      scroll,
    );
    this.listEl = scroll;
    this.fillList();
  }

  fillList() {
    if (!this.listEl) return;
    clear(this.listEl);
    for (const id of this.chats.phone.chatOrder) {
      const c = this.chats.chat(id);
      if (!c || !c.visible) continue;
      const def = this.chats.def(id);
      const last = [...c.messages].reverse().find((m) => !m.sys) || c.messages[c.messages.length - 1];
      let preview = '';
      if (last) {
        const who = def.type === 'group' && last.from !== 'system' ? `${last.from === 'player' ? 'Вы' : (CHARACTERS[last.from]?.short || '')}: ` : (last.from === 'player' ? 'Вы: ' : '');
        preview = who + (last.deleted ? 'Сообщение удалено' : last.photoId ? '📷 Фото' : last.voice ? '🎤 Голосовое' : last.text);
      }
      const typing = c.typing ? `${def.type === 'group' ? (CHARACTERS[c.typing.from]?.short || '') + ' ' : ''}печатает…` : null;
      const needs = this.chats.choicesFor(id).length > 0;
      const avatarId = def.type === 'group' ? 'house' : def.with;
      const row = el('div', { class: 'chat-row', onclick: () => this.phone.go('chat', { chat: id }) }, [
        this.avatar(avatarId),
        el('div', { class: 'mid' }, [
          el('div', { class: 'name' }, [el('span', { text: this.chats.title(id) }), el('span', { class: 'tm', text: last ? fmtTime(last.time) : '' })]),
          el('div', { class: `last ${typing ? 'typing' : ''}` }, [
            el('span', { class: 'txt', text: typing || preview }),
            needs ? el('span', { class: 'needs', text: '● ждут ответа' }) : null,
          ]),
        ]),
        c.unread ? el('div', { class: 'unread', text: String(c.unread) }) : null,
      ]);
      this.listEl.appendChild(row);
    }
  }

  // ------------------------------------------------------------ лента чата
  renderChat(container, chatId) {
    this.current = chatId;
    this.chats.viewing = chatId;
    const c = this.chats.chat(chatId);
    const def = this.chats.def(chatId);
    const firstUnreadIdx = c.unread ? c.messages.length - c.unread : -1;
    this.chats.markRead(chatId);

    const sub = el('span', { class: 'sub' });
    this.subEl = sub;
    const head = el('div', { class: 'ph-head' }, [
      el('span', { class: 'back', text: '‹', onclick: () => this.phone.go('messenger') }),
      this.avatar(def.type === 'group' ? 'house' : def.with, 's'),
      el('div', { class: 'title' }, [el('span', { text: this.chats.title(chatId) }), sub]),
    ]);
    const scroll = el('div', { class: 'ph-scroll chat-view' });
    const feed = el('div', { class: 'msgs' });
    scroll.appendChild(feed);
    this.feedEl = feed;
    this.scrollEl = scroll;
    this.composer = el('div', { class: 'composer' });
    container.append(head, scroll, this.composer);
    this.fillFeed(firstUnreadIdx);
    this.fillComposer();
    this.updateSub();
    requestAnimationFrame(() => { scroll.scrollTop = scroll.scrollHeight; });
  }

  updateSub() {
    if (!this.subEl || !this.current) return;
    const c = this.chats.chat(this.current);
    const def = this.chats.def(this.current);
    if (c.typing) {
      this.subEl.className = 'sub typing';
      this.subEl.textContent = def.type === 'group' ? `${CHARACTERS[c.typing.from]?.short || ''} печатает…` : 'печатает…';
    } else {
      this.subEl.className = 'sub';
      if (def.type === 'group') this.subEl.textContent = `${def.members.length + 1} участников`;
      else if (def.outside) this.subEl.textContent = this.current === 'lyosha' && this.chats.gs.flag('lyosha_lost') ? 'был(а) недавно' : (this.chats.signal > 0 ? 'в сети' : 'ожидание сети…');
      else if (def.with === 'vetrov') this.subEl.textContent = 'был(а) в сети 14.03.2021';
      else if (def.with === 'zinaida' && this.chats.gs.flag('zina_missing')) this.subEl.textContent = 'была давно';
      else this.subEl.textContent = def.type === 'sms' ? 'SMS' : 'в сети';
    }
  }

  fillFeed(firstUnreadIdx = -1) {
    const feed = this.feedEl;
    if (!feed) return;
    const c = this.chats.chat(this.current);
    const def = this.chats.def(this.current);
    clear(feed);
    let lastDay = null;
    let prev = null;
    c.messages.forEach((m, i) => {
      if (m.day !== lastDay) { feed.appendChild(el('div', { class: 'day-sep', text: m.day })); lastDay = m.day; prev = null; }
      if (i === firstUnreadIdx) feed.appendChild(el('div', { class: 'unread-sep', text: 'Непрочитанные сообщения' }));
      if (m.sys) { feed.appendChild(el('div', { class: 'sys-msg', text: m.text })); prev = null; return; }
      feed.appendChild(this.bubble(m, def, prev));
      prev = m;
    });
    if (c.typing) {
      feed.appendChild(el('div', { class: 'typing-bubble' }, [
        def.type === 'group' ? el('span', { class: 'who', text: CHARACTERS[c.typing.from]?.short || '' }) : null,
        el('i'), el('i'), el('i'),
      ]));
    }
  }

  bubble(m, def, prev) {
    const out = m.from === 'player';
    const cont = prev && prev.from === m.from && m.time - prev.time < 3;
    const isGroup = def.type === 'group';
    const wrap = el('div', { class: `bubble-wrap ${out ? 'out' : ''} ${cont ? 'cont' : ''}`, dataset: { id: m.id } });
    if (!out && isGroup) wrap.appendChild(this.avatar(m.from, 's'));
    const b = el('div', { class: `bubble ${m.deleted ? 'deleted' : ''}` });
    if (!out && isGroup && !cont) b.appendChild(el('div', { class: 'from', style: { color: CHARACTERS[m.from]?.color || '#ccc' }, text: charName(m.from) }));
    if (m.replyTo) {
      const orig = this.chats.findMessage(m.chat, m.replyTo);
      if (orig) {
        b.appendChild(el('div', { class: 'reply', onclick: () => this.jumpTo(orig.id) }, [
          el('b', { text: charName(orig.from) }),
          el('span', { text: orig.deleted ? 'Сообщение удалено' : orig.photoId ? '📷 Фото' : orig.text }),
        ]));
      }
    }
    if (m.deleted) {
      b.appendChild(document.createTextNode('🚫 Сообщение удалено'));
    } else {
      if (m.photoId) {
        const src = this.gallery.src(m.photoId);
        const img = el('img', { class: 'photo', src: src || '', alt: 'фото' });
        if (!src) {
          const off = this.bus.on('gallery:ready', ({ id }) => { if (id === m.photoId) { img.src = this.gallery.src(id); off(); } });
        }
        img.addEventListener('click', () => this.phone.openViewer(m.photoId));
        b.appendChild(img);
      }
      if (m.voice) b.appendChild(this.voiceEl(m));
      if (m.text) b.appendChild(document.createTextNode(m.text));
    }
    const status = out ? el('span', { class: `st ${m.status}`, text: { sent: '✓', read: '✓✓', pending: '🕓', failed: '!' }[m.status] || '' }) : null;
    b.appendChild(el('span', { class: 'meta' }, [m.edited ? el('span', { class: 'edited', text: 'изм.' }) : null, fmtTime(m.time), status]));
    wrap.appendChild(b);
    return wrap;
  }

  voiceEl(m) {
    const bars = [];
    for (let i = 0; i < 26; i++) bars.push(el('i', { style: { height: `${20 + Math.abs(Math.sin(i * 1.7 + m.id.length)) * 80}%` } }));
    const tr = el('div', { class: 'voice-tr hidden', text: `«${m.voice.transcript}»` });
    const node = el('div', {}, [
      el('div', { class: 'voice', onclick: () => {
        tr.classList.remove('hidden');
        const pitch = CHARACTERS[m.from]?.voice?.pitch || 180;
        this.bus.emit('sound:play', { name: 'babble', bus: 'voice', duration: m.voice.duration, pitch, volume: 0.7 });
        this.bus.emit('subtitle', { who: charName(m.from), text: m.voice.transcript, duration: m.voice.duration });
      } }, [el('div', { class: 'play', text: '▶' }), el('div', { class: 'wave' }, bars), el('span', { text: `0:${String(Math.round(m.voice.duration)).padStart(2, '0')}` })]),
      tr,
    ]);
    return node;
  }

  jumpTo(id) {
    const node = this.feedEl?.querySelector(`[data-id="${id}"] .bubble`);
    if (!node) return;
    node.scrollIntoView({ block: 'center', behavior: 'smooth' });
    node.classList.remove('flash'); void node.offsetWidth; node.classList.add('flash');
  }

  // ------------------------------------------------------------ поле ввода
  fillComposer() {
    const comp = this.composer;
    if (!comp) return;
    clear(comp);
    const chatId = this.current;
    const def = this.chats.def(chatId);
    if (def.readonly) {
      comp.appendChild(el('div', { class: 'note', text: 'Отвечать на этот номер нельзя.' }));
      return;
    }
    const choices = this.chats.choicesFor(chatId);
    if (choices.length) {
      const chips = el('div', { class: 'chips' }, [el('div', { class: 'hint', text: 'Ответить:' })]);
      for (const ch of choices) {
        chips.appendChild(el('button', { class: 'chip', text: ch.opt.text, onclick: () => { this.chats.choose(chatId, ch.pending.id, ch.opt.id); this.refresh(); } }));
      }
      comp.appendChild(chips);
    }
    if (this.attachOpen) {
      const pick = el('div', { class: 'attach-pick' });
      const photos = this.gallery.list();
      if (!photos.length) pick.appendChild(el('div', { class: 'none', text: 'В галерее пока нет снимков. Сфотографируйте что-нибудь камерой телефона.' }));
      for (const p of photos) {
        const src = this.gallery.src(p.id);
        if (!src) continue;
        pick.appendChild(el('img', { src, alt: p.caption || 'фото', onclick: () => { this.attachOpen = false; this.chats.sendPhoto(chatId, p.id); this.refresh(); } }));
      }
      comp.appendChild(pick);
    }
    const input = el('input', { type: 'text', placeholder: 'Сообщение…', maxlength: '300', enterkeyhint: 'send', autocomplete: 'off' });
    const send = () => {
      const v = input.value.trim();
      if (!v) return;
      input.value = '';
      this.chats.sendFree(chatId, v);
      this.refresh();
    };
    input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') send(); });
    input.addEventListener('focus', () => this.bus.emit('phone:typing-focus', true));
    input.addEventListener('blur', () => this.bus.emit('phone:typing-focus', false));
    comp.appendChild(el('div', { class: 'row' }, [
      el('div', { class: 'ibtn', html: ICONS.clip, title: 'Фото из галереи', onclick: () => { this.attachOpen = !this.attachOpen; this.fillComposer(); } }),
      input,
      el('div', { class: 'ibtn send', html: ICONS.send, onclick: send }),
    ]));
    comp.appendChild(el('div', { class: 'note', text: 'Свободный ввод: персонажи распознают тему сообщения (без ИИ — по ключевым словам).' }));
  }

  refresh({ keepComposer = false } = {}) {
    if (this.current) {
      const sc = this.scrollEl;
      const nearBottom = sc ? sc.scrollHeight - sc.scrollTop - sc.clientHeight < 120 : true;
      this.chats.markRead(this.current);
      this.fillFeed();
      if (!keepComposer) {
        const focused = document.activeElement && this.composer?.contains(document.activeElement);
        if (!focused) this.fillComposer();
      }
      this.updateSub();
      if (sc && nearBottom) requestAnimationFrame(() => { sc.scrollTop = sc.scrollHeight; });
    } else if (this.listEl) {
      this.fillList();
    }
  }
}
