// Единое состояние ввода: сенсорное управление и клавиатура/мышь пишут в один объект.
// Одноразовые нажатия (interact, phone…) накапливаются в очереди и забираются игровым циклом.
export class InputManager {
  constructor(canvas, bus, settings) {
    this.canvas = canvas;
    this.bus = bus;
    this.settings = settings;
    this.moveX = 0; this.moveY = 0;        // от сенсорного джойстика
    this.keys = new Set();
    this.lookDX = 0; this.lookDY = 0;      // накопленный поворот камеры за кадр (в пикселях)
    this.runHeld = false;
    this.runToggled = false;
    this.pressed = new Set();
    this.pointerLocked = false;
    this.enabled = true;
    this.listeners = [];

    this.listen(window, 'keydown', (e) => this.onKey(e, true));
    this.listen(window, 'keyup', (e) => this.onKey(e, false));
    this.listen(window, 'blur', () => { this.keys.clear(); this.runHeld = false; });
    this.listen(document, 'pointerlockchange', () => { this.pointerLocked = document.pointerLockElement === canvas; });
    this.listen(document, 'mousemove', (e) => {
      if (!this.pointerLocked) return;
      this.lookDX += e.movementX * 0.8;
      this.lookDY += e.movementY * 0.8;
    });
    this.listen(canvas, 'click', () => {
      if (this.enabled && this.wantsPointerLock && !matchMedia('(pointer: coarse)').matches) canvas.requestPointerLock?.();
    });
    this.wantsPointerLock = false;
  }

  listen(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    this.listeners.push(() => target.removeEventListener(type, fn, opts));
  }

  onKey(e, down) {
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const code = e.code;
    if (down) {
      if (!this.keys.has(code)) {
        const map = { KeyE: 'interact', KeyF: 'flashlight', KeyC: 'crouch', ControlLeft: 'crouch', Tab: 'phone', KeyP: 'phone', Escape: 'pause', KeyI: 'bag', Space: 'interact', Enter: 'confirm', KeyQ: 'phone' };
        if (/^Digit[1-9]$/.test(code)) this.press(`choice${code.slice(5)}`);
        if (map[code]) { this.press(map[code]); if (code === 'Tab') e.preventDefault(); }
      }
      this.keys.add(code);
      if (code === 'ShiftLeft' || code === 'ShiftRight') this.runHeld = true;
    } else {
      this.keys.delete(code);
      if (code === 'ShiftLeft' || code === 'ShiftRight') this.runHeld = false;
    }
  }

  press(action) { this.pressed.add(action); this.bus.emit('input:press', action); }

  consume(action) {
    if (this.pressed.has(action)) { this.pressed.delete(action); return true; }
    return false;
  }

  clearPresses() { this.pressed.clear(); }

  /** Вектор движения: клавиатура + джойстик, длина ≤ 1 */
  move() {
    let x = this.moveX, y = this.moveY;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y };
  }

  takeLook() {
    const dx = this.lookDX, dy = this.lookDY;
    this.lookDX = 0; this.lookDY = 0;
    return { dx, dy };
  }

  get running() { return this.runHeld || this.runToggled; }

  releasePointer() { if (document.pointerLockElement) document.exitPointerLock?.(); }

  dispose() { for (const off of this.listeners) off(); this.listeners = []; }
}
