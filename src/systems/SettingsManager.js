// Настройки игрока. Хранятся отдельно от сохранений, применяются сразу через событие settings:changed.
const KEY = 'topolinaya14.settings';

export const DEFAULT_LAYOUT = {
  // Координаты центра кнопки в процентах от ширины/высоты экрана (ландшафт).
  interact: { x: 86, y: 60 },
  run: { x: 72, y: 82 },
  crouch: { x: 87, y: 84 },
  flashlight: { x: 74, y: 44 },
  phone: { x: 93, y: 34 },
  bag: { x: 6, y: 9 },
  pause: { x: 95, y: 10 },
};

export const DEFAULT_SETTINGS = {
  quality: 'auto',          // auto | low | medium | high
  renderScale: 1,           // множитель разрешения поверх профиля
  adaptiveResolution: true,
  sensitivity: 1,
  invertY: false,
  volMaster: 0.9,
  volSfx: 0.9,
  volAmbient: 0.8,
  volMusic: 0.6,
  volVoice: 0.9,
  btnScale: 1,
  layout: DEFAULT_LAYOUT,
  leftHanded: false,
  runToggle: true,
  grain: true,
  vignette: true,
  headBob: true,
  markers: true,            // подсветка важных интерактивных объектов
  subtitles: true,
  soundCaptions: true,
  subSize: 1,
  uiScale: 1,
  language: 'ru',
};

export class SettingsManager {
  constructor(bus) {
    this.bus = bus;
    this.values = structuredClone(DEFAULT_SETTINGS);
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.values = { ...structuredClone(DEFAULT_SETTINGS), ...parsed, layout: { ...DEFAULT_LAYOUT, ...(parsed.layout || {}) } };
      }
    } catch (e) {
      console.warn('[Settings] Не удалось прочитать настройки, используются значения по умолчанию', e);
    }
  }

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.values)); }
    catch (e) { console.warn('[Settings] Не удалось сохранить настройки', e); }
  }

  get(key) { return this.values[key]; }

  set(key, value) {
    this.values[key] = value;
    this.save();
    this.bus.emit('settings:changed', { key, value, settings: this.values });
  }

  resetLayout() { this.set('layout', structuredClone(DEFAULT_LAYOUT)); }

  resetAll() {
    this.values = structuredClone(DEFAULT_SETTINGS);
    this.save();
    for (const key of Object.keys(this.values)) this.bus.emit('settings:changed', { key, value: this.values[key], settings: this.values });
  }

  // Определяем профиль графики для режима «авто» по грубым признакам устройства.
  resolveQuality() {
    const q = this.values.quality;
    if (q !== 'auto') return q;
    const mem = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || matchMedia('(pointer: coarse)').matches;
    if (!mobile && cores >= 8) return 'high';
    if (mem <= 3 || cores <= 4) return 'low';
    return 'medium';
  }
}
