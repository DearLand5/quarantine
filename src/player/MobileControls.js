// Сенсорное управление: плавающий джойстик слева, зона обзора справа, кнопки действий.
// Используются Pointer Events с отслеживанием pointerId — работает мультитач (идти, смотреть и нажимать одновременно).
// Раскладку кнопок можно перетаскивать в режиме редактирования; позиции хранятся в настройках.
import { el, ICONS } from '../utils/dom.js';
import { DEFAULT_LAYOUT } from '../systems/SettingsManager.js';

const BUTTONS = [
  { id: 'interact', icon: 'hand', label: 'Действие', cls: 'big' },
  { id: 'run', icon: 'run', label: 'Бег' },
  { id: 'crouch', icon: 'crouch', label: 'Присесть' },
  { id: 'flashlight', icon: 'flash', label: 'Фонарь' },
  { id: 'phone', icon: 'phone', label: 'Телефон' },
  { id: 'bag', icon: 'bag', label: '', cls: 'small' },
  { id: 'pause', icon: 'pause', label: '', cls: 'small' },
];

export class MobileControls {
  constructor(root, input, bus, settings) {
    this.input = input;
    this.bus = bus;
    this.settings = settings;
    this.movePointer = null;
    this.lookPointer = null;
    this.origin = { x: 0, y: 0 };
    this.lookLast = { x: 0, y: 0 };
    this.editing = false;
    this.buttons = {};
    this.unsubs = [];

    this.el = el('div', { class: 'controls' });
    this.moveZone = el('div', { class: 'move-zone' });
    this.lookZone = el('div', { class: 'look-zone' });
    this.joy = el('div', { class: 'joystick' }, [el('div', { class: 'knob' })]);
    this.knob = this.joy.firstChild;
    this.el.append(this.moveZone, this.lookZone, this.joy);
    for (const b of BUTTONS) {
      const btn = el('div', { class: `cbtn ${b.cls || ''}`, dataset: { id: b.id }, html: ICONS[b.icon] + (b.label ? `<span>${b.label}</span>` : '') + (b.id === 'phone' ? '<span class="badge"></span>' : '') });
      this.buttons[b.id] = btn;
      this.el.appendChild(btn);
      this.bindButton(btn, b.id);
    }
    this.badge = this.buttons.phone.querySelector('.badge');
    root.appendChild(this.el);

    this.bindZones();
    this.applySettings();
    this.unsubs.push(bus.on('settings:changed', () => this.applySettings()));
    this.resetJoystick();
  }

  applySettings() {
    const s = this.settings.values;
    this.el.style.setProperty('--btn-scale', s.btnScale);
    this.el.classList.toggle('left-handed', !!s.leftHanded);
    const layout = { ...DEFAULT_LAYOUT, ...(s.layout || {}) };
    for (const [id, btn] of Object.entries(this.buttons)) {
      let { x, y } = layout[id] || { x: 50, y: 50 };
      if (s.leftHanded && id !== 'bag' && id !== 'pause') x = 100 - x;
      btn.style.left = `${x}%`;
      btn.style.top = `${y}%`;
    }
  }

  bindButton(btn, id) {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (this.editing) { this.startDrag(btn, id, e); return; }
      btn.setPointerCapture?.(e.pointerId);
      btn.classList.add('pressed');
      if (id === 'run') {
        if (this.settings.get('runToggle')) {
          this.input.runToggled = !this.input.runToggled;
          btn.classList.toggle('toggled', this.input.runToggled);
        } else this.input.runHeld = true;
        return;
      }
      this.input.press(id);
    });
    const release = (e) => {
      btn.classList.remove('pressed');
      if (id === 'run' && !this.settings.get('runToggle')) this.input.runHeld = false;
    };
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
  }

  bindZones() {
    const mz = this.moveZone, lz = this.lookZone;
    mz.addEventListener('pointerdown', (e) => {
      if (this.movePointer !== null) return;
      e.preventDefault();
      this.movePointer = e.pointerId;
      mz.setPointerCapture?.(e.pointerId);
      this.origin = { x: e.clientX, y: e.clientY };
      this.joy.style.left = `${e.clientX}px`;
      this.joy.style.top = `${e.clientY}px`;
      this.joy.classList.add('active');
    });
    mz.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.movePointer) return;
      const radius = 50 * this.settings.get('btnScale');
      let dx = e.clientX - this.origin.x, dy = e.clientY - this.origin.y;
      const len = Math.hypot(dx, dy);
      if (len > radius) {
        // Джойстик «следует» за пальцем, если тот ушёл далеко
        const k = (len - radius) / len;
        this.origin.x += dx * k; this.origin.y += dy * k;
        this.joy.style.left = `${this.origin.x}px`; this.joy.style.top = `${this.origin.y}px`;
        dx = e.clientX - this.origin.x; dy = e.clientY - this.origin.y;
      }
      const nx = dx / radius, ny = dy / radius;
      const dead = 0.12;
      const mag = Math.hypot(nx, ny);
      const scale = mag < dead ? 0 : Math.min(1, (mag - dead) / (1 - dead)) / (mag || 1);
      this.input.moveX = nx * scale;
      this.input.moveY = -ny * scale;
      this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    const endMove = (e) => {
      if (e.pointerId !== this.movePointer) return;
      this.movePointer = null;
      this.input.moveX = 0; this.input.moveY = 0;
      this.resetJoystick();
    };
    mz.addEventListener('pointerup', endMove);
    mz.addEventListener('pointercancel', endMove);

    lz.addEventListener('pointerdown', (e) => {
      if (this.lookPointer !== null) return;
      e.preventDefault();
      this.lookPointer = e.pointerId;
      lz.setPointerCapture?.(e.pointerId);
      this.lookLast = { x: e.clientX, y: e.clientY, t: performance.now(), sx: e.clientX, sy: e.clientY };
    });
    lz.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.lookPointer) return;
      const dx = e.clientX - this.lookLast.x, dy = e.clientY - this.lookLast.y;
      this.lookLast.x = e.clientX; this.lookLast.y = e.clientY;
      // Сенсорный обзор чувствительнее мыши, масштабируем к ширине экрана
      const k = 1.6 * (1280 / Math.max(640, window.innerWidth));
      this.input.lookDX += dx * k;
      this.input.lookDY += dy * k;
    });
    const endLook = (e) => {
      if (e.pointerId !== this.lookPointer) return;
      // Короткое касание без движения в зоне обзора = взаимодействие (удобно одной рукой)
      const moved = Math.hypot(e.clientX - this.lookLast.sx, e.clientY - this.lookLast.sy);
      if (moved < 8 && performance.now() - this.lookLast.t < 220) this.bus.emit('input:tap-look');
      this.lookPointer = null;
    };
    lz.addEventListener('pointerup', endLook);
    lz.addEventListener('pointercancel', endLook);
  }

  resetJoystick() {
    // В покое джойстик показывается в стандартном месте как подсказка
    const left = this.settings.get('leftHanded');
    const x = left ? window.innerWidth - 110 : 110;
    this.joy.style.left = `${x}px`;
    this.joy.style.top = `${window.innerHeight - 110}px`;
    this.knob.style.transform = '';
    this.joy.classList.remove('active');
  }

  setBadge(n) { this.badge.textContent = n > 0 ? String(n > 99 ? '99+' : n) : ''; }
  setToggle(id, on) { this.buttons[id]?.classList.toggle('toggled', !!on); }
  setGlow(id, on) { this.buttons[id]?.classList.toggle('glow', !!on); }
  setDim(id, on) { this.buttons[id]?.classList.toggle('dim', !!on); }

  show(v) {
    this.el.classList.toggle('hidden', !v);
    if (!v) { this.movePointer = null; this.lookPointer = null; this.input.moveX = 0; this.input.moveY = 0; this.resetJoystick(); }
  }

  // ---------- Редактор раскладки ----------
  startEdit(onDone) {
    this.editing = true;
    this.el.classList.add('editing');
    this.el.classList.remove('hidden');
    this.editBar = el('div', { class: 'edit-bar' }, [
      el('span', { text: 'Перетащите кнопки' }),
      el('button', { text: 'Сброс', onclick: () => { this.settings.resetLayout(); } }),
      el('button', { class: 'primary', text: 'Готово', onclick: () => this.stopEdit(onDone) }),
    ]);
    this.el.appendChild(this.editBar);
  }

  stopEdit(onDone) {
    this.editing = false;
    this.el.classList.remove('editing');
    this.editBar?.remove();
    onDone?.();
  }

  startDrag(btn, id, e) {
    btn.setPointerCapture?.(e.pointerId);
    const move = (ev) => {
      const x = Math.max(4, Math.min(96, (ev.clientX / window.innerWidth) * 100));
      const y = Math.max(5, Math.min(95, (ev.clientY / window.innerHeight) * 100));
      btn.style.left = `${x}%`; btn.style.top = `${y}%`;
      btn.dataset.x = x; btn.dataset.y = y;
    };
    const up = () => {
      btn.removeEventListener('pointermove', move);
      btn.removeEventListener('pointerup', up);
      if (btn.dataset.x) {
        const layout = { ...this.settings.get('layout') };
        let x = Number(btn.dataset.x);
        if (this.settings.get('leftHanded') && id !== 'bag' && id !== 'pause') x = 100 - x;
        layout[id] = { x, y: Number(btn.dataset.y) };
        this.settings.set('layout', layout);
      }
    };
    btn.addEventListener('pointermove', move);
    btn.addEventListener('pointerup', up);
  }

  dispose() { this.unsubs.forEach((u) => u()); this.el.remove(); }
}
