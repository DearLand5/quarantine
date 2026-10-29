// Игровой HUD: прицел, подсказка взаимодействия, задача, фонарик, баннеры, субтитры, тосты,
// а также экранные эффекты (затемнение, глазок, видоискатель камеры, вспышка, «урон»).
import { el, clear } from '../utils/dom.js';

export class HUD {
  constructor(root, bus, settings) {
    this.root = root;
    this.bus = bus;
    this.settings = settings;
    this.unsubs = [];

    this.el = el('div', { class: 'hud passthrough' });
    this.crosshair = el('div', { class: 'crosshair' });
    this.promptLabel = el('span');
    this.promptSub = el('span', { class: 'sub' });
    this.prompt = el('div', { class: 'prompt' }, [el('span', { class: 'key', text: 'E' }), this.promptLabel, this.promptSub]);
    this.holdRing = el('div', { class: 'hold-ring' });
    this.objText = el('div');
    this.objective = el('div', { class: 'objective' }, [el('div', { class: 'label', text: 'Задача' }), this.objText]);
    this.flashBar = el('i', { style: { width: '0%' } });
    this.flashMeter = el('div', { class: 'flash-meter hidden' }, [el('span', { text: 'фонарь' }), el('div', { class: 'bar' }, [this.flashBar])]);
    this.status = el('div', { class: 'status-cluster' }, [this.flashMeter]);
    this.subtitlesEl = el('div', { class: 'subtitles' });
    this.toastEl = el('div', { class: 'toast-stack' });
    this.el.append(this.crosshair, this.prompt, this.holdRing, this.objective, this.status, this.subtitlesEl, this.toastEl);

    // Баннеры уведомлений должны принимать касания, поэтому живут вне «прозрачного» HUD
    this.bannerEl = el('div', { class: 'banners' });
    this.bannerEl.style.pointerEvents = 'none';
    this.bannerEl.style.position = 'absolute';
    root.append(this.el, this.bannerEl);
    this.patchBanners();

    this.fadeEl = document.getElementById('fade');
    this.grainEl = document.getElementById('fx-grain');
    this.vignetteEl = document.getElementById('fx-vignette');
    this.damageEl = document.getElementById('fx-damage');
    this.makeGrain();

    this.objTimer = null;
    this.peephole = null;
    this.viewfinder = null;
    this.flashWhiteEl = el('div', { class: 'flash-white' });
    root.appendChild(this.flashWhiteEl);

    this.unsubs.push(
      bus.on('interact:focus', (f) => this.setFocus(f)),
      bus.on('interact:hold', ({ p }) => this.setHold(p)),
      bus.on('hud:toast', ({ text, error }) => this.toast(text, error)),
      bus.on('hud:objective', ({ text }) => this.showObjective(text)),
      bus.on('subtitle', (s) => this.subtitle(s)),
      bus.on('caption:sound', ({ text }) => {
        const v = this.settings.values;
        if (v.subtitles && v.soundCaptions) this.subtitle({ text, duration: 3, sound: true });
      }),
      bus.on('settings:changed', () => this.applySettings()),
    );
    this.applySettings();
  }

  // Баннеры: контейнер прозрачен для касаний, а сами баннеры — нет
  patchBanners() {
    const obs = new MutationObserver(() => {
      for (const b of this.bannerEl.children) b.style.pointerEvents = 'auto';
    });
    obs.observe(this.bannerEl, { childList: true });
    this.bannerObserver = obs;
  }

  makeGrain() {
    if (!this.grainEl) return;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    this.grainEl.style.backgroundImage = `url(${c.toDataURL()})`;
  }

  applySettings() {
    const v = this.settings.values;
    this.grainEl?.classList.toggle('off', !v.grain);
    this.vignetteEl?.classList.toggle('off', !v.vignette);
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--ui-scale', v.uiScale || 1);
    rootStyle.setProperty('--sub-scale', v.subSize || 1);
  }

  setFocus(f) {
    if (!f) {
      this.prompt.classList.remove('show');
      this.crosshair.classList.remove('active');
      return;
    }
    this.promptLabel.textContent = f.label;
    this.promptSub.textContent = f.sub || '';
    this.prompt.classList.add('show');
    this.crosshair.classList.add('active');
  }

  setHold(p) {
    this.holdRing.style.setProperty('--p', p);
    this.holdRing.classList.toggle('show', p > 0 && p < 1);
  }

  toast(text, error = false) {
    const t = el('div', { class: `toast ${error ? 'error' : ''}`, text });
    this.toastEl.appendChild(t);
    while (this.toastEl.children.length > 3) this.toastEl.firstChild.remove();
    setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 450); }, 3200);
  }

  showObjective(text) {
    this.objText.textContent = text;
    this.objective.classList.add('show');
    clearTimeout(this.objTimer);
    this.objTimer = setTimeout(() => this.objective.classList.remove('show'), 7000);
  }

  subtitle({ who, text, duration = 3, sound = false }) {
    const v = this.settings.values;
    if (!v.subtitles || !text) return;
    const line = el('div', { class: `subtitle ${sound ? 'sound' : ''}` }, [who ? el('span', { class: 'who', text: `${who}:` }) : null, text]);
    this.subtitlesEl.appendChild(line);
    while (this.subtitlesEl.children.length > 3) this.subtitlesEl.firstChild.remove();
    setTimeout(() => line.remove(), Math.max(1.8, duration + 0.8) * 1000);
  }

  setFlash(has, on, battery) {
    this.flashMeter.classList.toggle('hidden', !has);
    this.flashMeter.classList.toggle('off', !on);
    this.flashMeter.classList.toggle('low', battery < 20);
    this.flashBar.style.width = `${Math.max(0, Math.min(100, battery))}%`;
  }

  setVisible(v) { this.el.classList.toggle('hidden-all', !v); }

  fade(on, text = '') {
    const f = this.fadeEl;
    if (!f) return Promise.resolve();
    clear(f);
    if (text) f.appendChild(el('div', { class: 'fade-text', text }));
    f.classList.toggle('on', on);
    return new Promise((r) => setTimeout(r, 1200));
  }

  showPeephole(on) {
    if (on && !this.peephole) {
      this.peephole = el('div', { class: 'peephole' });
      this.root.appendChild(this.peephole);
    } else if (!on && this.peephole) {
      this.peephole.remove();
      this.peephole = null;
    }
  }

  showViewfinder(onShutter, onClose) {
    this.hideViewfinder();
    const rec = el('div', { class: 'rec', text: '● КАМЕРА' });
    this.viewfinder = el('div', { class: 'viewfinder' }, [
      el('div', { class: 'frame' }),
      rec,
      el('button', { class: 'vf-close', text: '‹ Назад', onclick: (e) => { e.stopPropagation(); onClose?.(); } }),
      el('button', { class: 'shutter', 'aria-label': 'Снять', onclick: (e) => { e.stopPropagation(); onShutter?.(); } }),
    ]);
    this.root.appendChild(this.viewfinder);
  }

  hideViewfinder() {
    this.viewfinder?.remove();
    this.viewfinder = null;
  }

  flashWhite() {
    const f = this.flashWhiteEl;
    f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  }

  damage(on) { this.damageEl?.classList.toggle('on', !!on); }

  dispose() {
    this.unsubs.forEach((u) => u());
    this.bannerObserver?.disconnect();
    this.el.remove(); this.bannerEl.remove(); this.flashWhiteEl.remove();
    this.hideViewfinder(); this.showPeephole(false);
  }
}
