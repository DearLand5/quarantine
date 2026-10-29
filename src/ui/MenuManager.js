// Меню: главное (поверх атмосферной сцены), пауза, слоты сохранений, настройки, управление,
// «Об игре», финальный экран главы и диалог подтверждения.
import { el, clear } from '../utils/dom.js';
import { SLOTS } from '../systems/SaveManager.js';

const SLOT_NAMES = { auto: 'Автосохранение', slot1: 'Слот 1', slot2: 'Слот 2', slot3: 'Слот 3' };

export class MenuManager {
  constructor(root, bus, { settings, saves, controls, audio } = {}) {
    this.root = root;
    this.bus = bus;
    this.settings = settings;
    this.saves = saves;
    this.controls = controls;
    this.audio = audio;
    this.menuEl = null;     // главное меню / пауза
    this.sheetEl = null;    // панель поверх меню
    this.current = null;
    this.settingsTab = 'graphics';
  }

  get isOpen() { return !!(this.menuEl || this.sheetEl); }

  tap() { this.bus.emit('sound:play', { name: 'tap', bus: 'ui' }); }

  item(text, onclick, { disabled = false, meta = null } = {}) {
    return el('button', { class: 'm-item', disabled, onclick: () => { this.tap(); onclick(); } }, [text, meta ? el('span', { class: 'meta', text: meta }) : null]);
  }

  hide() {
    this.menuEl?.remove();
    this.sheetEl?.remove();
    this.hintEl?.remove();
    this.menuEl = null;
    this.sheetEl = null;
    this.hintEl = null;
    this.current = null;
  }

  hideSheet() {
    this.sheetEl?.remove();
    this.sheetEl = null;
  }

  // ------------------------------------------------------------ главное меню
  showMain({ canContinue = false, continueMeta = '', onNew, onContinue, onLoad } = {}) {
    this.hide();
    this.current = 'main';
    this.menuEl = el('div', { class: 'menu main' }, [
      el('div', { class: 'col' }, [
        el('div', { class: 'm-title', text: 'ТОПОЛИНАЯ, 14' }),
        el('div', { class: 'm-sub', text: 'карантин' }),
        el('div', { class: 'm-items' }, [
          this.item('Новая игра', async () => {
            if (canContinue && !(await this.confirm('Начать заново? Автосохранение будет перезаписано при первом сохранении новой игры.'))) return;
            onNew?.();
          }),
          this.item('Продолжить', () => onContinue?.(), { disabled: !canContinue, meta: canContinue ? continueMeta : 'нет сохранений' }),
          this.item('Загрузить', () => this.showSlots('load', (slot) => onLoad?.(slot))),
          this.item('Настройки', () => this.showSettings()),
          this.item('Управление', () => this.showControls()),
          this.item('Об игре', () => this.showAbout()),
        ]),
        el('div', { class: 'm-foot', text: 'Глава 1 · «Первая ночь» · вертикальный срез' }),
      ]),
    ]);
    this.root.appendChild(this.menuEl);
    this.hintEl = el('div', { class: 'rotate-hint', text: 'Поверните телефон горизонтально' });
    this.root.appendChild(this.hintEl);
  }

  // ------------------------------------------------------------ пауза
  showPause({ onResume, onSave, onLoad, onMainMenu } = {}) {
    this.hide();
    this.current = 'pause';
    this.menuEl = el('div', { class: 'menu pause' }, [
      el('div', { class: 'col' }, [
        el('div', { class: 'm-title', text: 'ПАУЗА' }),
        el('div', { class: 'm-sub', text: 'мир замер' }),
        el('div', { class: 'm-items' }, [
          this.item('Продолжить', () => onResume?.()),
          this.item('Сохранить', () => this.showSlots('save', (slot) => onSave?.(slot))),
          this.item('Загрузить', () => this.showSlots('load', (slot) => onLoad?.(slot))),
          this.item('Настройки', () => this.showSettings()),
          this.item('Управление', () => this.showControls()),
          this.item('В главное меню', async () => {
            if (await this.confirm('Выйти в главное меню? Несохранённый прогресс после последнего автосохранения будет потерян.')) onMainMenu?.();
          }),
        ]),
      ]),
    ]);
    this.root.appendChild(this.menuEl);
  }

  // ------------------------------------------------------------ панели
  sheet(title, body, { tabs = null, onClose = null } = {}) {
    this.hideSheet();
    const close = () => { this.tap(); this.hideSheet(); onClose?.(); };
    const box = el('div', { class: 'box' }, [
      el('div', { class: 'box-head' }, [el('h2', { text: title }), el('button', { text: 'Закрыть', onclick: close })]),
      tabs,
      el('div', { class: 'box-body' }, body),
    ]);
    this.sheetEl = el('div', { class: 'sheet' }, [box]);
    this.sheetEl.addEventListener('pointerdown', (e) => { if (e.target === this.sheetEl) close(); });
    this.root.appendChild(this.sheetEl);
    return this.sheetEl;
  }

  showSlots(mode, cb) {
    const render = () => {
      const rows = [];
      for (const slot of SLOTS) {
        if (mode === 'save' && slot === 'auto') continue;
        const meta = this.saves.meta(slot);
        const info = !meta ? 'Пусто' : meta.broken ? 'Повреждено' : `Глава ${meta.chapter} · ${meta.gameTime} · ${meta.location || '—'} · ${new Date(meta.savedAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
        const acts = el('div', { class: 'acts' });
        if (mode === 'save') {
          acts.appendChild(el('button', { class: 'primary', text: 'Сохранить', onclick: async () => {
            if (meta && !(await this.confirm('Перезаписать этот слот?'))) return;
            this.tap(); cb?.(slot); render();
          } }));
        } else if (meta && !meta.broken) {
          acts.appendChild(el('button', { class: 'primary', text: 'Загрузить', onclick: () => { this.tap(); this.hide(); cb?.(slot); } }));
        }
        if (meta) {
          acts.appendChild(el('button', { text: 'Удалить', onclick: async () => {
            if (!(await this.confirm('Удалить сохранение?'))) return;
            this.saves.remove(slot); render();
          } }));
        }
        rows.push(el('div', { class: 'slot-row' }, [el('div', { class: 'info' }, [el('b', { text: SLOT_NAMES[slot] }), el('span', { text: info })]), acts]));
      }
      this.sheet(mode === 'save' ? 'СОХРАНИТЬ' : 'ЗАГРУЗИТЬ', [el('div', { class: 'slots' }, rows)]);
    };
    render();
  }

  // ------------------------------------------------------------ настройки
  showSettings(onClose) {
    const s = this.settings;
    const row = (label, ctl, small) => el('div', { class: 'set-row' }, [el('div', { class: 'lbl' }, [label, small ? el('small', { text: small }) : null]), el('div', { class: 'ctl' }, ctl)]);
    const toggle = (key) => {
      const b = el('button', { class: `toggle ${s.get(key) ? 'on' : ''}`, 'aria-label': key });
      b.addEventListener('click', () => { this.tap(); s.set(key, !s.get(key)); b.classList.toggle('on', !!s.get(key)); });
      return b;
    };
    const range = (key, min, max, step, fmt = (v) => v.toFixed(2)) => {
      const val = el('span', { class: 'val', text: fmt(Number(s.get(key))) });
      const input = el('input', { type: 'range', min, max, step, value: s.get(key) });
      input.addEventListener('input', () => { const v = Number(input.value); val.textContent = fmt(v); s.set(key, v); });
      return [input, val];
    };
    const seg = (key, options) => {
      const wrap = el('div', { class: 'seg' });
      for (const [value, label] of options) {
        const b = el('button', { class: s.get(key) === value ? 'on' : '', text: label });
        b.addEventListener('click', () => {
          this.tap(); s.set(key, value);
          for (const c of wrap.children) c.classList.remove('on');
          b.classList.add('on');
        });
        wrap.appendChild(b);
      }
      return wrap;
    };
    const pct = (v) => `${Math.round(v * 100)}%`;

    const tabsDef = [['graphics', 'Графика'], ['controls', 'Управление'], ['sound', 'Звук'], ['ui', 'Интерфейс']];
    const content = {
      graphics: () => [
        row('Качество', [seg('quality', [['auto', 'Авто'], ['low', 'Низкое'], ['medium', 'Среднее'], ['high', 'Высокое']])], 'Профиль меняется после перезапуска страницы'),
        row('Разрешение рендера', range('renderScale', 0.5, 1, 0.05, pct)),
        row('Адаптивное разрешение', [toggle('adaptiveResolution')], 'Снижает разрешение при падении FPS'),
        row('Зерно плёнки', [toggle('grain')]),
        row('Виньетка', [toggle('vignette')]),
        row('Покачивание камеры', [toggle('headBob')]),
        row('Подсветка важных предметов', [toggle('markers')]),
      ],
      controls: () => [
        row('Чувствительность обзора', range('sensitivity', 0.3, 2.5, 0.05)),
        row('Инвертировать ось Y', [toggle('invertY')]),
        row('Размер сенсорных кнопок', range('btnScale', 0.7, 1.5, 0.05, pct)),
        row('Режим для левши', [toggle('leftHanded')], 'Джойстик справа, кнопки слева'),
        row('Бег переключением', [toggle('runToggle')], 'Иначе — удерживать кнопку'),
        row('Расположение кнопок', [el('button', { class: 'btn-line', text: 'Настроить расположение кнопок', onclick: () => {
          this.tap();
          this.hideSheet();
          const menu = this.menuEl;
          if (menu) menu.style.display = 'none';
          this.controls?.startEdit(() => {
            if (menu) menu.style.display = '';
            this.showSettings(onClose);
          });
        } })]),
      ],
      sound: () => [
        row('Общая громкость', range('volMaster', 0, 1, 0.05, pct)),
        row('Эффекты', range('volSfx', 0, 1, 0.05, pct)),
        row('Атмосфера', range('volAmbient', 0, 1, 0.05, pct)),
        row('Музыка', range('volMusic', 0, 1, 0.05, pct)),
        row('Голоса', range('volVoice', 0, 1, 0.05, pct)),
      ],
      ui: () => [
        row('Субтитры', [toggle('subtitles')]),
        row('Подписи к звукам', [toggle('soundCaptions')], '[шаги сверху], [скрип двери]…'),
        row('Размер субтитров', range('subSize', 0.8, 1.6, 0.05, pct)),
        row('Масштаб интерфейса', range('uiScale', 0.8, 1.4, 0.05, pct)),
        row('Язык', [seg('language', [['ru', 'Русский']])], 'Другие языки пока не реализованы'),
      ],
    };

    const render = () => {
      const tabs = el('div', { class: 'tabs' }, tabsDef.map(([id, label]) => el('button', {
        class: `tab ${this.settingsTab === id ? 'on' : ''}`, text: label,
        onclick: () => { this.tap(); this.settingsTab = id; render(); },
      })));
      const body = [
        ...content[this.settingsTab](),
        el('h3', { text: 'Сброс' }),
        row('Вернуть настройки по умолчанию', [el('button', { class: 'btn-line', text: 'Сбросить всё', onclick: async () => {
          if (await this.confirm('Сбросить все настройки, включая раскладку кнопок?')) { s.resetAll(); render(); }
        } })]),
      ];
      this.sheet('НАСТРОЙКИ', body, { tabs, onClose });
    };
    render();
  }

  showControls() {
    const rows = [
      ['Движение', 'левая половина экрана — джойстик', 'W A S D / стрелки'],
      ['Обзор', 'свайп по правой половине', 'мышь (щёлкните по экрану)'],
      ['Действие', 'кнопка «Действие» или короткое касание справа', 'E / Пробел'],
      ['Бег', 'кнопка «Бег»', 'Shift'],
      ['Присесть', 'кнопка «Присесть»', 'C / Ctrl'],
      ['Фонарик', 'кнопка «Фонарь»', 'F'],
      ['Телефон', 'кнопка «Телефон»', 'Tab / Q'],
      ['Сумка', 'кнопка с сумкой', 'I'],
      ['Пауза', 'кнопка паузы', 'Esc'],
      ['Выбор в диалоге', 'касание варианта', '1–9'],
    ];
    const table = el('table', { class: 'keys-table' }, [
      el('tr', {}, [el('td', { text: 'Действие' }), el('td', { text: 'Сенсорный экран' }), el('td', { text: 'Клавиатура' })]),
      ...rows.map(([a, t, k]) => el('tr', {}, [el('td', { text: a }), el('td', { text: t }), el('td', {}, [el('kbd', { text: k })])])),
    ]);
    this.sheet('УПРАВЛЕНИЕ', [
      table,
      el('p', { text: 'С открытым телефоном можно медленно идти джойстиком. Расположение и размер кнопок меняются в «Настройках → Управление».' }),
    ]);
  }

  showAbout() {
    const li = (t) => el('li', { text: t });
    this.sheet('ОБ ИГРЕ', [
      el('p', { text: '«Тополиная, 14» — психологический хоррор о карантине в обычной многоэтажке. Дом оцеплен, никто ничего не объясняет, а в общем чате жильцов появляется сосед, которого три года как похоронили. Исследуйте этаж, переписывайтесь с соседями, проверяйте их слова — и решайте, кому открывать дверь.' }),
      el('h3', { text: 'Что упрощено в этой версии' }),
      el('ul', { style: { color: 'var(--ink-dim)', fontSize: '14px', lineHeight: '1.6' } }, [
        li('Это вертикальный срез: один этаж, глава 1 «Первая ночь».'),
        li('Модели людей, мебели и окружения собраны процедурно из примитивов; их можно заменить GLB-моделями (см. README).'),
        li('Текстуры рисуются процедурно на canvas; звуки синтезируются Web Audio без аудиофайлов.'),
        li('Свободный ввод в чате распознаётся по ключевым словам и темам, а не языковой моделью.'),
        li('Лестница между этажами недоступна по сюжету: проходы перекрыты.'),
      ]),
      el('p', { text: 'Лучше играть в наушниках, в горизонтальной ориентации.' }),
    ]);
  }

  // ------------------------------------------------------------ финал главы
  showEnding(data, { onMenu, onKeepPlaying } = {}) {
    this.hide();
    this.current = 'ending';
    const stats = el('ul', {}, (data.stats || []).map(([label, value]) => el('li', {}, [el('span', { text: label }), el('b', { text: String(value) })])));
    this.menuEl = el('div', { class: 'ending' }, [
      el('div', { class: 'wrap' }, [
        el('div', { class: 'chap', text: data.chapterLabel || 'Глава 1' }),
        el('h1', { text: data.title || '' }),
        el('div', { class: 'txt', text: data.text || '' }),
        stats,
        data.tease ? el('div', { class: 'tease', text: data.tease }) : null,
        el('div', { class: 'acts' }, [
          onKeepPlaying ? el('button', { class: 'btn-line', text: 'Остаться на этаже', onclick: () => { this.tap(); this.hide(); onKeepPlaying(); } }) : null,
          el('button', { class: 'btn-line', text: 'В главное меню', onclick: () => { this.tap(); this.hide(); onMenu?.(); } }),
        ]),
      ]),
    ]);
    this.root.appendChild(this.menuEl);
  }

  // ------------------------------------------------------------ подтверждение
  confirm(text) {
    return new Promise((resolve) => {
      const done = (v) => { this.tap(); node.remove(); resolve(v); };
      const node = el('div', { class: 'confirm' }, [
        el('div', { class: 'cbox' }, [
          el('p', { text }),
          el('div', { class: 'acts' }, [
            el('button', { text: 'Отмена', onclick: () => done(false) }),
            el('button', { class: 'primary', text: 'Да', onclick: () => done(true) }),
          ]),
        ]),
      ]);
      this.root.appendChild(node);
    });
  }
}
