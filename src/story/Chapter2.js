// Глава 2 «Котельная»: лифт в подвал, котельная, «Объект 17», выбор у резонатора и погоня обратно к лифту.
// Перехватывает взаимодействия своей главы (resolve) и ведёт собственные сцены в update().
import * as THREE from 'three';
import { LIFT_DELTA } from '../data/basement.js';
import { TAPE_LINES } from '../data/chapter2.js';
import { LAB_STATE } from '../world/PropsBasement.js';
import { HumanoidModel } from '../npc/HumanoidModel.js';
import { boxGeo } from '../world/geometry.js';

const HIT_MAT = new THREE.MeshBasicMaterial({ visible: false });
const OPENING = { up: { x: 5.45, z: -3.47 }, down: { x: 5.45, z: 41.13 } };
const SANYCH_POS = { x: -12.4, z: 60.75 };

export class Chapter2 {
  constructor(game) {
    this.g = game;
    this.doors = { up: 0, down: 0 };          // 0 — закрыты, 1 — открыты
    this.doorTarget = { up: 0, down: 0 };
    this.busy = false;                         // идёт сцена (поездка, спуск)
    this.chase = null;
    this.tape = null;
    this.walkieT = 0;
    this.time = 0;
    // Закрытые створки лифта — препятствие для игрока
    game.physics.addProvider(() => {
      const out = [];
      for (const k of ['up', 'down']) {
        if (this.doors[k] < 0.75) { const o = OPENING[k]; out.push({ minX: o.x - 0.5, maxX: o.x + 0.5, minZ: o.z - 0.07, maxZ: o.z + 0.07, lift: k }); }
      }
      return out;
    });
    this.buildSanych();
  }

  get gs() { return this.g.gs; }
  get ctx() { return this.g.storyCtx; }
  get active() { return this.gs.data.chapter === 2; }
  flag(n) { return this.gs.flag(n); }
  set(n, v = true) { this.gs.setFlag(n, v); }
  say(text, duration = 4.5, who = '') { this.g.bus.emit('subtitle', { who, text, duration }); }
  sound(name, opts = {}) { this.g.bus.emit('sound:play', { name, ...opts }); }

  buildSanych() {
    this.sanych = new HumanoidModel({ height: 1.7, build: 1.12, skin: 0xc49a80, hair: 0x8f8a82, hairStyle: 'short', top: 0x3a3a2a, bottom: 0x23241f, extra: ['mustache'], stoop: 0.12 }, { lambert: this.g.sm.profile.lambert });
    this.sanych.root.position.set(SANYCH_POS.x, 0, SANYCH_POS.z);
    this.sanych.root.rotation.y = Math.PI;
    this.sanych.root.visible = false;
    this.g.sm.scene.add(this.sanych.root);
    this.sanychHit = new THREE.Mesh(boxGeo(0.6, 1.7, 0.6), HIT_MAT);
    this.sanychHit.position.set(SANYCH_POS.x, 0.85, SANYCH_POS.z);
    this.sanychHit.userData.hitId = 'npc:sanych';
    this.g.sm.scene.add(this.sanychHit);
    this.g.interaction.addHit(this.sanychHit);
  }

  /** Состояние сцены после начала главы или загрузки сохранения */
  restore() {
    const f = this.gs.data.flags;
    this.chase = null; this.tape = null; this.busy = false;
    this.g.npcs.setAnomaly(null);
    const carDown = !!f.c2_car_down;
    this.doors.up = this.doorTarget.up = f.lift_power && !carDown ? 1 : 0;
    this.doors.down = this.doorTarget.down = carDown ? 1 : 0;
    this.sanych.root.visible = this.active && !f.c2_sanych_gone;
    if (LAB_STATE.crystalMat) LAB_STATE.crystalMat.color.setHex(f.resonator_off ? 0x14151c : 0x6a74a8);
    const lever = this.g.world.named.get('resonator')?.parts.lever;
    if (lever) lever.rotation.x = f.resonator_off ? 0.6 : -0.5;
    if (this.active && f.zina_missing) {
      for (const id of ['L_zina', 'L_zina_hall']) if (!this.gs.data.world.brokenLamps.includes(id)) this.gs.data.world.brokenLamps.push(id);
    }
    // Если сохранились посреди погони — начинаем погоню заново от пульта
    if (this.active && f.c2_outcome && !f.c2_escaped) setTimeout(() => this.startChase(), 1200);
  }

  // ------------------------------------------------------------ взаимодействия
  resolve(id) {
    if (!this.active) return null;
    const H = this.handlers();
    return H[id] || null;
  }

  handlers() {
    if (this._h) return this._h;
    const g = this.g;
    const inv = g.inventory;
    this._h = {
      panel: {
        label: () => (this.flag('c2_know_lift') && !this.flag('lift_power') ? 'Включить питание лифта' : 'Электрощиток ЩЭ-6'),
        important: () => this.flag('c2_know_lift') && !this.flag('lift_power'),
        hold: () => (this.flag('c2_know_lift') && !this.flag('lift_power') ? 1.2 : 0),
        action: () => {
          if (!this.flag('c2_know_lift')) { this.say('Щиток. Рядом с автоматом этажа — тумблер с надписью «ЛИФТ», опломбированный.'); return; }
          if (this.flag('lift_power')) { this.say('Тумблер «ЛИФТ» включён. В шахте ровно гудит.'); return; }
          this.powerLift();
        },
      },
      lift_button: {
        label: () => (this.flag('lift_power') ? (this.doors.up > 0.5 ? null : 'Вызвать лифт') : 'Вызвать лифт'),
        action: () => {
          this.sound('switch', { pos: { x: 6.1, y: 1.2, z: -3.3 } });
          if (!this.flag('lift_power')) { this.say('Кнопка не горит. Сначала питание на щитке.'); return; }
          if (this.flag('c2_car_down')) { this.say('Лифт внизу. Где-то в шахте лязгнули тросы — и всё стихло.'); return; }
          this.doorTarget.up = 1; this.sound('door_open', { pos: { x: 5.45, y: 1.2, z: -3.4 }, creak: false });
        },
      },
      lift_panel: {
        label: () => (this.busy ? null : 'Зажать «Стоп» и «П»'),
        important: () => true,
        action: () => this.rideDown(),
      },
      lift_panel_b: {
        label: () => {
          if (this.busy) return null;
          if (this.liftDead()) return this.doors.down > 0.2 ? 'Сдвинуть створки руками' : 'Кнопки не горят';
          return 'Нажать «6»';
        },
        hold: () => (this.liftDead() && this.doors.down > 0.2 ? 1.3 : 0),
        important: () => !!this.chase,
        action: () => {
          if (this.liftDead()) {
            if (this.doors.down > 0.2) { this.doorTarget.down = 0; this.sound('door_close', { pos: { x: 5.45, y: 1, z: 41.1 } }); this.say('Створки поддались. Теперь — ждать, пока дадут питание.'); this.waitPower(); }
            else this.say('Кнопки мёртвые. Лапин отключил лифт, как и обещал.');
            return;
          }
          this.rideUp();
        },
      },
      lift_call_b: {
        label: () => (this.doors.down > 0.5 ? null : 'Вызвать лифт'),
        action: () => { if (!this.liftDead()) { this.doorTarget.down = 1; this.sound('door_open', { pos: { x: 5.45, y: 1.2, z: 41.2 }, creak: false }); } else this.say('Не горит.'); },
      },
      'door:d3': {
        label: () => {
          const st = this.gs.door('d3');
          if (st.locked) return inv.has('key_boiler') ? 'Отпереть дверь 3' : inv.has('crowbar') ? 'Отжать дверь монтировкой' : 'Дверь 3 (заперта)';
          return st.open ? 'Закрыть дверь' : 'Открыть дверь';
        },
        hold: () => (this.gs.door('d3').locked && !inv.has('key_boiler') && inv.has('crowbar') ? 2.2 : 0),
        action: () => {
          const st = this.gs.door('d3');
          const door = g.world.getDoor('d3');
          if (st.locked) {
            if (!inv.has('key_boiler') && !inv.has('crowbar')) { this.say('Заперто. Ключ от котельной — у Зинаиды Павловны.'); return; }
            st.locked = false;
            this.sound(inv.has('key_boiler') ? 'lock' : 'breaker', { pos: door.sidePoint(-1, 0.1) });
            g.quests.objective('c2_main', 'door3');
          }
          st.open = !st.open;
          door.apply();
          this.sound(st.open ? 'door_open' : 'door_close', { pos: door.sidePoint(1, 0.1), volume: 1.2 });
        },
      },
      zina_box: {
        label: () => (this.flag('zina_missing') && !inv.has('key_boiler') && g.rooms.current === 'room45' ? 'Ключ на серванте' : null),
        important: () => true,
        action: () => this.takeZinaKey(),
      },
      c2_sanych_torch: {
        label: () => (this.flag('took_sanych_torch') ? null : 'Фонарик на полу'),
        important: () => true,
        action: () => {
          this.set('took_sanych_torch');
          this.gs.data.player.flashBattery = 100;
          g.updateFlashlight();
          this.say('Фонарик Саныча. Ещё горит — светит на дверь котельной. Забираю его батарейки.', 5);
        },
      },
      c2_sanych_phone: {
        label: () => (inv.has('sanych_phone') ? null : 'Кнопочный телефон'),
        important: () => true,
        action: () => {
          inv.add('sanych_phone');
          for (const k of ['sanych_1', 'sanych_2', 'sanych_3']) g.gallery.ensureReceived(k, 'sanych');
          this.ctx.clue('sanych_photos');
          g.reader.show({ screen: true, title: 'Телефон Саныча', text: 'Исходящие (не отправлено):\n\n19:12 → «Тополиная 14»: это чё\n19:44 → «Тополиная 14»: не верьте мне если я поднимусь\n\nГалерея: 3 снимка (скопированы в твою «Галерею»).\n\nПоследний снят в 19:40. Саныч на нём — со спины.' });
        },
      },
      c2_cell_dog: {
        label: () => (this.flag('c2_cell_seen') ? 'Сарайка 23' : 'Приоткрытая сарайка'),
        action: () => {
          if (this.flag('c2_cell_seen')) { this.say('Пусто. Только ошейник с жетоном «ГРАФ» и запах мокрой шерсти.'); return; }
          this.set('c2_cell_seen');
          this.sound('whisper', { pos: { x: 0.2, y: 0.4, z: 42.2 }, duration: 1.2, volume: 0.7 });
          this.g.bus.emit('caption:sound', { text: '[из темноты сарайки — тихий скулёж]' });
          setTimeout(() => {
            this.sound('door_close', { pos: { x: 0.2, y: 1, z: 42.6 }, volume: 1.6 });
            this.sound('hit', { bus: 'music', volume: 0.7 });
            g.cam.addShake(0.6);
            this.say('Дверца захлопнулась сама. На полу — ошейник Графа. Застёгнутый.', 5);
            this.ctx.clue('graf');
          }, 1400);
        },
      },
      c2_chalk: {
        label: () => 'Надпись мелом',
        action: () => { this.ctx.clue('chalk'); g.reader.show({ title: 'Мелом на стене', text: 'НЕ ОТВЕЧАТЬ ИМ.\n\nОНИ НЕ ЗНАЮТ ТВОЙ ГОЛОС,\nПОКА ТЫ МОЛЧИШЬ.\n\n— П.К. 1990' }); },
      },
      c2_hatch: {
        label: () => (this.busy ? null : 'Спуститься по лестнице в люк'),
        important: () => !this.flag('c2_in_lab'),
        action: () => this.descend(),
      },
      c2_ladder: {
        label: () => (this.busy ? null : 'Подняться наверх'),
        important: () => !!this.chase,
        action: () => this.ascend(),
      },
      c2_tape: {
        label: () => (this.tape ? null : this.flag('c2_tape_heard') ? 'Перемотать и послушать ещё раз' : 'Включить магнитофон'),
        important: () => !this.flag('c2_tape_heard'),
        action: () => this.playTape(),
      },
      c2_console: {
        label: () => (this.flag('c2_outcome') ? 'Пульт резонатора' : 'Пульт резонатора «Кристалл-М»'),
        important: () => !this.flag('c2_outcome'),
        action: () => {
          if (this.flag('c2_outcome')) { this.say('Сделанного не вернуть. Бежать.'); return; }
          this.narrate('c2_console');
        },
      },
      'npc:sanych': {
        label: () => (this.sanych.root.visible && !this.flag('c2_sanych_talked') ? 'Саныч?' : null),
        action: () => this.talkSanych(),
      },
    };
    return this._h;
  }

  /** Разговор без NPC (пульт, Саныч): блокируем игрока и показываем диалог */
  narrate(graph, onEnd) {
    const g = this.g;
    if (g.dialogue.isActive) return;
    g.player.locked = true;
    g.interaction.enabled = false;
    g.dialogue.start(graph, { onEnd: () => { g.player.locked = false; g.interaction.enabled = true; g.cam.focus = null; onEnd?.(); } });
  }

  // ------------------------------------------------------------ лифт
  liftDead() { return this.flag('c2_gena_hostile') && this.flag('c2_in_basement') && !this.flag('c2_power_back'); }

  powerLift() {
    this.set('lift_power');
    this.sound('breaker', { pos: { x: 2, y: 1.6, z: -0.9 } });
    this.g.quests.objective('c2_main', 'power');
    setTimeout(() => {
      this.sound('elevator', { pos: { x: 5.45, y: 1.2, z: -3.8 }, duration: 7 });
      this.g.bus.emit('caption:sound', { text: '[в шахте ожил мотор. Лифт поднимается]' });
    }, 600);
    setTimeout(() => { this.doorTarget.up = 1; this.sound('door_open', { pos: { x: 5.45, y: 1.2, z: -3.4 }, creak: false }); }, 7200);
  }

  async rideDown() {
    const g = this.g;
    if (this.busy) return;
    this.busy = true;
    g.player.locked = true;
    this.doorTarget.up = 0;
    this.sound('door_close', { pos: { x: 5.45, y: 1, z: -3.5 } });
    g.quests.objective('c2_main', 'ride');
    await wait(1300);
    this.sound('elevator', { pos: { x: 5.45, y: 1.2, z: -4 }, duration: 7 });
    g.cam.addShake(0.25);
    if (!this.flag('c2_ride_scare')) {
      // Остановка между этажами: свет гаснет, по крыше кабины стучат три раза
      this.set('c2_ride_scare');
      await wait(2600);
      this.set('lift_dark');
      this.sound('breaker', { pos: { x: 5.45, y: 2.2, z: -4 }, volume: 0.6 });
      g.cam.addShake(0.5);
      await wait(1500);
      this.sound('knock', { pos: { x: 5.45, y: 2.6, z: -4.05 }, count: 3, volume: 1.1, interval: 0.5 });
      g.bus.emit('caption:sound', { text: '[по крыше кабины — три удара]' });
      await wait(2200);
      this.sound('whisper', { pos: { x: 5.45, y: 2.4, z: -4.05 }, duration: 1.6, volume: 0.8 });
      await wait(1400);
      this.set('lift_dark', false);
      g.cam.addShake(0.3);
    }
    await wait(1800);
    await g.hud.fade(true);
    g.player.pos.x += LIFT_DELTA.x; g.player.pos.z += LIFT_DELTA.z;
    this.set('c2_car_down'); this.set('c2_in_basement');
    this.doors.up = this.doorTarget.up = 0;
    g.rooms.update(0.3, g.player.pos);
    await wait(500);
    g.hud.fade(false);
    await wait(700);
    this.doorTarget.down = 1;
    this.sound('door_open', { pos: { x: 5.45, y: 1.2, z: 41.2 }, creak: false });
    g.player.locked = false;
    this.busy = false;
    g.bus.emit('hud:objective', { text: 'Подвал. Связи нет. Найти котельную — дверь 3.', title: 'Котельная' });
  }

  async rideUp() {
    const g = this.g;
    if (this.busy) return;
    if (this.chase && this.echoDist() < 1.4) { this.say('Не успеть — оно уже в дверях!', 2); return; }
    this.busy = true;
    g.player.locked = true;
    this.doorTarget.down = 0;
    this.sound('door_close', { pos: { x: 5.45, y: 1, z: 41.1 } });
    await wait(1200);
    if (this.chase) {
      this.chase.frozen = true;
      this.sound('knock', { pos: { x: 5.45, y: 1.3, z: 41.3 }, count: 4, volume: 1.4, interval: 0.3 });
      g.cam.addShake(0.6);
    }
    this.sound('elevator', { pos: { x: 5.45, y: 1.2, z: 40.6 }, duration: 7 });
    await wait(4200);
    await g.hud.fade(true);
    this.endChase();
    g.player.pos.x -= LIFT_DELTA.x; g.player.pos.z -= LIFT_DELTA.z;
    this.set('c2_car_down', false); this.set('c2_in_basement', false);
    this.doors.down = this.doorTarget.down = 0;
    g.rooms.update(0.3, g.player.pos);
    await wait(500);
    g.hud.fade(false);
    await wait(600);
    this.doorTarget.up = 1;
    this.sound('door_open', { pos: { x: 5.45, y: 1.2, z: -3.4 }, creak: false });
    g.player.locked = false;
    this.busy = false;
    if (this.flag('c2_outcome')) {
      this.set('c2_escaped');
      g.quests.objective('c2_truth', 'escape');
    }
  }

  waitPower() {
    if (this.powerTimer) return;
    this.powerTimer = setTimeout(() => {
      this.powerTimer = null;
      this.set('c2_power_back');
      this.sound('breaker', { pos: { x: 5.45, y: 2.3, z: 40.6 } });
      this.say('Кнопки загорелись. Кто-то наверху включил питание.', 3.5);
      this.g.chats.runInline('denis', [{ from: 'denis', text: 'включил лифт. гена ушёл с поста. давай наверх' }], { delay: 6 });
    }, 6500);
  }

  // ------------------------------------------------------------ подвал и объект
  takeZinaKey() {
    const g = this.g;
    g.inventory.add('key_boiler');
    g.quests.objective('c2_main', 'key');
    this.sound('static', { pos: { x: -6.4, y: 1, z: -4.2 }, duration: 1.6 });
    setTimeout(() => {
      this.sound('whisper', { pos: { x: g.player.pos.x, y: 1.6, z: g.player.pos.z + 0.6 }, duration: 1.4, volume: 1 });
      this.say('«Кирюша… закрой за собой»', 3.5, 'Шёпот');
      const st = this.gs.door('d45');
      st.open = false; g.world.getDoor('d45').apply();
      this.sound('door_close', { pos: { x: -8, y: 1.2, z: -1.1 }, volume: 1.6 });
      g.bus.emit('lights:flicker', { circuit: 'all', duration: 1.5 });
      g.cam.addShake(0.5);
      setTimeout(() => { st.open = true; g.world.getDoor('d45').apply(); this.sound('door_open', { pos: { x: -8, y: 1.2, z: -1.1 } }); }, 3200);
    }, 1400);
  }

  door45Opens() {
    const st = this.gs.door('d45');
    st.locked = false; st.chained = false; st.open = true;
    this.g.world.getDoor('d45').apply();
    this.sound('chain', { pos: { x: -8, y: 1.3, z: -1.3 } });
    setTimeout(() => this.sound('door_open', { pos: { x: -8, y: 1.2, z: -1.1 }, volume: 0.7 }), 600);
    this.g.bus.emit('caption:sound', { text: '[за дверью 45 сняли цепочку. Дверь медленно открылась. За ней никого]' });
  }

  async descend() {
    const g = this.g;
    if (this.busy) return;
    this.busy = true;
    g.player.locked = true;
    this.sound('footstep', { surface: 'concrete' });
    await g.hud.fade(true, this.flag('c2_in_lab') ? '' : 'Двенадцать скоб вниз.\nПотом ещё двенадцать.\nСнизу тянет теплом, как от включённого телевизора.');
    g.player.pos.set(-6.4, 0, 66.8);
    g.cam.yaw = 0; g.cam.pitch = 0;
    this.set('c2_in_lab');
    g.rooms.update(0.3, g.player.pos);
    await wait(this.flag('c2_lab_seen') ? 400 : 2600);
    this.set('c2_lab_seen');
    g.hud.fade(false);
    g.player.locked = false;
    this.busy = false;
    g.quests.start('c2_truth');
    if (this.chase) this.chase.respawnAt = { x: -8.5, z: 61.8, delay: 2.5 };
  }

  async ascend() {
    const g = this.g;
    if (this.busy) return;
    this.busy = true;
    g.player.locked = true;
    await g.hud.fade(true);
    g.player.pos.set(-5.2, 0, 49.0);
    g.cam.yaw = 0.6; g.cam.pitch = 0;
    g.rooms.update(0.3, g.player.pos);
    await wait(400);
    g.hud.fade(false);
    g.player.locked = false;
    this.busy = false;
    if (this.chase) {
      // Оно лезет следом из люка
      this.chase.respawnAt = { x: -6.4, z: 50.2, delay: 2.8 };
      this.hideEcho();
      setTimeout(() => { this.sound('knock', { pos: { x: -6.4, y: 0, z: 50.2 }, count: 3, volume: 1.2, interval: 0.35 }); this.g.bus.emit('caption:sound', { text: '[скобы лестницы звенят под чьим-то весом]' }); }, 900);
    }
  }

  async talkSanych() {
    const g = this.g;
    this.set('c2_sanych_talked');
    g.quests.objective('c2_main', 'find');
    g.cam.focus = { target: new THREE.Vector3(SANYCH_POS.x, 1.5, SANYCH_POS.z), speed: 3 };
    this.narrate('sanych_echo', async () => {
      // Скример: он оборачивается, свет гаснет — и его больше нет
      this.ctx.clue('sanych_echo');
      this.sanychTurn = 0.001;
      this.sound('sting', { bus: 'music', base: 44, duration: 5 });
      await wait(1100);
      this.set('basement_dark');
      this.sound('hit', { bus: 'music' });
      g.cam.addShake(0.9);
      g.hud.damage(true);
      await wait(1300);
      this.sanych.root.visible = false;
      this.set('c2_sanych_gone');
      g.hud.damage(false);
      this.set('basement_dark', false);
      this.say('Его нет. Только мокрые следы ведут к стене — и обрываются у неё.', 5);
    });
  }

  playTape() {
    if (this.tape) return;
    this.tape = { i: -1, t: 0.6 };
    this.sound('static', { pos: { x: -4.2, y: 1, z: 64.5 }, duration: 1 });
  }

  updateTape(dt) {
    const T = this.tape;
    T.t -= dt;
    const parts = this.g.world.named.get('tape_deck')?.parts;
    if (parts?.reelL) { parts.reelL.rotation.y += dt * 4; parts.reelR.rotation.y += dt * 5.2; }
    if (T.t > 0) return;
    T.i++;
    const line = TAPE_LINES[T.i];
    if (!line) {
      this.tape = null;
      this.set('c2_tape_heard');
      this.ctx.clue('tape_1984');
      this.g.quests.objective('c2_truth', 'tape');
      this.sound('static', { pos: { x: -4.2, y: 1, z: 64.5 }, duration: 1.5 });
      return;
    }
    const dur = Math.min(6.5, 1.4 + line.text.length * 0.055);
    T.t = dur + 0.4;
    this.sound('babble', { bus: 'voice', pos: { x: -4.2, y: 1.1, z: 64.5 }, pitch: line.pitch, duration: dur - 0.3, volume: 0.6 });
    this.g.bus.emit('subtitle', { who: `Плёнка · ${line.who}`, text: line.text, duration: dur });
  }

  // ------------------------------------------------------------ выбор и погоня
  decide(outcome) {
    const g = this.g;
    this.set('c2_outcome', outcome);
    g.quests.objective('c2_truth', 'decide');
    const lever = g.world.named.get('resonator')?.parts.lever;
    if (outcome === 'shutdown') {
      if (lever) lever.rotation.x = 0.6;
      this.set('resonator_off');
      this.sound('breaker', { pos: { x: -7.7, y: 1, z: 61.7 }, volume: 1.4 });
      if (LAB_STATE.crystalMat) LAB_STATE.crystalMat.color.setHex(0x14151c);
      this.g.bus.emit('caption:sound', { text: '[гул стихает. В наступившей тишине что-то тяжело вдыхает]' });
      g.chats.post('house', { from: 'system', sys: true, text: 'Н. Ветров (кв.52) покинул группу' });
      setTimeout(() => this.set('basement_dark'), 1200);
    } else if (outcome === 'record') {
      this.say('«Не открывайте никому. Это Кирилл».', 3, 'Вы');
      this.set('echo_has_voice');
      setTimeout(() => {
        if (LAB_STATE.crystalMat) LAB_STATE.crystalMat.color.setHex(0xffffff);
        for (const [x, z] of [[-13.5, 62], [-3.5, 66], [-8.5, 60.3]]) this.sound('babble', { bus: 'voice', pos: { x, y: 1.6, z }, pitch: 130, duration: 2.4, volume: 0.6 });
        this.g.bus.emit('subtitle', { who: 'Стены', text: '«Не открывайте никому. Это Кирилл». «Не открывайте никому. Это Кирилл». «Это Кирилл».', duration: 5 });
      }, 1600);
    } else if (outcome === 'tape') {
      g.inventory.add('tape_1984');
      this.sound('tap', { bus: 'ui' });
      this.say('Катушка тяжёлая и тёплая, будто её только что держали в руках.', 4);
    }
    setTimeout(() => this.startChase(), 3200);
  }

  startChase() {
    const g = this.g;
    if (this.chase || this.flag('c2_escaped')) return;
    this.chase = { trail: [], timer: 0, speed: 2.1, retries: this.chase?.retries || 0, frozen: false, respawnAt: null, retrySpot: { x: g.player.pos.x, z: g.player.pos.z, room: g.rooms.current } };
    this.spawnEcho(g.rooms.current === 'b_lab' ? -13.2 : -12.8, g.rooms.current === 'b_lab' ? 66.5 : 43.6);
    g.bus.emit('lights:flicker', { circuit: 'basement', duration: 2 });
    this.sound('sting', { bus: 'music', base: 38, duration: 6 });
    g.ambience.setTension(1);
    g.bus.emit('hud:objective', { text: 'Беги к лифту. Не оглядывайся.', title: 'Объект 17' });
  }

  spawnEcho(x, z) {
    const e = this.g.npcs.echo;
    this.g.npcs.setAnomaly(null);
    e.root.visible = true;
    e.setLayer(0);
    e.root.position.set(x, 0, z);
    e.root.scale.setScalar(1.05);
    this.g.npcs.echoSpot = 'chase';
    this.chase.trail.length = 0;
  }

  hideEcho() { this.g.npcs.setAnomaly(null); }

  echoDist() {
    const e = this.g.npcs.echo.root;
    if (!e.visible) return Infinity;
    return Math.hypot(e.position.x - this.g.player.pos.x, e.position.z - this.g.player.pos.z);
  }

  updateChase(dt) {
    const g = this.g;
    const C = this.chase;
    const e = g.npcs.echo.root;
    const p = g.player.pos;
    if (C.respawnAt) {
      C.respawnAt.delay -= dt;
      if (C.respawnAt.delay <= 0) { this.spawnEcho(C.respawnAt.x, C.respawnAt.z); C.respawnAt = null; this.sound('hit', { bus: 'music', volume: 0.5 }); }
      return;
    }
    if (!e.visible || C.frozen || this.busy) return;
    C.speed = Math.min(2.65, C.speed + dt * 0.02);
    // След игрока: оно идёт по нему, а при прямой видимости — напрямую
    C.timer -= dt;
    if (C.timer <= 0) {
      C.timer = 0.25;
      const last = C.trail[C.trail.length - 1];
      if (!last || Math.hypot(last.x - p.x, last.z - p.z) > 0.5) C.trail.push({ x: p.x, z: p.z });
      if (C.trail.length > 60) C.trail.shift();
    }
    let tx = p.x, tz = p.z;
    const direct = !g.physics.segmentBlocked(e.position.x, e.position.z, p.x, p.z);
    if (direct) C.trail.length = 0;
    else if (C.trail.length) {
      tx = C.trail[0].x; tz = C.trail[0].z;
      if (Math.hypot(tx - e.position.x, tz - e.position.z) < 0.4) C.trail.shift();
    }
    // Закрытая дверь котельной его не остановит — распахивает с грохотом
    const d3 = this.gs.door('d3');
    if (!d3.open && Math.hypot(e.position.x + 9, e.position.z - 44.57) < 1.3) {
      d3.open = true; d3.locked = false; g.world.getDoor('d3').apply();
      this.sound('door_close', { pos: { x: -9, y: 1, z: 44.6 }, volume: 1.8 });
      g.cam.addShake(0.4);
    }
    const dx = tx - e.position.x, dz = tz - e.position.z;
    const d = Math.hypot(dx, dz) || 1;
    const step = Math.min(d, C.speed * dt);
    const [nx, nz] = g.physics.move(e.position.x, e.position.z, (dx / d) * step, (dz / d) * step, 0.28, 'echo');
    e.position.x = nx; e.position.z = nz;
    e.rotation.y = Math.atan2(dx, dz);
    // Шаги — тяжёлые, неровные
    C.stepT = (C.stepT || 0) - dt;
    if (C.stepT <= 0) { C.stepT = 0.42; this.sound('footstep', { pos: { x: nx, y: 0.05, z: nz }, surface: 'concrete', run: true, volume: 1 }); }
    if (Math.random() < dt * 0.25) g.bus.emit('lights:flicker', { circuit: 'basement', duration: 0.5 });
    if (this.echoDist() < 0.85) this.caught();
  }

  async caught() {
    const g = this.g;
    const C = this.chase;
    if (!C || C.frozen) return;
    C.frozen = true;
    // Скример: камера в упор к лицу
    const e = g.npcs.echo.root;
    const head = new THREE.Vector3(e.position.x, 1.85, e.position.z);
    const fwd = new THREE.Vector3(Math.sin(e.rotation.y), 0, Math.cos(e.rotation.y));
    const camPos = head.clone().addScaledVector(fwd, 0.42).add(new THREE.Vector3(0, -0.05, 0));
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(camPos, head, new THREE.Vector3(0, 1, 0)));
    g.cam.override = { position: camPos, quaternion: q, fov: 48 };
    g.player.locked = true;
    this.sound('hit', { bus: 'music', volume: 1.2 });
    this.sound('whisper', { pos: { x: camPos.x, y: camPos.y, z: camPos.z }, duration: 1, volume: 1.4 });
    g.cam.addShake(1.2);
    g.hud.damage(true);
    await wait(1000);
    await g.hud.fade(true, 'Ты не успел.');
    g.cam.override = null;
    g.hud.damage(false);
    const R = C.retrySpot;
    g.player.pos.set(R.x, 0, R.z);
    g.rooms.update(0.3, g.player.pos);
    this.set('basement_dark', this.flag('resonator_off'));
    this.chase = null;
    await wait(1200);
    g.hud.fade(false);
    g.player.locked = false;
    this.startChase();
    this.chase.retries = (C.retries || 0) + 1;
    this.chase.retrySpot = R;
    g.bus.emit('hud:toast', { text: 'Ещё раз. Лестница — к люку, потом коридор и лифт.' });
  }

  endChase() {
    this.chase = null;
    this.hideEcho();
    this.set('basement_dark', false);
    this.g.ambience.setTension(0.4);
  }

  // ------------------------------------------------------------ кадр
  update(dt) {
    if (!this.active) return;
    this.time += dt;
    const g = this.g;
    // Створки лифтов
    for (const k of ['up', 'down']) {
      const target = this.doorTarget[k];
      if (Math.abs(this.doors[k] - target) > 0.001) {
        this.doors[k] += Math.sign(target - this.doors[k]) * Math.min(Math.abs(target - this.doors[k]), dt * 1.1);
      }
      const parts = g.world.named.get(k === 'up' ? 'lift_a' : 'lift_b')?.parts;
      if (parts?.left) {
        const a = this.doors[k] * 0.4;
        parts.left.userData.baseX ??= parts.left.position.x;
        parts.right.userData.baseX ??= parts.right.position.x;
        const s = k === 'up' ? 1 : 1;
        parts.left.position.x = parts.left.userData.baseX - a * s;
        parts.right.position.x = parts.right.userData.baseX + a * s;
      }
    }
    if (this.tape) this.updateTape(dt);
    if (this.chase) this.updateChase(dt);
    // Саныч стоит лицом к стене и чуть покачивается; при скримере голова поворачивается назад
    if (this.sanych.root.visible) {
      const turning = this.sanychTurn > 0;
      if (turning) this.sanychTurn = Math.min(1, this.sanychTurn + dt * 1.5);
      const talking = g.dialogue.isActive && g.dialogue.active?.npc === 'sanych_echo';
      this.sanych.update(dt, { speed: 0, talking, lookAt: null, activity: 'listen', headTilt: turning ? -0.2 : 0.1 });
      if (turning) this.sanych.head.rotation.y = Math.PI * 0.9 * this.sanychTurn;
    }
    // Рация Сони шипит, когда рядом эхо
    if (g.inventory.has('walkie')) {
      this.walkieT -= dt;
      const d = this.echoDist();
      if (d < 10 && this.walkieT <= 0) {
        this.walkieT = Math.max(0.35, d * 0.25);
        this.sound('static', { bus: 'ui', duration: 0.25, volume: Math.min(1, 1.6 - d / 8) });
        if (!this.flag('c2_walkie_hint')) { this.set('c2_walkie_hint'); g.bus.emit('caption:sound', { text: '[рация Сони шипит всё громче]' }); }
      }
    }
    // Кристаллы «дышат»
    if (LAB_STATE.crystalMat && !this.flag('resonator_off') && g.rooms.level === 'lab') {
      const k = 0.75 + Math.sin(this.time * 1.7) * 0.12 + (this.chase ? Math.random() * 0.15 : 0);
      LAB_STATE.crystalMat.color.setRGB(0.4 * k, 0.44 * k, 0.64 * k);
    }
  }
}

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
