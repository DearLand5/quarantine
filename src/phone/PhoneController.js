// Оболочка смартфона: открытие/закрытие, экран блокировки, домашний экран, приложения, статус-бар,
// заряд батареи, уровень сигнала, звонки и внутренние уведомления.
import { el, clear, ICONS } from '../utils/dom.js';
import { fmtTime, fmtDay, fmtWeekday } from '../utils/time.js';
import { CHARACTERS, charName } from '../data/characters.js';
import { CLUES } from '../data/items.js';
import { Messenger } from './Messenger.js';

const APPS = [
  { id: 'messenger', name: 'Дворик', icon: 'chat', color: '#b8892f' },
  { id: 'contacts', name: 'Контакты', icon: 'user', color: '#4f6f63' },
  { id: 'calls', name: 'Звонки', icon: 'call', color: '#3e7a52' },
  { id: 'gallery', name: 'Галерея', icon: 'image', color: '#5a5f86' },
  { id: 'camera', name: 'Камера', icon: 'camera', color: '#3b3f3e' },
  { id: 'notes', name: 'Заметки', icon: 'note', color: '#9a7b3a' },
  { id: 'settings', name: 'Настройки', icon: 'gear', color: '#555b59' },
];

export class PhoneController {
  constructor(root, deps) {
    Object.assign(this, deps);   // gs, bus, chats, contacts, gallery, notifications, quests, settings
    this.isOpen = false;
    this.route = { app: 'home', params: {} };
    this.closedAt = -1e9;
    this.lastMinute = -1;
    this.messenger = new Messenger(this, this.chats, this.gallery, this.bus);
    this.build(root);
    this.bindEvents();
  }

  get battery() { return this.gs.data.phone.battery; }

  build(root) {
    this.layer = el('div', { class: 'phone-layer' });
    this.scrim = el('div', { class: 'scrim' });
    this.statusEl = el('div', { class: 'ph-status' });
    this.body = el('div', { class: 'ph-body' });
    this.nav = el('div', { class: 'ph-nav' }, [el('div', { class: 'homebar', title: 'Домой', onclick: () => this.homeButton() })]);
    this.screen = el('div', { class: 'screen' }, [this.statusEl, this.body, this.nav]);
    this.device = el('div', { class: 'phone' }, [this.screen]);
    this.layer.append(this.scrim, this.device);
    // Тап мимо телефона закрывает его
    this.layer.addEventListener('pointerdown', (e) => { if (e.target === this.layer || e.target === this.scrim) this.close(); });
    root.appendChild(this.layer);
    this.renderStatus();
  }

  bindEvents() {
    const b = this.bus;
    b.on('chat:message', ({ chat }) => this.onChatEvent(chat));
    b.on('chat:changed', ({ chat }) => this.onChatEvent(chat));
    b.on('chat:typing', ({ chat }) => this.onChatEvent(chat, true));
    b.on('chat:choice', ({ chat }) => this.onChatEvent(chat));
    b.on('chat:updated', () => this.onChatEvent(null));
    b.on('phone:inner-banner', (n) => this.innerBanner(n));
    b.on('phone:glitch', () => this.glitch());
    b.on('call:ringing', () => { if (this.isOpen) this.go('call'); });
    b.on('call:accepted', () => { if (!this.isOpen) this.open({ app: 'call' }); else this.go('call'); });
    b.on('call:line', () => { if (this.route.app === 'call') this.renderApp(); });
    b.on('call:dialing', ({ contact }) => { this.dialing = contact; this.callEnd = null; this.go('call'); });
    b.on('call:ended', ({ text, status }) => {
      this.dialing = null;
      this.callEnd = text || (status === 'missed' ? 'Пропущенный вызов' : status === 'declined' ? 'Вызов отклонён' : 'Вызов завершён');
      if (this.route.app === 'call') this.renderApp();
      setTimeout(() => { if (this.route.app === 'call' && !this.contacts.active) { this.callEnd = null; this.go('calls'); } }, 2200);
    });
  }

  onChatEvent(chat, typingOnly = false) {
    if (!this.isOpen) return;
    const app = this.route.app;
    if (app === 'messenger') this.messenger.fillList();
    else if (app === 'chat' && (chat === null || chat === this.route.params.chat)) this.messenger.refresh({ keepComposer: typingOnly });
    else if (app === 'home' || app === 'lock') this.renderApp();
  }

  // ------------------------------------------------------------ открытие / закрытие
  open(opts = {}) {
    if (this.isOpen && !opts.chat && !opts.app) return;
    const wasOpen = this.isOpen;
    this.isOpen = true;
    this.layer.classList.add('open');
    this.notifications.phoneOpen = true;
    const lockedLong = performance.now() - this.closedAt > 25000;
    if (opts.chat) this.route = { app: 'chat', params: { chat: opts.chat } };
    else if (opts.app) this.route = { app: opts.app, params: opts.params || {} };
    else if (lockedLong && !this.contacts.active) this.route = { app: 'lock', params: {} };
    if (this.contacts.active) this.route = { app: 'call', params: {} };
    this.renderApp();
    this.renderStatus();
    if (!wasOpen) {
      this.bus.emit('phone:opened');
      this.bus.emit('sound:play', { name: 'tap', bus: 'ui' });
    }
  }

  close() {
    if (!this.isOpen) return;
    if (document.activeElement && this.layer.contains(document.activeElement)) document.activeElement.blur();
    this.isOpen = false;
    this.layer.classList.remove('open');
    this.notifications.phoneOpen = false;
    this.notifications.viewingChat = null;
    this.chats.viewing = null;
    this.closedAt = performance.now();
    this.bus.emit('phone:closed');
  }

  toggle() { this.isOpen ? this.close() : this.open(); }

  homeButton() {
    if (this.route.app === 'home') this.close();
    else this.go('home');
  }

  go(app, params = {}) {
    this.route = { app, params };
    this.renderApp();
    this.bus.emit('sound:play', { name: 'tap', bus: 'ui', volume: 0.5 });
  }

  renderApp() {
    clear(this.body);
    const { app, params } = this.route;
    this.notifications.viewingChat = app === 'chat' ? params.chat : null;
    if (app !== 'chat') this.chats.viewing = null;
    if (this.battery <= 0) { this.body.appendChild(el('div', { class: 'ph-dead' }, [el('div', { class: 'b' }), el('div', { text: 'Телефон разряжен' }), el('div', { style: { fontSize: '.8em' }, text: 'Поставьте на зарядку (стол в комнате)' })])); return; }
    const wrap = el('div', { class: `ph-app ph-${app}` });
    this.body.appendChild(wrap);
    switch (app) {
      case 'lock': this.renderLock(wrap); break;
      case 'home': this.renderHome(wrap); break;
      case 'messenger': this.messenger.renderList(wrap); break;
      case 'chat': this.messenger.renderChat(wrap, params.chat); break;
      case 'contacts': this.renderContacts(wrap); break;
      case 'contact': this.renderContact(wrap, params.id); break;
      case 'calls': this.renderCalls(wrap); break;
      case 'call': this.renderCall(wrap); break;
      case 'gallery': this.renderGallery(wrap); break;
      case 'notes': this.renderNotes(wrap); break;
      default: this.renderHome(wrap);
    }
  }

  // ------------------------------------------------------------ статус-бар
  renderStatus() {
    const sig = this.chats.signal;
    const bat = Math.max(0, Math.round(this.battery));
    const charging = this.gs.data.phone.charging;
    clear(this.statusEl);
    this.statusEl.append(
      el('span', { text: fmtTime(this.gs.time) }),
      el('div', { class: 'notch' }),
      el('div', { class: 'right' }, [
        el('div', { class: 'sig' }, [0, 1, 2, 3].map((i) => el('i', { class: i < sig + 1 && sig > 0 ? 'on' : '' }))),
        el('span', { class: 'net', text: sig <= 0 ? 'Нет сети' : sig === 1 ? 'E' : 'LTE' }),
        el('div', { class: `bat ${bat <= 15 ? 'low' : ''} ${charging ? 'charging' : ''}` }, [
          el('span', { text: `${bat}%${charging ? '⚡' : ''}` }),
          el('div', { class: 'cell' }, [el('i', { style: { width: `${bat}%` } })]),
        ]),
      ]),
    );
  }

  // ------------------------------------------------------------ экраны
  renderLock(wrap) {
    wrap.classList.add('ph-lock');
    const notifs = el('div', { class: 'notifs' });
    for (const n of this.notifications.list.slice(0, 8)) {
      notifs.appendChild(el('div', { class: 'notif', onclick: () => this.go('chat', { chat: n.chat }) }, [
        el('div', { class: 't' }, [el('b', { text: n.title }), el('span', { text: fmtTime(n.time) })]),
        el('div', { text: n.sender ? `${n.sender}: ${n.text}` : n.text }),
      ]));
    }
    wrap.append(
      el('div', { class: 'date', text: `${fmtWeekday(this.gs.time)}, ${fmtDay(this.gs.time)}` }),
      el('div', { class: 'clock', text: fmtTime(this.gs.time) }),
      notifs,
      el('div', { class: 'unlock', text: 'Нажмите, чтобы разблокировать', onclick: () => this.go('home') }),
    );
  }

  renderHome(wrap) {
    wrap.classList.add('ph-home');
    const missed = this.contacts.log.filter((c) => c.status === 'missed' && !c.seen).length;
    const icon = (a) => {
      const badge = a.id === 'messenger' ? this.chats.totalUnread() : a.id === 'calls' ? missed : a.id === 'notes' ? (this.quests.unseen || 0) : 0;
      return el('div', { class: 'ph-icon', onclick: () => this.launch(a.id) }, [
        el('div', { class: 'ic', style: { background: a.color }, html: ICONS[a.icon] }),
        el('span', { text: a.name }),
        badge ? el('div', { class: 'bdg', text: String(badge) }) : null,
      ]);
    };
    wrap.append(
      el('div', { class: 'widget' }, [
        el('div', { class: 'w-time', text: fmtTime(this.gs.time) }),
        el('div', { class: 'w-sub', text: `${fmtWeekday(this.gs.time)}, ${fmtDay(this.gs.time)} · ул. Тополиная, 14` }),
        el('div', { class: 'w-alert', text: '⚠ Режим ЧС. Не покидайте помещения.' }),
      ]),
      el('div', { class: 'grid' }, APPS.map(icon)),
      el('div', { class: 'dock' }, ['messenger', 'calls', 'camera', 'gallery'].map((id) => icon(APPS.find((a) => a.id === id)))),
    );
  }

  launch(id) {
    if (id === 'camera') { this.close(); this.bus.emit('camera:open'); return; }
    if (id === 'settings') { this.close(); this.bus.emit('menu:settings'); return; }
    if (id === 'calls') for (const c of this.contacts.log) c.seen = true;
    if (id === 'notes') this.quests.unseen = 0;
    this.go(id);
  }

  head(title, back = 'home') {
    return el('div', { class: 'ph-head' }, [
      el('span', { class: 'back', text: '‹', onclick: () => this.go(back) }),
      el('div', { class: 'title', text: title }),
    ]);
  }

  avatar(id, size) { return this.messenger.avatar(id, size); }

  renderContacts(wrap) {
    const list = el('div', { class: 'ph-scroll' });
    const ids = this.contacts.contacts();
    const groups = [['Личное', ids.filter((i) => ['mom', 'lyosha', 'irina'].includes(i))], ['Соседи', ids.filter((i) => !['mom', 'lyosha', 'irina', 'unknown'].includes(i))], ['Неизвестные', ids.filter((i) => i === 'unknown')]];
    for (const [title, arr] of groups) {
      if (!arr.length) continue;
      list.appendChild(el('div', { class: 'list-sec', text: title }));
      for (const id of arr) {
        list.appendChild(el('div', { class: 'c-row', onclick: () => this.go('contact', { id }) }, [
          this.avatar(id, 's'),
          el('div', { class: 'mid' }, [el('div', { class: 'nm', text: CHARACTERS[id]?.name || id }), el('div', { class: 'ds', text: CHARACTERS[id]?.apartment ? `кв. ${CHARACTERS[id].apartment}` : '' })]),
        ]));
      }
    }
    wrap.append(this.head('Контакты'), list);
  }

  renderContact(wrap, id) {
    const c = CHARACTERS[id] || {};
    const chatId = Object.keys(this.chats.phone.chats).find((k) => this.chats.def(k)?.with === id);
    wrap.append(this.head(' ', 'contacts'), el('div', { class: 'ph-scroll' }, [el('div', { class: 'contact-card' }, [
      this.avatar(id, 'l'),
      el('div', { class: 'nm', text: c.name || id }),
      el('div', { class: 'ds', text: c.bio || '' }),
      el('div', { class: 'acts' }, [
        chatId ? el('button', { text: '💬 Написать', onclick: () => this.go('chat', { chat: chatId }) }) : null,
        el('button', { text: '📞 Позвонить', onclick: () => this.contacts.dial(id) }),
      ]),
    ])]));
  }

  renderCalls(wrap) {
    const list = el('div', { class: 'ph-scroll' });
    if (!this.contacts.log.length) list.appendChild(el('div', { class: 'gal-empty', text: 'Журнал звонков пуст' }));
    for (const c of this.contacts.log) {
      const label = { missed: 'Пропущенный', declined: 'Отклонён', answered: c.dir === 'in' ? 'Входящий' : 'Исходящий', failed: 'Не удалось', none: 'Нет ответа' }[c.status] || '';
      list.appendChild(el('div', { class: 'c-row', onclick: () => this.contacts.dial(c.contact) }, [
        this.avatar(c.contact, 's'),
        el('div', { class: 'mid' }, [el('div', { class: `nm ${c.status === 'missed' ? 'missed' : ''}`, text: CHARACTERS[c.contact]?.name || c.contact }), el('div', { class: 'ds', text: `${c.dir === 'in' ? '↙' : '↗'} ${label}${c.duration ? ` · ${c.duration} с` : ''}` })]),
        el('span', { class: 'ac', text: fmtTime(c.time) }),
      ]));
    }
    wrap.append(this.head('Звонки'), list);
  }

  renderCall(wrap) {
    wrap.classList.add('call-screen');
    const a = this.contacts.active;
    const who = a ? a.def.from : this.dialing;
    if (!who && !this.callEnd) { this.route = { app: 'home', params: {} }; this.renderHome(wrap); return; }
    let status = '';
    const btns = el('div', { class: 'btns' });
    const lines = el('div', { class: 'lines' });
    if (a && a.state === 'ringing') {
      status = 'Входящий вызов…';
      btns.append(
        el('button', { class: 'cb dec', html: ICONS.hang, onclick: () => this.contacts.decline(false) }),
        el('button', { class: 'cb acc', html: ICONS.call, onclick: () => this.contacts.accept() }),
      );
    } else if (a) {
      status = 'Идёт разговор';
      const shown = a.def.lines.slice(0, a.line + 1);
      for (const l of shown.slice(-3)) lines.appendChild(el('div', { text: `${l.who === 'you' ? 'Вы' : charName(a.def.from)}: ${l.text}` }));
      btns.append(el('button', { class: 'cb dec', html: ICONS.hang, onclick: () => this.contacts.hangup() }));
    } else if (this.dialing) {
      status = 'Вызов…';
    } else {
      status = this.callEnd || 'Вызов завершён';
    }
    wrap.append(this.avatar(who || 'unknown', 'l'), el('div', { class: 'nm', text: CHARACTERS[who]?.name || '' }), el('div', { class: 'st', text: status }), lines, btns);
  }

  renderGallery(wrap) {
    const scroll = el('div', { class: 'ph-scroll' });
    const photos = this.gallery.list();
    if (!photos.length) scroll.appendChild(el('div', { class: 'gal-empty', text: 'Снимков нет. Откройте «Камеру», чтобы сфотографировать то, что видите.' }));
    const grid = el('div', { class: 'gal-grid' });
    for (const p of photos) {
      const src = this.gallery.src(p.id);
      const img = el('img', { src: src || '', alt: p.caption || '', onclick: () => this.openViewer(p.id) });
      grid.appendChild(img);
    }
    scroll.appendChild(grid);
    wrap.append(this.head('Галерея'), scroll);
  }

  openViewer(id) {
    this.gallery.openViewer(this.screen, id, {
      onSend: (pid) => this.pickChatForPhoto(pid),
    });
  }

  pickChatForPhoto(photoId) {
    const box = el('div', { class: 'viewer' });
    const list = el('div', { class: 'ph-scroll' });
    box.append(el('div', { class: 'v-bar' }, [el('button', { text: '‹ Отмена', onclick: () => box.remove() }), el('span', { class: 'cap', text: 'Отправить в чат' }), el('span')]), list);
    for (const id of this.chats.phone.chatOrder) {
      const c = this.chats.chat(id); const d = this.chats.def(id);
      if (!c.visible || d.readonly) continue;
      list.appendChild(el('div', { class: 'chat-row', onclick: () => { box.remove(); this.chats.sendPhoto(id, photoId); this.go('chat', { chat: id }); } }, [
        this.avatar(d.type === 'group' ? 'house' : d.with, 's'), el('div', { class: 'mid' }, [el('div', { class: 'name', text: this.chats.title(id) })]),
      ]));
    }
    this.screen.appendChild(box);
  }

  renderNotes(wrap) {
    const scroll = el('div', { class: 'ph-scroll notes' });
    scroll.appendChild(el('div', { class: 'list-sec', text: 'Дела' }));
    const qs = this.quests.visible();
    if (!qs.length) scroll.appendChild(el('div', { class: 'gal-empty', text: 'Пока ничего' }));
    for (const q of qs) {
      scroll.appendChild(el('div', { class: `note-q ${q.done ? 'done' : ''}` }, [
        el('h4', { text: q.title }),
        ...q.objectives.map((o) => el('div', { class: `obj ${o.done ? 'done' : ''}`, text: o.text })),
      ]));
    }
    scroll.appendChild(el('div', { class: 'list-sec', text: 'Странности' }));
    const clues = this.gs.data.story.clues;
    if (!clues.length) scroll.appendChild(el('div', { class: 'gal-empty', text: 'Пока ничего странного. Пока.' }));
    for (const id of clues) {
      const c = CLUES[id];
      if (c) scroll.appendChild(el('div', { class: 'note-clue' }, [el('b', { text: c.title }), document.createTextNode(` — ${c.text}`)]));
    }
    wrap.append(this.head('Заметки'), scroll);
  }

  // ------------------------------------------------------------ эффекты
  innerBanner(n) {
    if (this.route.app === 'chat' && this.route.params.chat === n.chat) return;
    const b = el('div', { class: 'banner', style: { position: 'absolute', left: '4%', right: '4%', top: '2.6em', zIndex: 8 } }, [
      el('div', { class: 'ava', style: { background: CHARACTERS[n.from]?.color || '#888' }, text: CHARACTERS[n.from]?.initials || '•' }),
      el('div', { class: 'body' }, [el('div', { class: 'top' }, [el('b', { text: n.title })]), el('div', { class: 'text', text: n.sender ? `${n.sender}: ${n.text}` : n.text })]),
    ]);
    b.addEventListener('click', () => { b.remove(); this.go('chat', { chat: n.chat }); });
    this.screen.appendChild(b);
    setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 300); }, 3200);
    if (this.route.app === 'home' || this.route.app === 'messenger') this.renderApp();
  }

  glitch() {
    this.screen.classList.remove('glitch'); void this.screen.offsetWidth; this.screen.classList.add('glitch');
    this.bus.emit('sound:play', { name: 'glitch', bus: 'ui', volume: 0.7 });
  }

  // ------------------------------------------------------------ обновление
  update(dt, ctx) {
    const p = this.gs.data.phone;
    const gameMinutes = dt * (this.gs.data.timeScale / 60);
    const powered = this.gs.data.world.power.apartment;
    if (p.charging && (!powered || !ctx.chargeOk)) p.charging = false;
    if (p.charging) p.battery = Math.min(100, p.battery + gameMinutes / 0.6);
    else p.battery = Math.max(0, p.battery - gameMinutes * (1 / 7 + (this.isOpen ? 1 / 4 : 0)));
    if (p.battery <= 20 && !this.gs.flag('bat20')) { this.gs.setFlag('bat20'); this.bus.emit('hud:toast', { text: 'Телефон: осталось 20% заряда' }); }
    if (p.battery <= 0 && !this.gs.flag('bat0')) { this.gs.setFlag('bat0'); this.bus.emit('hud:toast', { text: 'Телефон разрядился', error: true }); if (this.isOpen) this.renderApp(); }
    if (p.battery > 3 && this.gs.flag('bat0')) { this.gs.setFlag('bat0', false); if (this.isOpen) this.renderApp(); }
    const minute = Math.floor(this.gs.time);
    if (minute !== this.lastMinute) {
      this.lastMinute = minute;
      if (this.isOpen) {
        this.renderStatus();
        if (this.route.app === 'lock' || this.route.app === 'home') this.renderApp();
      }
    }
  }

  setSignal(v) {
    if (this.chats.signal === v) return;
    this.chats.signal = v;
    if (this.isOpen) { this.renderStatus(); if (this.route.app === 'chat') this.messenger.updateSub(); }
  }
}
