// Уведомления: баннеры поверх мира и внутри телефона, звуки и вибрация, список на экране блокировки.
import { el } from '../utils/dom.js';
import { CHARACTERS, charName } from '../data/characters.js';
import { fmtTime } from '../utils/time.js';

export class NotificationManager {
  constructor(gameState, bus, chats) {
    this.gs = gameState;
    this.bus = bus;
    this.chats = chats;
    this.container = null;
    this.phoneOpen = false;
    this.viewingChat = null;
    this.lastSound = 0;
    this.bus.on('chat:message', (e) => this.onMessage(e));
    this.bus.on('chat:read', ({ chat }) => this.clearChat(chat));
  }

  get list() { return this.gs.data.phone.notifications; }

  attach(container) { this.container = container; }

  onMessage({ chat, msg, incoming }) {
    if (!incoming || msg.sys) return;
    if (this.gs.data.phone.battery <= 0) return;   // разряженный телефон молчит
    if (this.phoneOpen && this.viewingChat === chat) {
      this.sound('tap');
      return;
    }
    const isGroup = this.chats.def(chat)?.type === 'group';
    const text = msg.deleted ? 'Сообщение удалено' : msg.photoId ? '📷 Фотография' : msg.voice ? '🎤 Голосовое сообщение' : msg.text;
    const n = { id: msg.id, chat, from: msg.from, title: isGroup ? this.chats.title(chat) : charName(msg.from), sender: isGroup ? charName(msg.from) : null, text, time: msg.time };
    this.list.unshift(n);
    if (this.list.length > 30) this.list.length = 30;
    const now = performance.now();
    if (now - this.lastSound > 1200) {
      this.lastSound = now;
      this.sound(chat === 'mchs' ? 'notify_sys' : isGroup ? 'notify_group' : 'notify');
      this.bus.emit('sound:play', { name: 'vibrate', bus: 'ui', pulses: chat === 'mchs' ? 3 : 1, volume: 0.6 });
    }
    this.showBanner(n);
    this.bus.emit('notify:new', n);
  }

  sound(name) { this.bus.emit('sound:play', { name, bus: 'ui', volume: 0.8 }); }

  clearChat(chat) {
    const before = this.list.length;
    this.gs.data.phone.notifications = this.list.filter((n) => n.chat !== chat);
    if (before !== this.list.length) this.bus.emit('notify:cleared', { chat });
  }

  showBanner(n, { kind = 'msg', onTap } = {}) {
    if (!this.container) return;
    // Внутри открытого телефона баннер показывает сам телефон
    if (this.phoneOpen) { this.bus.emit('phone:inner-banner', n); return; }
    const color = CHARACTERS[n.from]?.color || '#888';
    const initials = CHARACTERS[n.from]?.initials || '•';
    const banner = el('div', { class: 'banner' }, [
      el('div', { class: 'ava', style: { background: color }, text: initials }),
      el('div', { class: 'body' }, [
        el('div', { class: 'top' }, [el('b', { text: n.title }), el('span', { text: fmtTime(n.time) })]),
        el('div', { class: 'text', text: n.sender ? `${n.sender}: ${n.text}` : n.text }),
      ]),
    ]);
    banner.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      onTap ? onTap() : this.bus.emit('phone:open', { chat: n.chat });
      dismiss();
    });
    const dismiss = () => { banner.classList.add('out'); setTimeout(() => banner.remove(), 300); };
    this.container.prepend(banner);
    while (this.container.children.length > 3) this.container.lastChild.remove();
    setTimeout(dismiss, kind === 'call' ? 12000 : 4800);
    return banner;
  }
}
