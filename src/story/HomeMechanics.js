// Бытовые механики квартиры и этажа: чайник, телевизоры, краны, холодильник, ноутбук, стиральная машина, шкаф.
// Состояние хранится в gs.prop(...) / флагах (сохраняется вместе с игрой), визуальная часть восстанавливается в restore().
// resolve(hitId) возвращает обработчик, который ПЕРЕКРЫВАЕТ обработчик из Interactions.js, либо null.
import * as THREE from 'three';
import '../systems/HomeSounds.js';

const BOIL_SECONDS = 25;       // реальных секунд до закипания
const HOT_MINUTES = 10;        // игровых минут, пока вода в чайнике горячая
const WASH_SECONDS = 45;       // реальных секунд стирки

const KETTLE_POS = { x: 4.05, y: 1.0, z: -5.15 };
const SPOUT = { x: 4.05, y: 1.03, z: -5.08 };

const TV_OFF = [0.012, 0.016, 0.018];

// Новости по телевизору: до 23:00 спокойные, позже тревожнее; в главе 2 — свои.
const NEWS_EARLY = [
  '…на улице Тополиной проходят плановые учения гражданской обороны. Жителей просят сохранять спокойствие…',
  '…движение транспорта в районе ограничено до особого распоряжения штаба…',
  '…напоминаем: при необходимости покинуть квартиру используйте средства защиты органов дыхания…',
  '…синоптики: ночью ясно, ветер юго-западный, четыре градуса тепла…',
];
const NEWS_LATE = [
  '…сообщений о заражённых нет. Повторяю: сообщений о заражённых нет. Не распространяйте слухи…',
  '…жителям домов с двенадцатого по шестнадцатый по Тополиной: не открывайте двери посторонним…',
  '…по данным штаба, ситуация находится под контролем. Просим не покидать квартиры…',
  '…фильтрационные мероприятия в доме будут завершены к утру…',
];
const NEWS_C2 = [
  '…режим ограничения продлён до особого распоряжения. Выход из квартир запрещён…',
  '…эвакуация откладывается по техническим причинам. Ожидайте дальнейших сообщений…',
  '…штаб напоминает: любые шумы в стенах и перекрытиях — естественное оседание конструкций…',
  '…доставка воды и медикаментов осуществляется только по спискам штаба…',
];
const NEWS_CREEPY = '…жильцам шестого этажа: не подходите к стенам. Повторяю: не подходите к стенам. Они слышат…';

const WARDROBE = [
  'Куртки, зимняя шапка, мамин плед. Пахнет нафталином и её духами.',
  'Коробка с ёлочными игрушками. До Нового года ещё надо дожить.',
  'Шкаф как шкаф. Хотя в темноте между куртками на секунду показалось, что там кто-то стоит.',
];

const TV_DEFS = [
  { name: 'tv47', apt: '47', power: 'apartment', pitch: 118 },
  { name: 'tv45', apt: '45', power: 'corridor', pitch: 132 },
];

const TAP_DEFS = [
  { id: 'tap_sink', name: 'sink', hit: { x: 4.27, y: 1.0, z: -6.25, w: 0.3, h: 0.5, d: 0.4 }, stream: { x: 4.18, y0: 1.09, y1: 0.67, z: -6.25 }, vol: 0.8 },
  { id: 'tap_basin', name: 'basin', hit: { x: 1.95, y: 0.95, z: -2.82, w: 0.4, h: 0.4, d: 0.36 }, stream: { x: 1.95, y0: 0.96, y1: 0.79, z: -2.84 }, vol: 0.7 },
  { id: 'tap_bath', name: 'bath', hit: { x: 3.04, y: 0.8, z: -2.7, w: 0.4, h: 0.4, d: 0.3 }, stream: { x: 3.04, y0: 0.81, y1: 0.2, z: -2.78 }, vol: 0.85 },
];

export class HomeMechanics {
  constructor(game) {
    this.g = game;
    this.gs = game.gs;
    this.bus = game.bus;
    this.time = 0;
    this.syncTimer = 0;
    this.hits = [];
    this.handlers = null;

    // Кухонные эффекты
    this.glowTex = makeGlowTexture();
    this.steam = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.SpriteMaterial({ map: this.glowTex, color: 0xbcc4c8, transparent: true, opacity: 0, depthWrite: false });
      const s = new THREE.Sprite(m);
      s.visible = false;
      game.sm.scene.add(s);
      this.steam.push(s);
    }
    this.steamK = 0;
    this.kettleVol = -1;

    // Холодильник: световая «щель» двери и пятно на полу
    const addMat = (color) => new THREE.MeshBasicMaterial({ map: this.glowTex, color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    this.fridgeSlab = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 1.45), addMat(0xfff0cc));
    this.fridgeSlab.position.set(3.785, 0.85, -4.15);
    this.fridgeSlab.rotation.y = -Math.PI / 2;
    this.fridgeFloor = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.2), addMat(0xffe8b8));
    this.fridgeFloor.position.set(3.25, 0.02, -4.15);
    this.fridgeFloor.rotation.x = -Math.PI / 2;
    this.fridgeSlab.visible = this.fridgeFloor.visible = false;
    game.sm.scene.add(this.fridgeSlab, this.fridgeFloor);
    this.fridgeT = 0;
    this.fridgeClosed = true;

    // Телевизоры
    this.tvs = [];
    for (const def of TV_DEFS) this.initTV(def);

    // Краны
    this.taps = [];
    const streamGeo = new THREE.BoxGeometry(0.012, 1, 0.012);
    for (const def of TAP_DEFS) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xcfe6f0, transparent: true, opacity: 0.5, depthWrite: false });
      const mesh = new THREE.Mesh(streamGeo, mat);
      const s = def.stream;
      mesh.position.set(s.x, (s.y0 + s.y1) / 2, s.z);
      mesh.scale.y = s.y0 - s.y1;
      mesh.visible = false;
      game.sm.scene.add(mesh);
      this.addHit(def.id, def.hit.x, def.hit.y, def.hit.z, def.hit.w, def.hit.h, def.hit.d);
      this.taps.push({ def, mesh, mat, pos: { x: s.x, y: s.y1 + 0.15, z: s.z } });
    }
    this.rustT = 0;
    this.rustTap = null;
    this.whisperT = 0;
    this.rustColor = new THREE.Color(0x8a4a24);
    this.clearColor = new THREE.Color(0xcfe6f0);

    // Прочие зоны: стиральная машина и шкаф
    this.addHit('washer47', 2.2, 0.45, -1.42, 0.66, 0.9, 0.6);
    this.addHit('wardrobe47', 0.9, 1.0, -7.55, 0.7, 2.0, 1.1);

    // Ноутбук
    this.laptopSleep = 0;
  }

  addHit(id, x, y, z, w, h, d) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
    mesh.position.set(x, y, z);
    mesh.userData.hitId = id;
    this.g.sm.scene.add(mesh);
    this.g.interaction.addHit(mesh);
    this.hits.push(mesh);
    return mesh;
  }

  initTV(def) {
    const entry = this.g.world.named.get(def.name);
    const screen = entry?.parts?.screen;
    if (!screen) return;
    const it = entry.item;
    const tv = {
      def, id: `home_${def.name}`, hitId: def.name, screen, mat: screen.material,
      halo: null, glitch: 0, lineT: 0, lines: 0, idx: Math.floor(Math.random() * 4), shown: null, seed: Math.random() * 10,
    };
    const hm = new THREE.SpriteMaterial({ map: this.glowTex, color: 0x6aa8d8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    tv.halo = new THREE.Sprite(hm);
    tv.halo.scale.set(1.5, 1.2, 1);
    tv.halo.position.copy(screen.position);
    tv.halo.position.y += 0.02;
    tv.halo.visible = false;
    this.g.sm.scene.add(tv.halo);
    tv.pos = { x: screen.position.x, y: screen.position.y, z: screen.position.z };
    this.addHit(def.name, it.x, 0.55, it.z, 0.85, 1.1, 0.85);
    this.tvs.push(tv);
  }

  // ------------------------------------------------------------------ состояние
  get power() { return this.gs.data.world.power; }
  think(text, duration = 4.5) { this.bus.emit('subtitle', { who: '', text, duration }); }
  sound(name, opts) { this.bus.emit('sound:play', { name, ...opts }); }
  now() { return this.gs.data.time; }
  canSend() {
    const p = this.gs.prop('home_laptop');
    return this.g.chats.signal > 0 && !!p.read && !p.sent;
  }

  // ------------------------------------------------------------------ разрешение обработчиков
  resolve(id) {
    if (!id) return null;
    if (!this.handlers) this.handlers = this.makeHandlers();
    return this.handlers[id] || null;
  }

  makeHandlers() {
    const gs = this.gs;
    const H = {
      kettle: {
        label: () => {
          const k = gs.prop('kettle');
          if (k.state === 'boil') return 'Выключить чайник';
          if (k.state === 'hot') return 'Налить чай';
          return 'Поставить чайник';
        },
        sub: () => {
          const k = gs.prop('kettle');
          if (k.state === 'boil') return this.power.apartment ? `закипает · ${Math.round(Math.min(1, k.p / BOIL_SECONDS) * 100)}%` : 'нет света';
          if (k.state === 'hot') return 'горячий';
          return null;
        },
        important: () => gs.prop('kettle').state === 'hot',
        action: () => this.kettleAction(),
      },
      fridge: {
        label: () => 'Открыть холодильник',
        action: () => this.fridgeAction(),
      },
      laptop: {
        label: () => {
          const p = gs.prop('home_laptop');
          if (p.on === false) return 'Включить ноутбук';
          return this.canSend() ? 'Отправить перевод Ирине' : 'Ноутбук';
        },
        sub: () => (this.canSend() ? 'ЦНС-60_перевод.docx · 31 из 48 стр.' : null),
        important: () => this.canSend(),
        action: () => this.laptopAction(),
      },
      washer47: {
        label: () => {
          const w = gs.prop('home_washer');
          if (w.state === 'run') return 'Стирка идёт';
          if (w.state === 'done') return 'Достать бельё';
          return this.power.apartment ? 'Запустить стирку' : 'Стиральная машина (нет света)';
        },
        sub: () => {
          const w = gs.prop('home_washer');
          return w.state === 'run' ? `${Math.round(Math.min(1, w.p / WASH_SECONDS) * 100)}%` : null;
        },
        action: () => this.washerAction(),
      },
      wardrobe47: {
        label: () => 'Открыть шкаф',
        action: () => {
          const n = gs.inc('wardrobe_open');
          this.sound('door_open', { pos: { x: 0.65, y: 1, z: -7.55 }, creak: true, volume: 0.8 });
          setTimeout(() => this.sound('door_close', { pos: { x: 0.65, y: 1, z: -7.55 }, volume: 0.5 }), 1700);
          this.think(WARDROBE[Math.min(n - 1, WARDROBE.length - 1)], 5);
          if (n >= 3 && gs.data.chapter >= 2) this.g.ambience.setTension(Math.max(this.g.ambience.tension, 0.35));
        },
      },
    };
    for (const tv of this.tvs) {
      H[tv.hitId] = {
        label: () => {
          const on = gs.prop(tv.id).on;
          if (on) return 'Выключить телевизор';
          return this.power[tv.def.power] ? 'Включить телевизор' : 'Включить телевизор (нет света)';
        },
        action: () => this.tvAction(tv),
      };
    }
    for (const tp of this.taps) {
      H[tp.def.id] = {
        label: () => (gs.prop('home_taps')[tp.def.name] ? 'Закрыть кран' : 'Открыть кран'),
        action: () => this.tapAction(tp),
      };
    }
    return H;
  }

  // ------------------------------------------------------------------ чайник
  kettleAction() {
    const gs = this.gs;
    const k = gs.prop('kettle');
    if (k.state === 'boil') {
      k.state = 'idle'; k.p = 0;
      this.sound('switch', { pos: KETTLE_POS });
      this.think('Выключил. Пусть остынет.', 2.5);
      return;
    }
    if (k.state === 'hot') {
      k.state = 'idle'; k.p = 0;
      this.sound('hm_pour', { pos: KETTLE_POS, duration: 3 });
      const n = gs.inc('tea_count');
      gs.setFlag('tea');
      this.g.ambience.setTension(Math.max(0, this.g.ambience.tension - 0.25));
      this.g.player.stamina = 1;
      this.think(n === 1
        ? 'Горячий и крепкий, без сахара — сахар кончился на прошлой неделе. Руки наконец перестали дрожать.'
        : 'Ещё кружка. Тепло расходится по рукам, и тишина за стенкой уже не такая давящая.', 5.5);
      this.bus.emit('hud:toast', { text: 'Чай согрел. Силы восстановлены' });
      return;
    }
    if (!this.power.apartment) { this.think('Чайник электрический. Света нет.'); return; }
    k.state = 'boil'; k.p = 0;
    this.sound('switch', { pos: KETTLE_POS });
    this.think('Включил чайник. Секунд двадцать — и можно пить чай.', 3.5);
  }

  updateKettle(dt) {
    const k = this.gs.prop('kettle');
    const powered = this.power.apartment;
    if (k.state === 'boil' && powered) {
      k.p += dt;
      if (k.p >= BOIL_SECONDS) {
        k.state = 'hot'; k.until = this.now() + HOT_MINUTES;
        this.sound('hm_whistle', { pos: KETTLE_POS, duration: 4.5 });
        this.sound('switch', { pos: KETTLE_POS, volume: 0.7 });
        this.bus.emit('hud:toast', { text: 'Чайник вскипел' });
      }
    } else if (k.state === 'hot' && this.now() >= k.until) {
      k.state = 'idle'; k.p = 0;
    }
    // пар
    let target = 0;
    if (k.state === 'boil' && powered) target = Math.max(0, Math.min(1, (k.p / BOIL_SECONDS - 0.55) / 0.45));
    else if (k.state === 'hot') target = Math.max(0, Math.min(1, (k.until - this.now()) / HOT_MINUTES)) * 0.75;
    this.steamK += (target - this.steamK) * Math.min(1, dt * 2);
    const sk = this.steamK;
    const sp = this.steam;
    if (sk < 0.02) {
      if (sp[0].visible) for (const s of sp) s.visible = false;
      return;
    }
    const t = this.time;
    for (let i = 0; i < sp.length; i++) {
      const s = sp[i];
      const ph = (t * 0.42 + i / sp.length) % 1;
      s.visible = true;
      s.position.set(SPOUT.x + Math.sin(t * 1.3 + i * 2.1) * 0.025 - ph * 0.04, SPOUT.y + ph * 0.42, SPOUT.z + Math.cos(t * 1.1 + i) * 0.02);
      const sc = 0.07 + ph * 0.24;
      s.scale.set(sc, sc, 1);
      s.material.opacity = sk * 0.32 * Math.sin(ph * Math.PI);
    }
  }

  // ------------------------------------------------------------------ холодильник
  fridgeAction() {
    const gs = this.gs;
    const powered = this.power.apartment;
    this.sound('door_open', { pos: { x: 4.1, y: 1, z: -4.15 }, creak: false, volume: 0.5 });
    if (powered) { this.fridgeT = 4; this.fridgeClosed = false; }
    if (!gs.flag('got_water')) {
      gs.setFlag('got_water');
      this.g.inventory.add('water');
      this.think('Полпачки пельменей, кефир, два яйца. И бутылка воды — забираю.');
    } else this.think(powered ? 'Пельмени и кефир. Холодильник гудит, как ни в чём не бывало.' : 'Внутри темно и тихо. Холод уходит.');
  }

  updateFridge(dt) {
    const slab = this.fridgeSlab;
    if (this.fridgeT <= 0) {
      if (slab.visible) slab.visible = this.fridgeFloor.visible = false;
      return;
    }
    this.fridgeT -= dt;
    if (this.fridgeT <= 0 && !this.fridgeClosed) {
      this.fridgeClosed = true;
      this.sound('door_close', { pos: { x: 4.1, y: 1, z: -4.15 }, volume: 0.35 });
    }
    if (!this.power.apartment) this.fridgeT = Math.min(this.fridgeT, 0.3);
    const left = this.fridgeT;
    const k = Math.min(1, (4 - left) / 0.15, left / 0.6);
    const flick = 0.92 + 0.08 * Math.sin(this.time * 23);
    slab.visible = this.fridgeFloor.visible = k > 0.01;
    slab.material.opacity = 0.55 * Math.max(0, k) * flick;
    this.fridgeFloor.material.opacity = 0.32 * Math.max(0, k) * flick;
  }

  // ------------------------------------------------------------------ телевизоры
  tvPowered(tv) { return !!this.power[tv.def.power]; }

  tvAction(tv) {
    const st = this.gs.prop(tv.id);
    if (st.on) {
      st.on = false;
      this.sound('static', { pos: tv.pos, duration: 0.25, volume: 0.6 });
      return;
    }
    if (!this.tvPowered(tv)) { this.think('Нажимаю кнопку — экран остаётся чёрным. Света нет.'); return; }
    st.on = true;
    tv.lineT = 1.6; tv.lines = 0;
    this.sound('static', { pos: tv.pos, duration: 0.8, volume: 0.8 });
    if (tv.def.name === 'tv45' && !this.gs.flag('tv45_touched')) {
      this.gs.setFlag('tv45_touched');
      this.think('Включил телевизор Зинаиды Павловны. Надеюсь, она не обидится.', 3.5);
    }
  }

  pickNews(tv) {
    const gs = this.gs;
    const ch = gs.data.chapter || 1;
    if (ch >= 2) {
      if (!gs.flag('tv_creepy') && tv.lines >= 2) {
        gs.setFlag('tv_creepy');
        return NEWS_CREEPY;
      }
      return NEWS_C2[(tv.idx++) % NEWS_C2.length];
    }
    const pool = gs.data.time < 1380 ? NEWS_EARLY : NEWS_LATE;
    return pool[(tv.idx++) % pool.length];
  }

  updateTV(tv, dt) {
    const st = this.gs.prop(tv.id);
    const eff = !!st.on && this.tvPowered(tv);
    const mat = tv.mat;
    if (!eff) {
      if (tv.shown !== false) {
        mat.color.setRGB(TV_OFF[0], TV_OFF[1], TV_OFF[2]);
        tv.halo.visible = false;
        tv.shown = false;
      }
      return;
    }
    tv.shown = true;
    const t = this.time;
    let f = 0.74 + 0.1 * Math.sin(t * 31 + tv.seed) + 0.07 * Math.sin(t * 7.3 + tv.seed);
    if (((t * 0.8 + tv.seed) % 1) < 0.07) f += 0.2;
    let r = 0.3, g = 0.47, b = 0.6;
    if (tv.glitch > 0) {
      tv.glitch -= dt;
      f = 0.2 + Math.random() * 1.0;
      r = 0.5; g = 0.25; b = 0.25;
    }
    mat.color.setRGB(r * f, g * f, b * f);
    tv.halo.visible = true;
    tv.halo.material.opacity = 0.2 * f;

    // реплики диктора
    tv.lineT -= dt;
    if (tv.lineT <= 0) {
      const text = this.pickNews(tv);
      tv.lines++;
      const dur = Math.max(3.5, Math.min(7.5, text.length * 0.06));
      const creepy = text === NEWS_CREEPY;
      const apt = this.g.rooms.room?.apartment;
      this.sound('babble', { bus: 'voice', pos: tv.pos, pitch: tv.def.pitch, duration: dur * 0.8, muffled: apt !== tv.def.apt, volume: 0.7 });
      if (apt === tv.def.apt) this.bus.emit('subtitle', { who: 'Диктор', text, duration: dur });
      if (creepy) {
        tv.glitch = 1.4;
        this.sound('glitch', { pos: tv.pos });
        setTimeout(() => this.sound('whisper', { pos: tv.pos, duration: 2.2, volume: 0.8 }), 900);
        this.g.ambience.setTension(Math.max(this.g.ambience.tension, 0.5));
      }
      tv.lineT = dur + 5 + Math.random() * 6;
    }
  }

  // ------------------------------------------------------------------ краны
  tapAction(tp) {
    const taps = this.gs.prop('home_taps');
    const id = tp.def.name;
    if (taps[id]) {
      taps[id] = false;
      this.sound('hm_splash', { pos: tp.pos, volume: 0.4 });
      return;
    }
    taps[id] = true;
    this.sound('hm_splash', { pos: tp.pos, volume: 0.9 });
    if ((this.gs.data.chapter || 1) >= 2 && !this.gs.flag('tap_rust_done')) {
      this.gs.setFlag('tap_rust_done');
      this.rustT = 8; this.rustTap = tp; this.rustPos = tp.pos; this.whisperT = 1.4;
      setTimeout(() => this.sound('pipes', { pos: tp.pos, volume: 0.9 }), 300);
      this.think('Вода пошла бурая, как ржавчина. А в трубах будто кто-то шепчет. Слов не разобрать.', 6);
      this.g.ambience.setTension(Math.max(this.g.ambience.tension, 0.4));
    }
  }

  updateTaps(dt) {
    const state = this.gs.prop('home_taps');
    const t = this.time;
    if (this.rustT > 0) {
      this.rustT -= dt;
      if (this.rustT <= 0) this.rustTap = null;
      if (this.whisperT > 0) {
        this.whisperT -= dt;
        if (this.whisperT <= 0 && this.rustPos) this.sound('whisper', { pos: this.rustPos, duration: 2.6, volume: 0.9 });
      }
    }
    for (let i = 0; i < this.taps.length; i++) {
      const tp = this.taps[i];
      const on = !!state[tp.def.name];
      tp.mesh.visible = on;
      if (!on) continue;
      const w = 1 + 0.25 * Math.sin(t * 41 + i * 2) + 0.1 * Math.sin(t * 17);
      tp.mesh.scale.x = w; tp.mesh.scale.z = w;
      if (tp === this.rustTap && this.rustT > 0) {
        tp.mat.color.copy(this.rustColor);
        tp.mat.opacity = 0.62;
      } else if (tp.mat.opacity !== 0.5) { tp.mat.color.copy(this.clearColor); tp.mat.opacity = 0.5; }
    }
  }

  // ------------------------------------------------------------------ ноутбук
  setLaptopScreen(on) {
    const scr = this.g.world.named.get('laptop47')?.parts?.screen;
    if (!scr) return;
    if (on) scr.material.color.setRGB(0.3, 0.5, 0.64);
    else scr.material.color.setRGB(TV_OFF[0], TV_OFF[1], TV_OFF[2]);
  }

  laptopAction() {
    const g = this.g;
    const p = this.gs.prop('home_laptop');
    if (p.on === false) {
      p.on = true;
      this.setLaptopScreen(true);
      this.sound('switch', { pos: { x: -0.3, y: 0.8, z: -8.05 }, volume: 0.6 });
    }
    this.laptopSleep = 0;
    if (this.canSend()) {
      p.sent = true;
      const late = (this.gs.data.chapter || 1) >= 2;
      g.chats.sendPlayer('irina', 'Ирина, добрый вечер! Отправляю то, что готово: 31 из 48 страниц ЦНС-60. Остальное постараюсь к утру 🙏');
      g.chats.runInline('irina', [
        { from: 'irina', text: late ? 'Кирилл, получила, спасибо! Заказчик ждёт вторую половину 😊' : 'Получила! Спасибо, Кирилл 😊 Остальное до 9:00, пожалуйста, заказчик очень просит' },
        { from: 'irina', text: 'Главное — не пропадайте со связи!' },
      ], { delay: 4 });
      this.sound('send', { bus: 'ui' });
      this.think('Отправил то, что успел: 31 из 48 страниц. Лучше, чем ничего.', 4.5);
      return;
    }
    p.read = true;
    let head;
    if (p.sent) head = '[Отправлено Ирине: 31 из 48 страниц]';
    else if (g.chats.signal > 0) head = 'Интернета нет — только мобильная связь на телефоне.\nГотовую часть можно отправить Ирине сообщением.';
    else head = 'Нет подключения к интернету.';
    g.reader.show({ screen: true, title: 'ЦНС-60_перевод.docx', text: `${head}\n\n— — —\n\n4.2. Перед пуском насоса убедитесь, что запорная арматура на всасывающей линии открыта…\n4.3. Запрещается эксплуатация агрегата при посторонних шумах и стуках в проточной части.\n\n[переведено 31 из 48 страниц]\n\nДедлайн — 9:00. Ирине, кажется, всё равно, что дом оцеплен.` });
  }

  updateLaptop(dt) {
    const p = this.gs.prop('home_laptop');
    if (p.on === false) return;
    if (this.g.rooms.current !== 'room47') {
      this.laptopSleep += dt;
      if (this.laptopSleep > 25) { p.on = false; this.setLaptopScreen(false); }
    } else this.laptopSleep = 0;
  }

  // ------------------------------------------------------------------ стиральная машина
  washerAction() {
    const w = this.gs.prop('home_washer');
    if (w.state === 'run') { this.think('Барабан крутится. Лучше не мешать.', 2.5); return; }
    if (w.state === 'done') {
      w.state = 'idle'; w.p = 0;
      this.sound('door_open', { pos: { x: 2.2, y: 0.5, z: -1.7 }, creak: false, volume: 0.5 });
      this.think('Футболка тёплая и чистая. Пахнет порошком, а не дезинфекцией — почти как раньше.', 5);
      return;
    }
    if (!this.power.apartment) { this.think('Индикаторы не горят. Света нет.'); return; }
    w.state = 'run'; w.p = 0;
    this.sound('switch', { pos: { x: 2.2, y: 0.8, z: -1.7 } });
    this.think('Бросил в барабан футболку и джинсы. Загорелся индикатор — пошла вода.', 4);
  }

  updateWasher(dt) {
    const w = this.gs.prop('home_washer');
    if (w.state === 'run' && this.power.apartment) {
      w.p += dt;
      if (w.p >= WASH_SECONDS) {
        w.state = 'done';
        this.sound('hm_beep', { pos: { x: 2.2, y: 0.9, z: -1.7 } });
        this.bus.emit('hud:toast', { text: 'Стирка закончена' });
      }
    }
  }

  // ------------------------------------------------------------------ звуковые петли
  want(id, name, cond, opts) {
    const a = this.g.audio;
    const has = a.hasLoop(id);
    if (cond && !has) a.loop(id, name, opts);
    else if (!cond && has) a.stopLoop(id, 0.5);
  }

  syncLoops() {
    const a = this.g.audio;
    if (!a.ready) return;
    const p = this.g.player.pos;
    const near = (x, z, r) => Math.abs(p.x - x) < r && Math.abs(p.z - z) < r;
    const gs = this.gs;
    // чайник
    const k = gs.prop('kettle');
    const boiling = k.state === 'boil' && this.power.apartment && near(4, -5, 16);
    this.want('home_kettle', 'hm_kettle', boiling, { bus: 'sfx', pos: KETTLE_POS, volume: 0.1, ref: 0.9, rolloff: 1.6 });
    if (boiling) {
      const v = 0.15 + 0.85 * Math.min(1, k.p / BOIL_SECONDS);
      if (Math.abs(v - this.kettleVol) > 0.04) { this.kettleVol = v; a.loops.get('home_kettle')?.setVolume(v, 0.6); }
    }
    // телевизоры
    for (const tv of this.tvs) {
      const on = gs.prop(tv.id).on && this.tvPowered(tv) && near(tv.pos.x, tv.pos.z, 14);
      this.want(tv.id, 'hm_tv', on, { bus: 'sfx', pos: tv.pos, volume: 0.9, ref: 1.0, rolloff: 1.5 });
    }
    // краны
    const taps = gs.prop('home_taps');
    for (const tp of this.taps) {
      this.want(`home_${tp.def.id}`, 'hm_water', !!taps[tp.def.name] && near(tp.pos.x, tp.pos.z, 10), { bus: 'sfx', pos: tp.pos, volume: tp.def.vol, ref: 0.8, rolloff: 1.8 });
    }
    // стиральная машина
    const w = gs.prop('home_washer');
    this.want('home_washer', 'hm_washer', w.state === 'run' && this.power.apartment && near(2.2, -1.4, 12), { bus: 'sfx', pos: { x: 2.2, y: 0.6, z: -1.42 }, volume: 0.8, ref: 0.9, rolloff: 1.7 });
  }

  // ------------------------------------------------------------------ цикл
  update(dt) {
    this.time += dt;
    this.updateKettle(dt);
    this.updateFridge(dt);
    for (const tv of this.tvs) this.updateTV(tv, dt);
    this.updateTaps(dt);
    this.updateLaptop(dt);
    this.updateWasher(dt);
    this.syncTimer -= dt;
    if (this.syncTimer <= 0) { this.syncTimer = 0.5; this.syncLoops(); }
  }

  /** После старта игры или загрузки: заново применить визуальное состояние и перезапустить звуки */
  restore() {
    const a = this.g.audio;
    for (const id of ['home_kettle', 'home_washer', ...this.tvs.map((t) => t.id), ...this.taps.map((t) => `home_${t.def.id}`)]) a.stopLoop(id, 0.1);
    this.kettleVol = -1;
    this.steamK = 0;
    for (const s of this.steam) s.visible = false;
    this.fridgeT = 0;
    this.fridgeSlab.visible = this.fridgeFloor.visible = false;
    for (const tv of this.tvs) { tv.shown = null; tv.glitch = 0; tv.lineT = 4 + Math.random() * 4; tv.halo.visible = false; }
    this.rustT = 0; this.rustTap = null; this.whisperT = 0;
    for (const tp of this.taps) { tp.mesh.visible = false; tp.mat.color.copy(this.clearColor); tp.mat.opacity = 0.5; }
    const lp = this.gs.prop('home_laptop');
    this.setLaptopScreen(lp.on !== false);
    this.laptopSleep = 0;
    this.syncTimer = 0;
  }
}

/** Мягкое радиальное пятно для пара, свечения экрана и света холодильника */
function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
