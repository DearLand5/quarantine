// Панель разговора: имя, реплика с эффектом печати, варианты ответа (касание или цифры 1–9).
import { el, clear } from '../utils/dom.js';

export class DialogueUI {
  constructor(root, bus, dialogue, settings) {
    this.root = root;
    this.bus = bus;
    this.dialogue = dialogue;
    this.settings = settings;
    this.panel = null;
    this.typing = null;
    this.current = null;
    this.unsubs = [
      bus.on('dialogue:line', (l) => this.show(l)),
      bus.on('dialogue:end', () => this.hide()),
      bus.on('input:press', (a) => this.onPress(a)),
    ];
  }

  get isOpen() { return !!this.panel; }

  ensurePanel() {
    if (this.panel) return;
    this.speakerName = el('span');
    this.moodEl = el('span', { class: 'mood' });
    this.lineEl = el('div', { class: 'line' });
    this.choicesEl = el('div', { class: 'choices' });
    this.hintEl = el('div', { class: 'tap-hint', text: 'Нажмите, чтобы продолжить' });
    this.panel = el('div', { class: 'dialogue' }, [
      el('div', { class: 'speaker' }, [this.speakerName, this.moodEl]),
      this.lineEl, this.choicesEl, this.hintEl,
    ]);
    this.panel.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (e.target.closest('.choice')) return;
      this.tapPanel();
    });
    this.root.appendChild(this.panel);
  }

  show(line) {
    this.ensurePanel();
    this.current = line;
    this.speakerName.textContent = line.name || '';
    this.moodEl.textContent = typeof line.mood === 'string' ? line.mood : '';
    clear(this.choicesEl);
    this.hintEl.classList.add('hidden');
    this.startTyping(line.text || '');
  }

  startTyping(text) {
    clearInterval(this.typing?.timer);
    const isStage = !this.current.name;
    this.lineEl.className = 'line';
    this.lineEl.textContent = '';
    const target = isStage ? el('span', { class: 'stage' }) : this.lineEl;
    if (isStage) this.lineEl.appendChild(target);
    let i = 0;
    const speed = 2;
    this.typing = {
      text, target,
      timer: setInterval(() => {
        i += speed;
        target.textContent = text.slice(0, i);
        if (i >= text.length) this.finishTyping();
      }, 22),
    };
  }

  finishTyping() {
    if (!this.typing) return;
    clearInterval(this.typing.timer);
    this.typing.target.textContent = this.typing.text;
    this.typing = null;
    this.renderChoices();
  }

  renderChoices() {
    const line = this.current;
    clear(this.choicesEl);
    if (!line) return;
    if (!line.choices?.length) {
      this.hintEl.textContent = line.end ? 'Нажмите, чтобы закончить разговор' : 'Нажмите, чтобы продолжить';
      this.hintEl.classList.remove('hidden');
      return;
    }
    this.hintEl.classList.add('hidden');
    line.choices.forEach((c, n) => {
      const btn = el('button', { class: `choice ${c.tag ? 'special' : ''} ${c.seen ? 'seen' : ''}` }, [
        el('span', { class: 'num', text: `${n + 1}.` }),
        el('span', { text: c.text }),
        c.tag ? el('span', { class: 'tag', text: c.tag }) : null,
      ]);
      btn.addEventListener('click', (e) => { e.stopPropagation(); this.pick(n); });
      this.choicesEl.appendChild(btn);
    });
  }

  pick(n) {
    const c = this.current?.choices?.[n];
    if (!c || this.typing) return;
    this.bus.emit('sound:play', { name: 'tap', bus: 'ui' });
    this.dialogue.choose(c.index);
  }

  tapPanel() {
    if (this.typing) { this.finishTyping(); return; }
    if (this.current && !this.current.choices?.length) this.dialogue.advance();
  }

  onPress(action) {
    if (!this.isOpen) return;
    if (action === 'interact' || action === 'confirm') this.tapPanel();
    else if (/^choice\d$/.test(action)) {
      if (this.typing) this.finishTyping();
      else this.pick(Number(action.slice(6)) - 1);
    }
  }

  hide() {
    clearInterval(this.typing?.timer);
    this.typing = null;
    this.current = null;
    this.panel?.remove();
    this.panel = null;
  }

  dispose() { this.hide(); this.unsubs.forEach((u) => u()); }
}
