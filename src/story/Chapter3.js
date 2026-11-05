// Глава 3 «Десятый этаж»: подъём по срезанной решётке, поиск живой Лизы среди голосов за тремя дверями,
// погоня, если открыть не ту, и встреча со «своими» на лестнице.
import * as THREE from 'three';
import { HumanoidModel } from '../npc/HumanoidModel.js';
import { RADIO10_LINES } from '../data/chapter3.js';
import { boxGeo } from '../world/geometry.js';

const HIT_MAT = new THREE.MeshBasicMaterial({ visible: false });
const LANDING = { x: 12.2, z: 90 };
const DOOR_X = { 1: -8, 2: -4, 3: 0 };

export class Chapter3 {
  constructor(game) {
    this.g = game;
    this.busy = false;
    this.chase = null;
    this.radioT = null;
    this.lisaFollow = false;
    const lambert = game.sm.profile.lambert;
    this.lisa = new HumanoidModel({ height: 1.63, build: 0.88, skin: 0xe2c2ab, hair: 0x2a1c26, hairStyle: 'long', top: 0x6c5a7c, bottom: 0x2a2a30, extra: ['hoodie'] }, { lambert });
    // «Свой»: безликая фигура в военной форме и противогазе (вариант эха — без черт лица)
    this.soldier = new HumanoidModel({ height: 1.86, build: 0.95, skin: 0x1c1e1c, hair: 0x0c0d0c, hairStyle: 'none_echo', top: 0x353c2e, bottom: 0x262b22, extra: [] }, { lambert, echo: true });
    this.addGasMask(this.soldier);
    for (const m of [this.lisa, this.soldier]) { m.root.visible = false; game.sm.scene.add(m.root); }
    this.lisaHit = this.makeHit('npc:lisa');
    this.lisaPos = { x: 0, z: 92 };
    this.lisaYaw = Math.PI;
  }

  addGasMask(model) {
    const head = model.head;
    if (!head) return;
    const rubber = new THREE.MeshStandardMaterial({ color: 0x1a1c19, roughness: 0.6 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x0b0d0e, roughness: 0.05, metalness: 0.8 });
    const r = model.headR || 0.11;
    const face = new THREE.Mesh(new THREE.SphereGeometry(r * 1.02, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), rubber);
    face.rotation.x = Math.PI / 2;
    face.position.set(0, r * 0.95, r * 0.12);
    const filter = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.32, r * 0.38, r * 0.7, 12), rubber);
    filter.rotation.x = Math.PI / 2.4;
    filter.position.set(0, r * 0.45, r * 1.05);
    head.add(face, filter);
    for (const s of [-1, 1]) {
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.26, r * 0.26, r * 0.12, 14), glass);
      lens.rotation.x = Math.PI / 2;
      lens.position.set(s * r * 0.38, r * 1.12, r * 0.92);
      head.add(lens);
    }
  }

  makeHit(id) {
    const h = new THREE.Mesh(boxGeo(0.6, 1.7, 0.6), HIT_MAT);
    h.userData.hitId = id;
    h.position.y = 0.85;
    this.g.sm.scene.add(h);
    this.g.interaction.addHit(h);
    return h;
  }

  get gs() { return this.g.gs; }
  get ctx() { return this.g.storyCtx; }
  get active() { return this.gs.data.chapter === 3; }
  flag(n) { return this.gs.flag(n); }
  set(n, v = true) { this.gs.setFlag(n, v); }
  say(text, duration = 4.5, who = '') { this.g.bus.emit('subtitle', { who, text, duration }); }
  sound(name, opts = {}) { this.g.bus.emit('sound:play', { name, ...opts }); }

  pickRealDoor() { if (!this.flag('c3_real')) this.set('c3_real', 1 + Math.floor(Math.random() * 3)); }

  restore() {
    this.chase = null; this.busy = false; this.radioT = null;
    const f = this.gs.data.flags;
    this.lisaFollow = this.active && !!f.c3_lisa_saved;
    this.lisa.root.visible = this.lisaFollow;
    this.soldier.root.visible = false;
    if (this.lisaFollow) { this.lisaPos = { x: this.g.player.pos.x + 1, z: this.g.player.pos.z }; }
    if (this.active) {
      // Открытые ранее двери остаются открытыми
      for (const n of [1, 2, 3]) if (f[`c3_open_${n}`] || (f.c3_lisa_saved && f.c3_real === n)) { const st = this.gs.door(`d10s${n}`); st.open = true; st.locked = false; this.g.world.getDoor(`d10s${n}`).snap(); }
    }
  }

  // ------------------------------------------------------------ взаимодействия
  resolve(id) {
    if (!this.active) return null;
    if (!this._h) this._h = this.handlers();
    return this._h[id] || null;
  }

  handlers() {
    const g = this.g;
    const lisaDoor = (n) => ({
      label: () => {
        if (this.busy || g.dialogue.isActive) return null;
        if (this.flag(`c3_open_${n}`)) return null;
        if (this.flag('c3_lisa_saved') && this.flag('c3_real') === n) return null;
        return 'Постучать';
      },
      sub: () => (this.flag('c3_lisa_saved') ? null : 'дверь 47'),
      action: () => {
        this.sound('knock', { pos: { x: DOOR_X[n], y: 1.2, z: 91.3 }, count: 3 });
        setTimeout(() => {
          this.sound('babble', { bus: 'voice', pos: { x: DOOR_X[n], y: 1.5, z: 91.9 }, pitch: 225, duration: 1.6, muffled: true, volume: 0.8 });
          this.narrate(`lisa_door_${n}`);
        }, 1400);
      },
    });
    return {
      grate_up: {
        label: () => (this.busy ? null : 'Подняться по срезанной решётке'),
        important: () => true,
        action: () => this.climb(),
      },
      'door:d10s1': lisaDoor(1),
      'door:d10s2': lisaDoor(2),
      'door:d10s3': lisaDoor(3),
      'door:d10n1': this.knockBack('d10n1', -8, 88.7),
      'door:d10n2': this.knockBack('d10n2', -4, 88.7),
      'door:d10n3': {
        label: () => 'Заглянуть в прихожую',
        action: () => {
          this.ctx.clue('replica');
          this.say('Моя прихожая. Мои куртки, мои ботинки у порога. В зеркале — пустая вешалка. И меня в нём нет.', 6);
          this.sound('sting', { bus: 'music', base: 47, duration: 4 });
        },
      },
      c3_replica: { label: () => null, action: () => {} },
      'door:d10s4': {
        label: () => 'Постучать',
        action: () => {
          this.sound('knock', { pos: { x: 4, y: 1.2, z: 91.3 }, count: 3 });
          setTimeout(() => {
            this.sound('babble', { bus: 'voice', pos: { x: 4, y: 1.5, z: 91.9 }, pitch: 130, duration: 1.8, muffled: true });
            this.say('«Кто там? …Я дома. Я всегда был дома».', 4, 'Твой голос');
          }, 1500);
        },
      },
      'door:d10s5': {
        label: () => 'Дверь 52',
        action: () => {
          this.sound('vibrate', { pos: { x: 8, y: 1, z: 92 }, pulses: 3, volume: 0.9 });
          this.say('Опечатано — той же печатью, что внизу. За дверью вибрирует телефон.');
        },
      },
      c3_notice: {
        label: () => 'Доска объявлений',
        action: () => { this.ctx.clue('list10'); g.reader.show({ title: 'Доска объявлений, 10 этаж', text: 'ВНИМАНИЕ! Вывод жителей 10 этажа — 09:00. Ждите у дверей. Открывайте на «СВОИ».\n\n— — —\n\nСПИСОК\nкв. 47 — Ермаков К. А.\nкв. 47 — Ермаков К. А.\nкв. 47 — Ермаков К. А.\nкв. 47 — Гончар Е.\n\nПоследняя строка написана другой ручкой. Гончар — фамилия Лизы.' }); },
      },
      c3_window: {
        label: () => 'Посмотреть в окно',
        action: () => this.say('За стеклом — ровная белёсая пустота. Ни двора, ни соседних домов, ни неба. Как будто дом стоит внутри чистого листа.', 6),
      },
      c3_radio: {
        label: () => (this.radioT ? null : 'Рация на полу'),
        action: () => { this.radioT = { i: -1, t: 0.4 }; this.ctx.clue('radio10'); },
      },
      c3_stairs_down: {
        label: () => (this.busy ? null : this.flag('c3_lisa_saved') ? 'Спуститься с Лизой на шестой' : 'Спуститься на шестой'),
        important: () => this.flag('c3_lisa_saved'),
        action: () => this.toStairs(),
      },
      'npc:lisa': {
        label: () => (this.lisa.root.visible && !g.dialogue.isActive ? 'Лиза' : null),
        action: () => this.narrate('lisa_follow'),
      },
    };
  }

  knockBack(id, x, z) {
    return {
      label: () => 'Постучать',
      action: () => {
        this.sound('knock', { pos: { x, y: 1.2, z: z + 0.5 }, count: 3 });
        setTimeout(() => {
          this.sound('knock', { pos: { x, y: 1.2, z: z - 0.4 }, count: 3, volume: 0.6 });
          this.g.bus.emit('caption:sound', { text: '[изнутри стучат в ответ. Ровно три раза]' });
        }, 1900);
      },
    };
  }

  narrate(graph, onEnd) {
    const g = this.g;
    if (g.dialogue.isActive) return;
    g.player.locked = true;
    g.interaction.enabled = false;
    g.dialogue.start(graph, { onEnd: () => { g.player.locked = false; g.interaction.enabled = true; g.cam.focus = null; onEnd?.(); } });
  }

  // ------------------------------------------------------------ перемещения
  async climb() {
    const g = this.g;
    if (this.busy) return;
    this.busy = true;
    g.player.locked = true;
    this.sound('door_open', { pos: { x: 12.9, y: 1, z: -1.3 }, creak: true });
    await g.hud.fade(true, 'Седьмой. Решётка срезана — края ещё блестят.\nВосьмой. Девятый.\nЕщё один пролёт. Которого не должно быть.');
    g.player.pos.set(LANDING.x, 0, LANDING.z);
    g.cam.yaw = Math.PI / 2; g.cam.pitch = 0;
    g.rooms.update(0.3, g.player.pos);
    await wait(2800);
    g.hud.fade(false);
    g.player.locked = false;
    this.busy = false;
  }

  async openLisaDoor(n) {
    const g = this.g;
    const st = this.gs.door(`d10s${n}`);
    st.locked = false; st.open = true;
    g.world.getDoor(`d10s${n}`).apply();
    this.sound('lock', { pos: { x: DOOR_X[n], y: 1, z: 91.2 } });
    setTimeout(() => this.sound('door_open', { pos: { x: DOOR_X[n], y: 1.2, z: 91.1 } }), 300);
    if (this.flag('c3_real') === n) {
      this.set('c3_lisa_saved');
      g.quests.objective('c3_main', 'find');
      this.lisaPos = { x: DOOR_X[n], z: 91.7 };
      this.lisaYaw = Math.PI;
      this.lisa.root.visible = true;
      await wait(1500);
      g.cam.focus = { target: new THREE.Vector3(DOOR_X[n], 1.5, 91.7), speed: 3 };
      this.narrate('lisa_found', () => { this.lisaFollow = true; });
      g.rel.adjust('lisa', { trust: 30 });
      return;
    }
    // Не та дверь: в темноте прихожей кто-то стоит — и бросается
    this.set(`c3_open_${n}`);
    this.gs.inc('c3_wrong');
    const e = g.npcs.echo;
    g.npcs.setAnomaly(null);
    e.root.visible = true; e.setLayer(0);
    e.root.position.set(DOOR_X[n], 0, 92.0);
    e.root.rotation.y = Math.PI;
    g.npcs.echoSpot = 'chase10';
    await wait(900);
    this.sound('hit', { bus: 'music', volume: 1.1 });
    this.sound('whisper', { pos: { x: DOOR_X[n], y: 1.6, z: 91.4 }, duration: 1.2, volume: 1.2 });
    g.cam.addShake(1);
    g.hud.damage(true);
    setTimeout(() => g.hud.damage(false), 900);
    this.set('f10_dark');
    setTimeout(() => this.set('f10_dark', false), 700);
    // Оно замирает в проёме на полторы секунды — у игрока есть фора
    this.chase = { speed: 1.7, retries: this.chase?.retries || 0, delay: 1.6 };
    g.bus.emit('hud:objective', { text: 'Беги на лестницу. Оно не выходит из коридора.', title: 'Десятый этаж' });
  }

  async toStairs() {
    const g = this.g;
    if (this.busy) return;
    if (this.chase) { this.say('Не сейчас — сначала уйти от него.', 2); return; }
    if (!this.flag('c3_answer')) {
      // На верхней ступени — «свой»
      this.soldier.root.visible = true;
      this.soldier.root.position.set(13.35, -0.34, 90.0);   // на второй ступени марша вниз
      this.soldier.root.rotation.y = -Math.PI / 2;
      this.sound('steps_far', { pos: { x: 13.5, y: -0.4, z: 90 }, count: 3, interval: 0.6 });
      this.sound('sting', { bus: 'music', base: 41, duration: 6 });
      await wait(900);
      g.cam.focus = { target: new THREE.Vector3(13.35, 1.35, 90), speed: 3 };
      this.narrate('c3_soldier');
      return;
    }
    this.descend();
  }

  async answerSoldier(a) {
    const g = this.g;
    this.set('c3_answer', a);
    if (a === 'name') {
      this.set('echo_has_voice');
      this.say('«Кирилл Ермаков, сорок седьмая», — повторяет он. Твоим голосом. И отступает в сторону.', 5);
    } else if (a === 'silent') {
      this.say('Он наклоняет голову. Долго. Потом медленно отступает к стене — как будто тебя здесь нет.', 5);
      g.bus.emit('lights:flicker', { circuit: 'f10', duration: 1.2 });
    } else if (a === 'password') {
      this.say('«Свои», — отвечает он. Позади, в коридоре, одна за другой щёлкают замки всех дверей сорок семь.', 5);
      for (let i = 0; i < 5; i++) setTimeout(() => this.sound('lock', { pos: { x: -8 + i * 4, y: 1, z: 90 } }), 600 + i * 350);
    } else if (a === 'tape') {
      this.sound('babble', { bus: 'voice', pos: { x: g.player.pos.x, y: 1.2, z: g.player.pos.z }, pitch: 96, duration: 3, volume: 0.7 });
      this.say('«…Стучат. Коля, ты слышишь? Три раза». Он поворачивает голову к катушке — и замирает. Совсем, как выключенный.', 6, 'Плёнка');
    }
    await wait(2600);
    this.descend();
  }

  async descend() {
    const g = this.g;
    if (this.busy) return;
    this.busy = true;
    g.player.locked = true;
    await g.hud.fade(true, this.flag('c3_lisa_saved') ? 'Вниз. Лиза держится за твой рукав.\nДевятый. Восьмой. Седьмой.\nШестой — с табличкой.' : 'Вниз. Девятый. Восьмой. Седьмой.\nЗа спиной кто-то идёт — шаг в шаг.');
    this.soldier.root.visible = false;
    g.player.pos.set(12.1, 0, -0.6);
    g.cam.yaw = Math.PI / 2; g.cam.pitch = 0;
    if (this.lisaFollow) this.lisaPos = { x: 12.3, z: 0.7 };
    g.rooms.update(0.3, g.player.pos);
    this.set('c3_down');
    g.quests.objective('c3_main', 'back');
    if (!this.flag('c3_lisa_saved')) g.chats.runSequence('c3_lost');
    await wait(1600);
    g.hud.fade(false);
    g.player.locked = false;
    this.busy = false;
  }

  // ------------------------------------------------------------ кадр
  update(dt) {
    if (!this.active) return;
    const g = this.g;
    // Туман на десятом гуще — за окнами и в конце коридора пустота
    const fogTarget = g.rooms.level === 'f10' ? 0.11 : 0.075;
    const fog = g.sm.scene.fog;
    if (Math.abs(fog.density - fogTarget) > 0.001) fog.density += (fogTarget - fog.density) * Math.min(1, dt * 2);
    if (this.radioT) this.updateRadio(dt);
    if (this.chase) this.updateChase(dt);
    if (this.lisa.root.visible) this.updateLisa(dt);
    if (this.soldier.root.visible) this.soldier.update(dt, { speed: 0, talking: false, lookAt: null, activity: 'idle', headTilt: 0.15 });
  }

  updateLisa(dt) {
    const p = this.g.player.pos;
    let speed = 0;
    if (this.lisaFollow && !this.g.dialogue.isActive) {
      const dx = p.x - this.lisaPos.x, dz = p.z - this.lisaPos.z;
      const d = Math.hypot(dx, dz);
      if (d > 6 && !this.busy) { this.lisaPos = { x: p.x - 1, z: p.z }; }   // отстала за поворотом — догоняет
      else if (d > 1.3) {
        const sp = Math.min(3.2, (d - 1.1) * 2.5);
        const [nx, nz] = this.g.physics.move(this.lisaPos.x, this.lisaPos.z, (dx / d) * sp * dt, (dz / d) * sp * dt, 0.25, 'lisa');
        speed = Math.hypot(nx - this.lisaPos.x, nz - this.lisaPos.z) / Math.max(dt, 1e-4);
        this.lisaPos.x = nx; this.lisaPos.z = nz;
        this.lisaYaw = Math.atan2(dx, dz);
      }
    }
    this.lisa.root.position.set(this.lisaPos.x, 0, this.lisaPos.z);
    this.lisa.root.rotation.y = this.lisaYaw;
    this.lisaHit.position.set(this.lisaPos.x, 0.85, this.lisaPos.z);
    const talking = this.g.dialogue.isActive && ['lisa_found', 'lisa_follow'].includes(this.g.dialogue.active?.npc);
    this.lisa.update(dt, { speed, talking, lookAt: this.g.player.eye, activity: 'idle' });
  }

  updateRadio(dt) {
    const R = this.radioT;
    R.t -= dt;
    if (R.t > 0) return;
    R.i++;
    const line = RADIO10_LINES[R.i];
    if (!line) { this.radioT = null; return; }
    R.t = 3.4;
    this.sound('static', { pos: { x: 9.6, y: 0.3, z: 89.6 }, duration: 0.5 });
    this.sound('babble', { bus: 'voice', pos: { x: 9.6, y: 0.3, z: 89.6 }, pitch: 105, duration: 2.4, volume: 0.6 });
    this.say(line, 3.2, 'Рация');
  }

  updateChase(dt) {
    const g = this.g;
    const C = this.chase;
    const e = g.npcs.echo.root;
    const p = g.player.pos;
    // На лестницу оно не выходит: замирает в конце коридора и растворяется
    if (g.rooms.current === 'landing10' || g.rooms.level !== 'f10') {
      C.fade = (C.fade || 0) + dt;
      if (C.fade > 1.6) { g.npcs.setAnomaly(null); this.chase = null; this.say('Оно стоит в конце коридора. Дальше не идёт. Потом его просто нет.', 4); }
      return;
    }
    if (C.delay > 0) { C.delay -= dt; return; }
    C.speed = Math.min(2.45, C.speed + dt * 0.06);
    const dx = p.x - e.position.x, dz = p.z - e.position.z;
    const d = Math.hypot(dx, dz) || 1;
    const step = Math.min(d, C.speed * dt);
    const [nx, nz] = g.physics.move(e.position.x, e.position.z, (dx / d) * step, (dz / d) * step, 0.28, 'echo');
    e.position.x = nx; e.position.z = nz;
    e.rotation.y = Math.atan2(dx, dz);
    C.stepT = (C.stepT || 0) - dt;
    if (C.stepT <= 0) { C.stepT = 0.4; this.sound('footstep', { pos: { x: nx, y: 0.05, z: nz }, surface: 'tile', run: true }); }
    if (d < 0.85) this.caught();
  }

  async caught() {
    const g = this.g;
    if (!this.chase || this.chase.frozen) return;
    this.chase.frozen = true;
    const e = g.npcs.echo.root;
    const head = new THREE.Vector3(e.position.x, 1.85, e.position.z);
    const fwd = new THREE.Vector3(Math.sin(e.rotation.y), 0, Math.cos(e.rotation.y));
    const camPos = head.clone().addScaledVector(fwd, 0.42);
    g.cam.override = { position: camPos, quaternion: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(camPos, head, new THREE.Vector3(0, 1, 0))), fov: 48 };
    g.player.locked = true;
    this.sound('hit', { bus: 'music', volume: 1.2 });
    g.cam.addShake(1.2);
    g.hud.damage(true);
    await wait(1000);
    await g.hud.fade(true, 'Ты не успел.');
    g.cam.override = null;
    g.hud.damage(false);
    g.npcs.setAnomaly(null);
    this.chase = null;
    g.player.pos.set(LANDING.x, 0, LANDING.z);
    g.cam.yaw = Math.PI / 2;
    g.rooms.update(0.3, g.player.pos);
    await wait(1000);
    g.hud.fade(false);
    g.player.locked = false;
    g.bus.emit('hud:toast', { text: 'Оно осталось в коридоре. Можно попробовать другую дверь.' });
  }
}

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
