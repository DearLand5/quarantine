// Сюжетный слой: связывает телефон, NPC, свет, звук и мир в конкретные сцены главы 1.
// Здесь живут составные действия (отключение света, стук в дверь, глазок, записка), которые вызываются
// из данных (сообщения, диалоги, события) через StoryContext.
import * as THREE from 'three';
import { t } from '../utils/time.js';
import { boxGeo, planeGeo } from '../world/geometry.js';

const HIT_MAT = new THREE.MeshBasicMaterial({ visible: false });

const RADIO_LINES = [
  'Говорит штаб гражданской обороны. Жителям дома четырнадцать по улице Тополиной: оставайтесь в квартирах.',
  'Не открывайте двери посторонним. Не пытайтесь покинуть здание. Ситуация под контролем.',
  'Повторяем. Ситуация под контролем. Ожидайте дальнейших указаний.',
];
const RADIO_LATE = 'Не открывайте двери, когда стучат три раза. …Повторяем. Ситуация под контролем.';

export class StoryManager {
  constructor(game) {
    this.g = game;
    this.timer = 0;
    this.knock = null;
    this.silhouetteT = 0;
    this.radioT = 0;
    this.radioLine = 0;
    this.noteMesh = null;
    this.footprints = null;
    this.talking = null;
    const bus = game.bus;
    bus.on('npc:arrived', (e) => this.onArrived(e));
    bus.on('room:changed', (e) => this.onRoomChanged(e));
    bus.on('photo:sent', ({ chat, photo }) => {
      if (chat === 'denis' && photo.tags.includes('door52') && this.g.quests.isActive('seal52')) this.g.quests.objective('seal52', 'send');
    });
    bus.on('gallery:added', ({ tags }) => {
      if (tags.includes('door52') && this.g.quests.isActive('seal52')) this.g.quests.objective('seal52', 'photo');
      if (tags.includes('figure')) { this.g.storyCtx.clue('figure_photo'); this.g.bus.emit('sound:play', { name: 'sting', bus: 'music', base: 46, duration: 5 }); }
      if (tags.includes('gena52')) this.g.storyCtx.clue('gena_lied');
    });
    bus.on('chat:read', ({ chat }) => { if (chat === 'house' || chat === 'mchs') this.g.quests.objective('look_around', 'phone'); });
  }

  get gs() { return this.g.gs; }
  get ctx() { return this.g.storyCtx; }

  /** Восстановление визуальных последствий после загрузки сохранения */
  restore() {
    const f = this.gs.data.flags;
    if (f.note_dropped && !f.note_picked) this.spawnNote();
    if (f.knock_opened) this.spawnFootprints();
    if (f.after_vetrov && !f.knock_active && !f.knock_done) this.setFigure('stair_glass');
    if (f.knock_active) { this.gs.setFlag('knock_active', false); this.startKnock(); }
  }

  // ------------------------------------------------------------ обновление
  update(dt) {
    const g = this.g;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 0.5;
      this.checkGenaLie();
      this.checkVetrovDoor();
    }
    // Разговор прерывается, если игрок ушёл
    if (this.talking && this.talking.npc) {
      const npc = g.npcs.get(this.talking.npc);
      if (npc && Math.hypot(npc.x - g.player.pos.x, npc.z - g.player.pos.z) > 3.6) g.dialogue.end();
    }
    if (this.silhouetteT > 0) {
      this.silhouetteT -= dt;
      if (this.silhouetteT <= 0 || g.player.pos.x < -4.5) {
        this.silhouetteT = 0;
        g.bus.emit('lights:flicker', { circuit: 'corridor', duration: 1.2 });
        setTimeout(() => this.setFigure(this.gs.flag('knock_done') ? null : 'stair_glass'), 400);
      }
    }
    if (this.gs.flag('radio_on')) {
      this.radioT -= dt;
      if (this.radioT <= 0) {
        this.radioT = 7;
        const late = this.gs.flag('after_vetrov') && this.radioLine % 3 === 2;
        const text = late ? RADIO_LATE : RADIO_LINES[this.radioLine % RADIO_LINES.length];
        this.radioLine++;
        g.bus.emit('sound:play', { name: 'babble', pos: { x: 4.1, y: 1.6, z: -4.15 }, pitch: 105, duration: 4, muffled: false, volume: 0.45 });
        g.bus.emit('sound:play', { name: 'static', pos: { x: 4.1, y: 1.6, z: -4.15 }, duration: 0.5 });
        const near = Math.hypot(g.player.pos.x - 4.1, g.player.pos.z + 4.15) < 6;
        if (near) g.bus.emit('subtitle', { who: 'Радио', text, duration: 6 });
        if (late && near) this.ctx.clue('radio_phrase');
      }
    }
    if (this.knock) this.updateKnock(dt);
  }

  // ------------------------------------------------------------ разговоры
  talkTo(npcId, { atDoor = false } = {}) {
    const g = this.g;
    const npc = g.npcs.get(npcId);
    if (!npc || g.dialogue.isActive) { if (atDoor) g.npcs.leaveDoor(npcId); return; }
    if (atDoor && Math.hypot(npc.x - g.player.pos.x, npc.z - g.player.pos.z) > 3.2) {
      // Пока сосед шёл к двери, игрок ушёл
      g.bus.emit('subtitle', { who: npc.def.short, text: 'Кто стучал?.. Никого. Хулиганьё.', duration: 3 });
      g.npcs.leaveDoor(npcId);
      return;
    }
    const inside = g.rooms.current === 'room45' || g.rooms.current === 'hall45';
    if (npcId === 'zinaida' && inside && !atDoor) this.gs.setFlag('zina_inside_talk');
    npc.talking = true;
    this.talking = { npc: npcId, atDoor };
    g.player.locked = true;
    g.cam.focus = { target: npc.headPosition(), speed: 3 };
    g.interaction.enabled = false;
    const ok = g.dialogue.start(npcId, {
      onEnd: () => {
        npc.talking = false;
        this.talking = null;
        g.player.locked = false;
        g.cam.focus = null;
        g.interaction.enabled = true;
        this.gs.setFlag('zina_inside_talk', false);
        if (atDoor) g.npcs.leaveDoor(npcId, { keepOpen: npcId === 'zinaida' && this.gs.flag('zina_invited') });
      },
    });
    if (!ok) { npc.talking = false; this.talking = null; g.player.locked = false; g.cam.focus = null; g.interaction.enabled = true; if (atDoor) g.npcs.leaveDoor(npcId); }
  }

  inviteZina() {
    this.gs.setFlag('zina_invited');
    this.g.rel.adjust('zinaida', { trust: 3 }, 'пригласила в гости');
  }

  onRoomChanged({ from, to }) {
    // Зинаида закрывает за гостем дверь
    if ((from === 'hall45') && to === 'corridor' && this.gs.flag('zina_invited')) {
      setTimeout(() => {
        if (this.g.rooms.current === 'hall45' || this.g.rooms.current === 'room45') return;
        const z = this.g.npcs.get('zinaida');
        if (z && !z.gone) z.setDoor('d45', false);
        this.gs.setFlag('zina_invited', false);
      }, 3500);
    }
    if (to === 'room47' || to === 'hall47') this.g.quests.isActive('night') && this.gs.door('d47').open === false && this.g.quests.objective('night', 'home');
  }

  onArrived({ id, node }) {
    if (id === 'zinaida' && node === 'f48' && this.gs.flag('zina_walks') && !this.gs.flag('zina_walk_done')) {
      setTimeout(() => {
        this.g.bus.emit('sound:play', { name: 'knock', pos: { x: -8, y: 1.2, z: 0.9 }, count: 2, volume: 0.6 });
        this.gs.setFlag('zina_walk_done');
        this.g.rel.adjust('zinaida', { trust: -8 }, 'сама носила ингалятор');
        this.g.rel.adjust('marina', { trust: -3 });
        this.g.chats.runSequence('zina_delivered');
      }, 2500);
    }
    if (id === 'gennady' && node === 'panel' && this.gs.flag('gena_to_panel') && !this.gs.flag('breaker_fixed')) {
      setTimeout(() => this.fixBreaker('gennady'), 2500);
    }
  }

  deliverInhaler() {
    const g = this.g;
    g.inventory.remove('inhaler');
    this.gs.setFlag('inhaler_delivered');
    g.quests.objective('inhaler', 'deliver');
    g.rel.keep('marina', 'inhaler');
    g.rel.adjust('marina', { trust: 15 }, 'принёс лекарство для Сони');
    g.rel.adjust('zinaida', { trust: 5 });
    g.chats.runSequence('inhaler_done');
  }

  witnessGena() {
    if (!this.gs.flag('gena_said_home')) return;
    this.ctx.clue('gena_lied');
    this.gs.setFlag('saw_gena_lie');
    this.g.rel.witness('gennady', 'player_saw_me_at_52');
  }

  checkGenaLie() {
    if (!this.gs.flag('gena_said_home') || this.gs.flag('saw_gena_lie')) return;
    const npc = this.g.npcs.get('gennady');
    if (!npc || npc.node !== 'f52' || npc.moving || !npc.root.visible) return;
    const p = this.g.player.pos;
    const d = Math.hypot(npc.x - p.x, npc.z - p.z);
    if (d > 9) return;
    const fwd = this.g.cam.forward();
    const dx = (npc.x - p.x) / d, dz = (npc.z - p.z) / d;
    if (fwd.x * dx + fwd.z * dz < 0.5) return;
    if (this.g.physics.segmentBlocked(p.x, p.z, npc.x, npc.z)) return;
    this.witnessGena();
    this.g.bus.emit('hud:toast', { text: 'Лапин стоит у двери 52. А в чате пишет, что дома.' });
  }

  // ------------------------------------------------------------ электричество
  blackout() {
    const w = this.gs.data.world;
    w.power.apartment = false;
    w.power.corridor = false;
    w.breakerTripped = true;
    this.gs.data.phone.charging = false;
    this.gs.setFlag('blackout');
    this.g.bus.emit('lights:flicker', { circuit: 'all', duration: 1.2 });
    this.g.bus.emit('sound:play', { name: 'breaker', pos: { x: 2, y: 1.6, z: -0.9 } });
    this.g.bus.emit('caption:sound', { text: '[громкий щелчок в коридоре. Свет гаснет]' });
    this.g.ambience.setTension(0.25);
    this.g.chats.runSequence('blackout');
    if (!this.g.inventory.has('flashlight')) setTimeout(() => this.g.bus.emit('hud:toast', { text: 'Темно. Фонарик — в тумбочке в прихожей.' }), 3000);
  }

  canSeeInDark() {
    return (this.gs.data.player.flashlight && this.gs.data.player.flashBattery > 0) || this.gs.data.world.power.corridor;
  }

  fixBreaker(by) {
    const w = this.gs.data.world;
    if (!w.breakerTripped) return;
    w.breakerTripped = false;
    w.power.apartment = true;
    w.power.corridor = true;
    if (!w.brokenLamps.includes('L_c1')) w.brokenLamps.push('L_c1');
    this.gs.setFlag('breaker_fixed');
    this.g.bus.emit('sound:play', { name: 'breaker', pos: { x: 2, y: 1.6, z: -0.9 } });
    this.g.bus.emit('lights:flicker', { circuit: 'all', duration: 0.8 });
    this.g.quests.complete('breaker');
    if (by === 'player') {
      this.g.chats.runSequence('breaker_fixed');
      if (this.g.npcs.canSee('gennady', 2, -0.5)) this.g.rel.witness('gennady', 'player_fixed_breaker');
    } else {
      this.g.chats.runSequence('gena_fixed');
    }
  }

  liftGhost() {
    this.g.bus.emit('sound:play', { name: 'elevator', pos: { x: 6.1, y: 1.2, z: -3.5 }, duration: 7 });
    this.g.bus.emit('caption:sound', { text: '[в шахте отключённого лифта загудел мотор]' });
    setTimeout(() => this.gs.setFlag('lift_ghost_done'), 7000);
  }

  tearSeal() {
    const st = this.gs.door('d52');
    if (!st.sealed) return;
    st.sealed = false;
    this.g.world.getDoor('d52').apply();
    this.g.bus.emit('sound:play', { name: 'whisper', pos: { x: 8, y: 1.3, z: 0.9 }, duration: 0.5, volume: 0.5 });
  }

  // ------------------------------------------------------------ аномалии
  setFigure(spot) { this.g.npcs.setAnomaly(spot); }

  silhouette() {
    this.setFigure('corridor_west');
    this.silhouetteT = 2.6;
    this.g.bus.emit('sound:play', { name: 'sting', bus: 'music', base: 52, duration: 4 });
    this.g.ambience.setTension(Math.max(this.g.ambience.tension, 0.45));
  }

  vetrovPing(force = false) {
    const pos = { x: 8, y: 1.0, z: 2.2 };
    this.g.bus.emit('sound:play', { name: 'vibrate', pos, pulses: 2, volume: 0.9, ref: 0.7, rolloff: 2 });
    const p = this.g.player.pos;
    if (Math.hypot(p.x - 8, p.z - 0.8) < 4.5 || force) {
      this.g.bus.emit('caption:sound', { text: '[за дверью 52 вибрирует телефон]' });
      if (Math.hypot(p.x - 8, p.z - 0.8) < 4.5) this.ctx.clue('phone_in_52');
    }
  }

  checkVetrovDoor() { /* резерв для будущих глав: реакция 52-й на присутствие игрока */ }

  // ------------------------------------------------------------ записка
  dropNote() {
    this.gs.setFlag('note_dropped');
    this.spawnNote();
    this.g.bus.emit('sound:play', { name: 'whisper', pos: { x: 0, y: 0.1, z: -1.2 }, duration: 0.6, volume: 0.6 });
    this.g.bus.emit('caption:sound', { text: '[под входной дверью что-то прошуршало]' });
  }

  spawnNote() {
    if (this.noteMesh) return;
    const g = this.g;
    const mat = g.assets.signMaterial(['НЕ ОТКРЫВАЙ', 'КОГДА СТУЧАТ', 'ТРИ РАЗА', '', '— Н.В.'], { w: 256, h: 320, bg: '#e6e0cc', fg: '#22263a', size: 30 });
    const mesh = new THREE.Mesh(planeGeo(0.16, 0.2), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = 0.4;
    mesh.position.set(0.15, 0.004, -1.42);
    const hit = new THREE.Mesh(boxGeo(0.35, 0.25, 0.35), HIT_MAT);
    hit.position.set(0.15, 0.12, -1.42);
    hit.userData.hitId = 'note_floor';
    g.sm.scene.add(mesh, hit);
    g.interaction.addHit(hit);
    this.noteMesh = { mesh, hit };
  }

  pickNote() {
    if (!this.noteMesh) return;
    const { mesh, hit } = this.noteMesh;
    mesh.removeFromParent(); hit.removeFromParent();
    this.g.interaction.removeHit(hit);
    this.noteMesh = null;
    this.gs.setFlag('note_picked');
    this.g.inventory.add('note_door');
    this.g.reader.show({ title: 'Записка', text: 'Тетрадный листок в клетку. Почерк ровный, старательный, как в прописях:\n\nНЕ ОТКРЫВАЙ, КОГДА СТУЧАТ ТРИ РАЗА.\nОНИ ГОВОРЯТ ГОЛОСАМИ ТЕХ, КОГО ТЫ ЖДЁШЬ.\n\n— Н.В.' });
  }

  // ------------------------------------------------------------ глазок
  peephole(doorId) {
    if (doorId !== 'd47') { this.g.bus.emit('subtitle', { who: '', text: 'Глазок смотрит наружу — с этой стороны в него ничего не видно.', duration: 3 }); return; }
    const pos = new THREE.Vector3(0, 1.55, -0.96);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.08, Math.PI, 0, 'YXZ'));
    const knockNow = this.gs.flag('knock_active');
    if (knockNow) {
      this.setFigure('door47');
      this.gs.setFlag('knock_peeped');
      this.ctx.clue('echo_voice');
      this.g.bus.emit('sound:play', { name: 'heartbeat', bus: 'sfx', count: 5 });
      setTimeout(() => this.g.bus.emit('sound:play', { name: 'sting', bus: 'music', base: 41, duration: 6 }), 600);
    }
    this.g.enterPeephole(pos, q, () => {
      if (knockNow) {
        this.setFigure(null);
        this.g.bus.emit('subtitle', { who: '', text: 'Халат Марины. Её волосы. Но она на голову выше. И стоит, прижавшись лбом к двери, не шевелясь.', duration: 6 });
      }
    });
  }

  // ------------------------------------------------------------ главный выбор: стук
  startKnock() {
    if (this.knock) return;
    this.gs.setFlag('knock_active');
    this.knock = { t: 0, next: 0, count: 0 };
    this.setFigure(null);
    this.g.ambience.setTension(0.85);
    this.g.chats.runSequence('knock_choice');
    this.g.chats.runSequence('knock_marina_choice');
  }

  updateKnock(dt) {
    const k = this.knock;
    k.t += dt;
    k.next -= dt;
    if (k.next <= 0 && k.count < 3 && !this.gs.flag('knock_opened')) {
      k.count++;
      k.next = 24;
      const pos = { x: 0, y: 1.2, z: -0.7 };
      this.g.bus.emit('sound:play', { name: 'knock', pos, count: 3, volume: 1 });
      setTimeout(() => {
        if (!this.knock) return;
        this.g.bus.emit('sound:play', { name: 'babble', bus: 'voice', pos, pitch: 205, duration: 2.6, muffled: true, volume: 0.9 });
        this.g.bus.emit('subtitle', { who: 'Голос за дверью', text: 'Кирилл… Это Марина. Соне плохо. Откройте, пожалуйста.', duration: 5 });
      }, 1700);
      if (k.count === 1) this.g.bus.emit('hud:objective', { text: 'Кто-то стучит в дверь. Решай.', title: 'Ночь' });
    }
    // Если не открыли — существо уходит
    if (k.t > 80 && !this.g.dialogue.isActive && this.g.mode === 'play') this.resolveKnock();
  }

  knockDialogue() {
    const g = this.g;
    if (g.dialogue.isActive) return;
    g.player.locked = true;
    g.cam.focus = { target: new THREE.Vector3(0, 1.5, -1.07), speed: 3 };
    g.interaction.enabled = false;
    g.dialogue.start('knock', { onEnd: () => { g.player.locked = false; g.cam.focus = null; g.interaction.enabled = true; } });
  }

  knockPeephole() { setTimeout(() => this.peephole('d47'), 50); }

  knockOpen() {
    const g = this.g;
    const st = this.gs.door('d47');
    st.open = true; st.chained = false; st.locked = false;
    g.world.getDoor('d47').apply();
    g.bus.emit('sound:play', { name: 'chain', pos: { x: 0, y: 1.3, z: -1.2 } });
    g.bus.emit('sound:play', { name: 'door_open', pos: { x: 0, y: 1.3, z: -1.0 } });
    this.gs.setFlag('knock_opened');
    this.gs.data.world.power.corridor = false;
    g.bus.emit('lights:flicker', { circuit: 'all', duration: 0.6 });
    setTimeout(() => {
      g.bus.emit('sound:play', { name: 'hit', bus: 'music' });
      g.cam.addShake(0.8);
      g.hud.damage(true);
      setTimeout(() => g.hud.damage(false), 1500);
      g.bus.emit('subtitle', { who: '', text: 'За дверью никого. Только мокрые следы на плитке — от моего порога к пятьдесят второй.', duration: 6 });
    }, 700);
    this.spawnFootprints();
    this.resolveKnock('opened');
  }

  spawnFootprints() {
    if (this.footprints) return;
    const g = this.g;
    const mat = new THREE.MeshBasicMaterial({ color: 0x0c0d0c, transparent: true, opacity: 0.55, depthWrite: false });
    const group = new THREE.Group();
    const geo = planeGeo(0.11, 0.27);
    for (let i = 0; i < 16; i++) {
      const k = i / 15;
      const x = 0.1 + k * 7.9, z = -0.35 + k * 0.95;
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = -Math.PI / 2 + 0.12;
      m.position.set(x, 0.003, z + (i % 2 ? 0.12 : -0.12));
      group.add(m);
    }
    g.sm.scene.add(group);
    this.footprints = group;
  }

  resolveKnock(forced = null) {
    if (!this.knock) return;
    this.knock = null;
    const g = this.g;
    this.gs.setFlag('knock_active', false);
    this.gs.setFlag('knock_done');
    g.chats.closeChoice('knock_warn');
    g.chats.closeChoice('knock_marina');
    let outcome = forced;
    if (!outcome) {
      if (this.gs.flag('knock_warned')) outcome = 'warned';
      else if (this.gs.flag('warned_zina_early')) { outcome = 'ignored_safe'; g.chats.runSequence('knock_ignored_safe'); }
      else { outcome = 'ignored'; g.chats.runSequence('knock_ignored'); }
      // Шаги уходят к 52-й, её дверь скрипит
      g.bus.emit('sound:play', { name: 'steps_far', pos: { x: 3, y: 0.2, z: 0.2 }, count: 7, interval: 0.75 });
      setTimeout(() => g.bus.emit('sound:play', { name: 'door_open', pos: { x: 8, y: 1.2, z: 1.2 }, volume: 0.6 }), 5600);
      g.bus.emit('caption:sound', { text: '[шаги удаляются по коридору. Где-то скрипнула дверь]' });
    } else if (outcome === 'opened') {
      g.chats.runSequence('knock_opened');
      this.gs.setFlag('echo_has_voice');
    }
    this.gs.data.story.outcome = outcome;
    g.ambience.setTension(outcome === 'opened' || outcome === 'ignored' ? 0.7 : 0.4);
  }

  // ------------------------------------------------------------ разное
  isSafeAtHome() {
    return this.g.rooms.room?.apartment === '47' && !this.gs.door('d47').open;
  }

  waitTime(minutes) {
    const g = this.g;
    if (this.gs.flag('knock_active')) return;
    g.hud.fade(true, `Прошло ${minutes} минут…`).then(() => {
      this.gs.data.time += minutes;
      setTimeout(() => g.hud.fade(false), 700);
    });
  }

  toggleRadio() {
    const on = !this.gs.flag('radio_on');
    this.gs.setFlag('radio_on', on);
    this.radioT = 0.6;
    this.g.bus.emit('sound:play', { name: 'static', pos: { x: 4.1, y: 1.6, z: -4.15 }, duration: 0.6 });
  }

  /** Теги снимка: что из важного попало в кадр. Учитывает дальность, кадр и стены. */
  tagPhoto(cam) {
    const tags = [];
    const g = this.g;
    const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const cp = cam.position;
    const visible = (x, y, z, maxDist, ignoreDoor = null) => {
      const v = new THREE.Vector3(x, y, z);
      if (!frustum.containsPoint(v)) return false;
      if (cp.distanceTo(v) > maxDist) return false;
      const dx = x - cp.x, dz = z - cp.z, len = Math.hypot(dx, dz);
      const k = Math.max(0, (len - 0.35) / len);
      for (const list of [g.physics.static, g.physics.collectDynamic()]) {
        for (const b of list) {
          if (b.glimpse || (ignoreDoor && b.door === ignoreDoor)) continue;
          if (segAABB(cp.x, cp.z, cp.x + dx * k, cp.z + dz * k, b)) return false;
        }
      }
      return true;
    };
    if (visible(8, 1.3, 1.0, 7, 'd52')) tags.push('door52');
    if (g.npcs.anomalyAt('stair_glass') && visible(11.75, 1.4, 0.25, 15, 'dStair')) tags.push('figure');
    const gena = g.npcs.get('gennady');
    if (gena && gena.node === 'f52' && !gena.moving && gena.root.visible && visible(gena.x, 1.5, gena.z, 9)) tags.push('gena52');
    if (visible(-8.3, 1.4, -7.3, 4)) tags.push('zina_room');
    return tags;
  }

  finishChapter() { this.g.endings.show(); }
}

function segAABB(x0, z0, x1, z1, b) {
  let t0 = 0, t1 = 1;
  const dx = x1 - x0, dz = z1 - z0;
  const p = [-dx, dx, -dz, dz];
  const q = [x0 - b.minX, b.maxX - x0, z0 - b.minZ, b.maxZ - z0];
  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]) < 1e-9) { if (q[i] < 0) return false; continue; }
    const r = q[i] / p[i];
    if (p[i] < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return t0 <= t1;
}

export { t };
