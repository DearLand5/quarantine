// Главный класс: создаёт все системы, связывает их через шину событий и ведёт единый игровой цикл.
// Режимы: boot → menu → play ⇄ pause / peephole / camera → ending.
import * as THREE from 'three';
import { EventBus } from './EventBus.js';
import { GameState } from './GameState.js';
import { SceneManager } from './SceneManager.js';
import { AssetManager } from './AssetManager.js';
import { SettingsManager } from '../systems/SettingsManager.js';
import { AudioManager } from '../systems/AudioManager.js';
import { Ambience } from '../systems/Ambience.js';
import { Inventory } from '../systems/Inventory.js';
import { SaveManager } from '../systems/SaveManager.js';
import { WorldBuilder } from '../world/WorldBuilder.js';
import { PhysicsSystem } from '../world/PhysicsSystem.js';
import { RoomManager } from '../world/RoomManager.js';
import { LightingSystem } from '../world/LightingSystem.js';
import { InteractionSystem } from '../world/InteractionSystem.js';
import { InputManager } from '../player/InputManager.js';
import { MobileControls } from '../player/MobileControls.js';
import { CameraController } from '../player/CameraController.js';
import { PlayerController } from '../player/PlayerController.js';
import { ViewModel } from '../player/ViewModel.js';
import { RelationshipSystem } from '../npc/RelationshipSystem.js';
import { NPCManager } from '../npc/NPCManager.js';
import { DialogueSystem } from '../npc/DialogueSystem.js';
import { ChatManager } from '../phone/ChatManager.js';
import { Gallery } from '../phone/Gallery.js';
import { NotificationManager } from '../phone/NotificationManager.js';
import { ContactManager } from '../phone/ContactManager.js';
import { PhoneController } from '../phone/PhoneController.js';
import { stampCamFrame } from '../phone/PhotoFactory.js';
import { QuestManager } from '../story/QuestManager.js';
import { EventManager } from '../story/EventManager.js';
import { StoryContext } from '../story/StoryContext.js';
import { StoryManager } from '../story/StoryManager.js';
import { EndingManager } from '../story/EndingManager.js';
import { createInteractions } from '../story/Interactions.js';
import { Chapter2 } from '../story/Chapter2.js';
import { HomeMechanics } from '../story/HomeMechanics.js';
import { Chapter3 } from '../story/Chapter3.js';
import { nightLog, C3_START } from '../data/chapter3.js';
import { dayLog } from '../data/chapter2.js';
import { t2 } from '../utils/time.js';
import { HUD } from '../ui/HUD.js';
import { MenuManager } from '../ui/MenuManager.js';
import { DialogueUI } from '../ui/DialogueUI.js';
import { InventoryUI } from '../ui/InventoryUI.js';
import { Reader } from '../ui/Reader.js';
import { DOORS, START_POSITION } from '../data/locations.js';
import { CLUES, ITEMS } from '../data/items.js';
import { fmtTime } from '../utils/time.js';

const AUTOSAVE_INTERVAL = 150;   // реальные секунды

export class Game {
  constructor(canvas, uiRoot) {
    this.canvas = canvas;
    this.uiRoot = uiRoot;
    this.mode = 'boot';
    this.last = 0;
    this.autosaveTimer = AUTOSAVE_INTERVAL;
    this.slowTimer = 0;
    this.menuTime = 0;
    this.isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  }

  async boot(status = () => {}) {
    const bus = this.bus = new EventBus();
    this.settings = new SettingsManager(bus);
    this.gs = new GameState(bus);
    status('Подготовка рендера…');
    this.sm = new SceneManager(this.canvas, bus, this.settings);
    this.assets = new AssetManager(this.sm);
    await this.assets.loadManifest();
    this.audio = new AudioManager(bus, this.settings);
    this.audio.setManifest(this.assets.manifest);
    this.audio.lowQuality = this.sm.qualityName === 'low';
    this.inventory = new Inventory(this.gs, bus);
    this.saves = new SaveManager(this.gs, bus);
    this.rel = new RelationshipSystem(this.gs, bus);

    status('Строим дом…');
    await nextFrame();
    this.world = new WorldBuilder(this.assets, this.gs).build();
    this.sm.scene.add(this.world.root);
    this.physics = new PhysicsSystem();
    this.physics.setStatic(this.world.colliders);
    this.physics.addProvider(() => [...this.world.doors.values()].map((d) => d.collider()));
    this.rooms = new RoomManager(this.world, bus);
    this.lighting = new LightingSystem(this.sm, this.world, this.gs, bus);
    this.interaction = new InteractionSystem(this.sm, this.physics, bus);
    this.interaction.setHits([...this.world.hits]);
    this.audio.occluder = (x0, z0, x1, z1) => this.physics.segmentBlocked(x0, z0, x1, z1);
    this.ambience = new Ambience(this.audio, this.gs, bus);

    status('Соседи…');
    await nextFrame();
    this.input = new InputManager(this.canvas, bus, this.settings);
    this.cam = new CameraController(this.sm, this.settings);
    this.player = new PlayerController(this.physics, this.cam, bus, this.gs);
    this.viewModel = new ViewModel(this.sm.camera, this.assets);
    this.npcs = new NPCManager({ world: this.world, gs: this.gs, bus, physics: this.physics, scene: this.sm.scene, interaction: this.interaction, lambert: this.sm.profile.lambert, assets: this.assets });
    this.npcs.init();
    this.dialogue = new DialogueSystem(this.gs, bus);

    status('Телефон…');
    this.chats = new ChatManager(this.gs, bus);
    this.gallery = new Gallery(this.gs, bus);
    this.chats.gallery = this.gallery;
    this.gallery.render3D = (key) => this.renderCamFrame(key);
    this.notifications = new NotificationManager(this.gs, bus, this.chats);
    this.contacts = new ContactManager(this.gs, bus, this.chats);
    this.quests = new QuestManager(this.gs, bus);
    this.events = new EventManager(this.gs, bus);

    // Интерфейс
    this.hud = new HUD(this.uiRoot, bus, this.settings);
    this.notifications.attach(this.hud.bannerEl);
    this.controls = new MobileControls(this.uiRoot, this.input, bus, this.settings);
    this.controls.show(false);
    this.phone = new PhoneController(this.uiRoot, { gs: this.gs, bus, chats: this.chats, contacts: this.contacts, gallery: this.gallery, notifications: this.notifications, quests: this.quests, settings: this.settings });
    this.dialogueUI = new DialogueUI(this.uiRoot, bus, this.dialogue, this.settings);
    this.reader = new Reader(this.uiRoot);
    this.inventoryUI = new InventoryUI(this.uiRoot, bus, this.inventory, this.gs, { onUse: (id, how) => this.useItem(id, how) });
    this.menus = new MenuManager(this.uiRoot, bus, { settings: this.settings, saves: this.saves, controls: this.controls, audio: this.audio });

    // Сюжет
    this.story = new StoryManager(this);
    this.endings = new EndingManager(this);
    this.storyCtx = new StoryContext(this);
    for (const sys of [this.chats, this.contacts, this.dialogue, this.events]) sys.ctx = this.storyCtx;
    this.ch2 = new Chapter2(this);
    this.ch3 = new Chapter3(this);
    this.home = new HomeMechanics(this);
    const baseResolver = createInteractions(this);
    this.interaction.setResolver((id, obj) => this.ch3.resolve(id) || this.ch2.resolve(id) || this.home.resolve(id, obj) || baseResolver(id, obj));

    this.buildMenuProps();
    this.bindEvents();
    this.rel.ensureAll();
    this.applyStateToWorld();
    this.setupMenuCamera();
    status('Готово');
    requestAnimationFrame((t) => this.loop(t));
    // Для отладки и автотестов
    window.__game = this;
  }

  // ------------------------------------------------------------ события
  bindEvents() {
    const bus = this.bus;
    bus.on('room:changed', ({ room }) => {
      if (!room) return;
      this.player.surface = room.surface || 'tile';
    });
    bus.on('phone:open', ({ chat }) => { if (this.mode === 'play') this.phone.open({ chat }); });
    bus.on('phone:opened', () => { this.viewModel.setPhone(true); this.player.slowMode = true; this.input.releasePointer(); });
    bus.on('phone:closed', () => { this.viewModel.setPhone(false); this.player.slowMode = false; });
    bus.on('camera:open', () => this.enterCamera());
    bus.on('menu:settings', () => this.openSettingsFromGame());
    bus.on('player:interact-anim', () => this.viewModel.poke());
    bus.on('player:footstep', (e) => this.audio.play('footstep', { pos: { x: e.pos.x, y: 0.05, z: e.pos.z }, surface: e.surface, run: e.run, crouch: e.crouch, volume: 0.7, reverb: true }));
    bus.on('npc:speak', ({ id, pitch, duration }) => {
      const npc = this.npcs.get(id);
      const pos = npc ? npc.headPosition() : { x: 0, y: 1.5, z: -0.6 };
      this.audio.play('babble', { bus: 'voice', pos, pitch, duration, muffled: id === 'voice', volume: 0.75 });
    });
    bus.on('clue:found', ({ id }) => {
      const c = CLUES[id];
      if (!c) return;
      this.quests.unseen++;
      bus.emit('hud:toast', { text: `Новая странность: ${c.title}` });
    });
    bus.on('dialogue:start', () => { this.controls.show(false); this.input.releasePointer(); });
    bus.on('dialogue:end', () => { if (this.mode === 'play') this.controls.show(this.isTouch); });
    bus.on('quest:completed', () => this.autosave());
    bus.on('story:event', ({ id }) => { if (['blackout', 'vetrov', 'knock'].includes(id)) this.autosave(); });
    bus.on('save:error', ({ message }) => bus.emit('hud:toast', { text: message, error: true }));
    bus.on('input:tap-look', () => { if (this.mode === 'play' && !this.dialogue.isActive && this.interaction.current) this.interaction.interact(); else if (this.mode === 'peephole') this.exitPeephole(); });
    bus.on('ui:inventory', ({ open }) => { if (this.mode === 'play') this.controls.show(this.isTouch && !open); });
    // Потеря захвата мыши во время игры = пауза (стандартное поведение Esc в браузере)
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && this.mode === 'play' && this.input.wantsPointerLock && !this.anyOverlay()) this.pause();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.mode === 'play') this.pause();
    });
  }

  anyOverlay() {
    return this.phone.isOpen || this.dialogue.isActive || this.reader.isOpen || this.inventoryUI.isOpen || this.menus.isOpen;
  }

  setMode(mode) {
    this.mode = mode;
    // Баннеры уведомлений живут отдельно от HUD — прячем их вне игры, чтобы не перекрывали меню и итоги
    if (this.hud?.bannerEl) this.hud.bannerEl.style.display = mode === 'play' || mode === 'camera' ? '' : 'none';
    const playing = mode === 'play' || mode === 'camera';
    this.controls.show(this.isTouch && playing && !this.dialogue.isActive);
    this.hud.setVisible(mode === 'play' || mode === 'camera' || mode === 'peephole');
    if (!playing) this.input.releasePointer();
  }

  // ------------------------------------------------------------ состояние мира
  applyStateToWorld() {
    for (const doorObj of this.world.doors.values()) {
      const def = doorObj.def;
      const st = this.gs.door(def.id);
      if (!st._init) Object.assign(st, { open: false, locked: true, chained: false, sealed: false }, def.initial || {}, { _init: true });
      const door = this.world.getDoor(def.id);
      door.state = st;
      door.snap();
    }
    for (const npc of this.npcs.npcs.values()) {
      const rt = npc.runtime;
      const node = rt.node || npc.def.homeNode;
      const p = this.npcs.nav.pos(node);
      npc.node = node; npc.path = []; npc.x = rt.x ?? p.x; npc.z = rt.z ?? p.z; npc.yaw = rt.yaw ?? 0;
      npc.gone = false; npc.talking = false; npc.forceDoorway = false; npc.activity = rt.activity || 'home';
      npc.sync();
    }
    this.npcs.setAnomaly(null);
    if (this.story.noteMesh) { this.story.noteMesh.mesh.removeFromParent(); this.story.noteMesh.hit.removeFromParent(); this.interaction.removeHit(this.story.noteMesh.hit); this.story.noteMesh = null; }
    if (this.story.footprints) { this.story.footprints.removeFromParent(); this.story.footprints = null; }
    this.story.knock = null;
    const p = this.gs.data.player;
    this.player.load(p);
    this.updateFlashlight();
  }

  // ------------------------------------------------------------ меню
  buildMenuProps() {
    // Телефон на столе, экран которого иногда загорается — главный «персонаж» меню
    this.deskPhoneMat = new THREE.MeshBasicMaterial({ color: 0x050606 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.009, 0.155), this.assets.material('plastic_dark'));
    body.position.set(-0.02, 0.76, -7.9);
    body.rotation.y = 0.35;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.14), this.deskPhoneMat);
    screen.rotation.x = -Math.PI / 2;
    screen.position.y = 0.0051;
    body.add(screen);
    this.sm.scene.add(body);
    this.deskPhone = body;
    this.deskPhoneTimer = 3;
  }

  setupMenuCamera() {
    this.cam.override = { position: new THREE.Vector3(-3.5, 1.32, -5.25), quaternion: new THREE.Quaternion(), fov: 62 };
  }

  updateMenuScene(dt) {
    this.menuTime += dt;
    const t = this.menuTime;
    const pos = this.cam.override.position.set(-3.4 + Math.sin(t * 0.07) * 0.25, 1.32 + Math.sin(t * 0.11) * 0.04, -5.3 + Math.cos(t * 0.05) * 0.15);
    const m = new THREE.Matrix4().lookAt(pos, new THREE.Vector3(-0.4 + Math.sin(t * 0.09) * 0.4, 0.95, -8.1), new THREE.Vector3(0, 1, 0));
    this.cam.override.quaternion.setFromRotationMatrix(m);
    this.cam.update(dt, pos, { x: 0, y: 0, pitch: 0, roll: 0 }, false);
    this.deskPhoneTimer -= dt;
    if (this.deskPhoneTimer <= 0) {
      this.deskPhoneTimer = 7 + Math.random() * 6;
      this.deskPhoneMat.color.setHex(0x9fc3d6);
      this.audio.play('vibrate', { pos: { x: -0.02, y: 0.8, z: -7.9 }, pulses: 2, volume: 0.8 });
      setTimeout(() => this.deskPhoneMat.color.setHex(0x050606), 2600);
      if (Math.random() < 0.4) setTimeout(() => this.audio.play('knock', { pos: { x: -0.2, y: 1.3, z: -4.7 }, count: 3, volume: 0.25 }), 3800);
    }
  }

  showMainMenu() {
    this.setMode('menu');
    this.deskPhone.visible = true;
    this.setupMenuCamera();
    this.phone.close();
    this.reader.close();
    if (this.inventoryUI.isOpen) this.inventoryUI.close();
    const latest = this.saves.latest();
    this.menus.showMain({
      canContinue: !!latest,
      continueMeta: latest ? `гл. ${latest.meta.chapter || 1} · ${latest.meta.gameTime} · ${latest.meta.location || ''}` : '',
      onNew: () => this.newGame(),
      onContinue: () => latest && this.loadGame(latest.slot),
      onLoad: (slot) => this.loadGame(slot),
      onChapter2: () => this.startChapter2(),
      onChapter3: () => this.startChapter3(),
      chapter3Meta: this.saves.meta('ch2end') ? 'продолжение после вашей второй главы' : 'можно начать сразу — с исходами по умолчанию',
      chapter2Meta: this.saves.meta('ch1end') ? 'продолжение после вашей первой главы' : 'можно начать сразу — с исходом главы 1 по умолчанию',
    });
  }

  toMainMenu() {
    if (this.mode === 'play' || this.mode === 'pause') this.autosave();
    this.dialogue.end();
    this.audio.stopAll();
    this.menus.hide();
    this.hud.fade(false);
    this.showMainMenu();
  }

  // ------------------------------------------------------------ новая игра / загрузка
  async newGame() {
    this.menus.hide();
    await this.audio.init();
    this.audio.stopAll();
    await this.hud.fade(true, '26 октября. 17:48.\n\nДом №14 по улице Тополиной оцеплен.\nДвери подъезда закрыты снаружи.\nНикто не объяснил почему.\n\n21:40. Квартира 47, шестой этаж.');
    this.gs.reset();
    this.gallery.removeStored();
    this.rel.ensureAll();
    this.chats.initNewGame();
    const p = this.gs.data.player;
    Object.assign(p, { x: START_POSITION.x, z: START_POSITION.z, yaw: START_POSITION.yaw, pitch: -0.05 });
    this.startPlaying();
    await wait(3800);
    this.hud.fade(false);
  }

  async loadGame(slot) {
    const data = this.saves.load(slot);
    if (!data) return;
    this.menus.hide();
    await this.audio.init();
    this.audio.stopAll();
    await this.hud.fade(true, 'Загрузка…');
    this.gs.load(data);
    this.startPlaying();
    this.story.restore();
    await wait(600);
    this.hud.fade(false);
    this.bus.emit('hud:toast', { text: `Загружено: ${fmtTime(this.gs.time)}` });
  }

  /** Глава 2: продолжение сохранения конца главы 1 (или состояние по умолчанию) */
  async startChapter2() {
    this.menus.hide();
    await this.audio.init();
    this.audio.stopAll();
    await this.hud.fade(true, '27 октября. Вторые сутки карантина.\n\nДнём военные подняли к окнам первого этажа сухпайки на верёвках.\nНикто ничего не объяснил.\n\n22:05. Квартира 47.');
    let base = null;
    if ((this.gs.data.chapter || 1) === 1 && this.gs.data.story.ending) base = this.gs.serialize();
    else base = this.saves.load('ch1end');
    if (base) this.gs.load(base); else this.defaultChapter1();
    this.prepareChapter2State();
    this.startPlaying();
    await wait(3800);
    this.hud.fade(false);
  }

  /** Глава 3: продолжение после конца главы 2 (или состояние по умолчанию) */
  async startChapter3() {
    this.menus.hide();
    await this.audio.init();
    this.audio.stopAll();
    await this.hud.fade(true, '28 октября, 05:50.\nДо эвакуации — три часа.\n\nНочью Лиза с седьмого этажа поднялась по лестнице выше девятого.\nИ не вернулась.');
    let base = null;
    if (this.gs.data.chapter === 2 && this.gs.data.story.ending2) base = this.gs.serialize();
    else base = this.saves.load('ch2end');
    if (base) this.gs.load(base);
    else { this.defaultChapter1(); this.prepareChapter2State(); this.gs.data.flags.c2_outcome = 'tape'; this.gs.data.flags.c2_escaped = true; this.inventory.add('tape_1984', 1, { silent: true }); }
    this.prepareChapter3State();
    this.startPlaying();
    await wait(3800);
    this.hud.fade(false);
  }

  prepareChapter3State() {
    const d = this.gs.data;
    d.chapter = 3;
    d.time = C3_START;
    d.story.ch2Outcome = d.flags.c2_outcome || 'tape';
    d.story.ending3 = null;
    for (const f of ['knock_active', 'radio_on', 'lift_dark', 'basement_dark', 'lift_power', 'c2_car_down', 'c2_in_basement', 'f10_dark']) d.flags[f] = false;
    d.world.power = { apartment: true, corridor: true };
    for (const doorObj of this.world.doors.values()) {
      const def = doorObj.def;
      Object.assign(this.gs.door(def.id), { open: false, locked: true, chained: false, sealed: false }, def.initial || {}, { _init: true });
    }
    this.gs.door('d52').sealed = false;
    if (d.flags.zina_missing) Object.assign(this.gs.door('d45'), { chained: true, locked: true });
    d.npcRuntime = {};
    Object.assign(d.player, { x: START_POSITION.x, z: START_POSITION.z, yaw: START_POSITION.yaw, pitch: -0.05, crouch: false, flashlight: false, flashBattery: 100 });
    if (!this.inventory.has('flashlight')) this.inventory.add('flashlight', 1, { silent: true });
    Object.assign(d.phone, { battery: 64, charging: false, activeSequences: [], pendingChoices: {}, notifications: [] });
    this.chats.setVisible('lisa');
    this.chats.injectHistory(nightLog(this.storyCtx));
  }

  /** Если первой главы не было: типичный исход («предупредил соседей») */
  defaultChapter1() {
    this.gs.reset();
    this.rel.ensureAll();
    this.chats.initNewGame();
    for (const f of ['got_flashlight', 'inhaler_delivered', 'blackout', 'breaker_fixed', 'after_vetrov', 'gena_said_home', 'gena_52_done', 'denis_smoking', 'denis_back', 'knock_done', 'knock_warned', 'aftermath_done', 'lift_ghost_done']) this.gs.data.flags[f] = true;
    this.gs.data.inventory = [{ id: 'flashlight', qty: 1 }, { id: 'keys47', qty: 1 }];
    this.gs.data.story.ch1Outcome = 'warned';
    this.gs.data.story.ending = 'warned';
    this.rel.adjust('marina', { trust: 20 });
    this.rel.adjust('zinaida', { trust: 15 });
    this.rel.adjust('denis', { trust: 10 });
  }

  prepareChapter2State() {
    const d = this.gs.data;
    d.chapter = 2;
    d.time = t2('22:05');
    d.story.ch1Outcome = d.story.ch1Outcome || d.story.outcome || 'warned';
    d.story.ending2 = null;
    for (const f of ['knock_active', 'radio_on', 'signal_jam', 'lift_dark', 'basement_dark', 'lift_power', 'c2_car_down', 'c2_in_basement']) d.flags[f] = false;
    d.world.power = { apartment: true, corridor: true };
    d.world.breakerTripped = false;
    for (const doorObj of this.world.doors.values()) {
      const def = doorObj.def;
      const st = this.gs.door(def.id);
      Object.assign(st, { open: false, locked: true, chained: false, sealed: false }, def.initial || {}, { _init: true });
    }
    this.gs.door('d52').sealed = false;
    if (d.flags.zina_missing) Object.assign(this.gs.door('d45'), { chained: true, locked: true });
    d.npcRuntime = {};
    Object.assign(d.player, { x: START_POSITION.x, z: START_POSITION.z, yaw: START_POSITION.yaw, pitch: -0.05, crouch: false, flashlight: false, flashBattery: 100 });
    if (!this.inventory.has('flashlight')) this.inventory.add('flashlight', 1, { silent: true });
    Object.assign(d.phone, { battery: 88, charging: false, activeSequences: [], pendingChoices: {}, notifications: [] });
    this.chats.injectHistory(dayLog(this.storyCtx));
  }

  startPlaying() {
    this.dialogue.end();
    this.applyStateToWorld();
    this.deskPhone.visible = false;
    this.cam.override = null;
    this.cam.focus = null;
    this.player.locked = false;
    this.interaction.enabled = true;
    this.autosaveTimer = AUTOSAVE_INTERVAL;
    this.events.timer = 0;
    this.input.clearPresses();
    this.input.wantsPointerLock = true;
    this.chats.ambientTimer = 70;
    this.setMode('play');
    this.rooms.update(0, this.player.pos);
    this.ch2.restore();
    this.ch3.restore();
    this.home.restore();
    if ((this.gs.data.chapter || 1) !== 3) this.sm.scene.fog.density = 0.075;
    this.ambience.env = this.rooms.room?.ambient || 'home';
    this.audio.setEnvironment(this.ambience.env);
    if ((this.gs.data.chapter || 1) === 1 && this.gs.data.story.ending) this.bus.emit('hud:toast', { text: 'Глава 1 завершена. Можно осмотреться.' });
  }

  autosave() {
    if (this.mode !== 'play' && this.mode !== 'pause') return;
    this.prepareSave();
    this.saves.save('auto', this.rooms.room?.name || '');
  }

  prepareSave() {
    this.player.save();
    this.npcs.save();
  }

  saveGame(slot) {
    this.prepareSave();
    if (this.saves.save(slot, this.rooms.room?.name || '')) this.bus.emit('hud:toast', { text: 'Игра сохранена' });
  }

  // ------------------------------------------------------------ пауза и меню во время игры
  pause() {
    if (this.mode !== 'play' && this.mode !== 'camera') return;
    if (this.mode === 'camera') this.exitCamera();
    this.phone.close();
    this.setMode('pause');
    this.audio.suspend();
    this.menus.showPause({
      onResume: () => this.resume(),
      onSave: (slot) => this.saveGame(slot),
      onLoad: (slot) => { this.audio.resume(); this.loadGame(slot); },
      onMainMenu: () => { this.audio.resume(); this.toMainMenu(); },
    });
  }

  resume() {
    this.menus.hide();
    this.audio.resume();
    this.input.clearPresses();
    this.setMode('play');
  }

  openSettingsFromGame() {
    if (this.mode !== 'play') return;
    this.setMode('pause');
    this.menus.showSettings(() => { this.menus.hide(); this.setMode('play'); });
  }

  // ------------------------------------------------------------ предметы и фонарик
  useItem(id, how) {
    if (how === 'read' || ITEMS[id]?.read) { this.reader.show({ title: ITEMS[id].name, text: ITEMS[id].desc }); return; }
    const use = ITEMS[id]?.use;
    if (use === 'toggle_flashlight') { this.inventoryUI.close(); this.toggleFlashlight(); }
    else if (use === 'use_batteries') {
      if (!this.inventory.has('flashlight')) { this.bus.emit('hud:toast', { text: 'Сначала нужен фонарик' }); return; }
      this.gs.data.player.flashBattery = 100;
      this.inventory.remove('batteries');
      this.bus.emit('hud:toast', { text: 'Батарейки заменены. Фонарик заряжен.' });
      this.updateFlashlight();
    }
  }

  toggleFlashlight() {
    if (!this.inventory.has('flashlight')) { this.bus.emit('hud:toast', { text: 'Фонарика нет. Кажется, он в тумбочке в прихожей.' }); return; }
    const p = this.gs.data.player;
    if (p.flashBattery <= 0 && !p.flashlight) { this.bus.emit('hud:toast', { text: 'Батарейки сели' }); return; }
    p.flashlight = !p.flashlight;
    this.audio.play('switch', { bus: 'sfx', volume: 0.6 });
    this.updateFlashlight();
  }

  updateFlashlight() {
    const p = this.gs.data.player;
    const has = this.inventory.has('flashlight');
    if (!has) p.flashlight = false;
    this.lighting.setFlashlight(p.flashlight, p.flashBattery);
    this.viewModel.setTorch(has, p.flashlight);
    this.controls.setToggle('flashlight', p.flashlight);
    this.controls.setDim('flashlight', !has);
    this.hud.setFlash(has, p.flashlight, p.flashBattery);
  }

  // ------------------------------------------------------------ глазок и камера
  enterPeephole(position, quaternion, onExit) {
    this.phone.close();
    this.peepholeExit = onExit;
    this.cam.override = { position, quaternion, fov: 118 };
    this.hud.showPeephole(true);
    this.setMode('peephole');
    this.interaction.enabled = false;
    this.audio.play('tap', { bus: 'sfx', volume: 0.4 });
    this.peepholeTime = 0;
    // В режиме глазка сенсорные кнопки скрыты — даём явный способ выйти: касание экрана или кнопка
    this.peepholeEl?.remove();
    const exitEl = document.createElement('div');
    exitEl.className = 'peephole-exit';
    exitEl.innerHTML = '<button type="button">Отойти от двери</button>';
    exitEl.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.exitPeephole(true); });
    this.uiRoot.appendChild(exitEl);
    this.peepholeEl = exitEl;
  }

  exitPeephole(byTap = false) {
    if (this.mode !== 'peephole') return;
    if (this.peepholeTime < (byTap ? 0.6 : 0.4)) return;
    this.peepholeEl?.remove();
    this.peepholeEl = null;
    this.cam.override = null;
    this.hud.showPeephole(false);
    this.setMode('play');
    this.interaction.enabled = true;
    const cb = this.peepholeExit; this.peepholeExit = null;
    cb?.();
  }

  enterCamera() {
    if (this.mode !== 'play') return;
    if (this.gs.data.phone.battery <= 0) { this.bus.emit('hud:toast', { text: 'Телефон разряжен' }); return; }
    this.setMode('camera');
    this.interaction.enabled = false;
    this.viewModel.setPhone(true);
    this.hud.showViewfinder(() => this.takePhoto(), () => this.exitCamera());
  }

  exitCamera() {
    if (this.mode !== 'camera') return;
    this.hud.hideViewfinder();
    this.viewModel.setPhone(false);
    this.interaction.enabled = true;
    this.setMode('play');
  }

  takePhoto() {
    const prev = this.viewModel.root.visible;
    this.viewModel.root.visible = false;
    const flashBoost = this.lighting.flashlight.intensity;
    this.lighting.flashlight.intensity = Math.max(flashBoost, 6);
    const data = this.sm.capturePhoto({ fov: 66 });
    this.lighting.flashlight.intensity = flashBoost;
    this.viewModel.root.visible = prev;
    const tags = this.story.tagPhoto(this.sm.photoCam);
    const caption = tags.includes('door52') ? 'Дверь 52' : tags.includes('gena52') ? 'Лапин у 52-й' : this.rooms.room?.name || '';
    this.gallery.addCamera(data, tags, caption);
    this.hud.flashWhite();
    this.audio.play('shutter', { bus: 'ui' });
    this.bus.emit('hud:toast', { text: 'Снимок сохранён в «Галерею»' });
  }

  /** Кадр камеры наблюдения Дениса: настоящий рендер коридора с фигурой у 52-й */
  async renderCamFrame(key) {
    const frames = { denis_cam_1: ['26.10.  21:13:07', true], denis_cam_2: ['26.10.  21:41:52', true], denis_cam_3: ['26.10.  21:53:30', false] };
    const f = frames[key];
    if (!f) return null;
    const prevSpot = this.npcs.echoSpot;
    const data = this.sm.capturePhoto({
      position: new THREE.Vector3(-4.0, 1.6, 0.98), target: new THREE.Vector3(8, 1.1, 0.5), fov: 100, exposure: 2.4, anomalies: true,
      beforeRender: () => { this.npcs.setAnomaly(f[1] ? 'cam52' : null); this.viewModel.root.visible = false; },
      afterRender: () => { this.npcs.setAnomaly(prevSpot); this.viewModel.root.visible = true; },
    });
    return stampCamFrame(data, `CAM-49   ${f[0]}`);
  }

  // ------------------------------------------------------------ игровой цикл
  /** Сколько кадров в секунду нужно сейчас. На экранах 90/120 Гц браузер вызывает rAF чаще — это и греет телефон. */
  frameBudget() {
    const cap = Number(this.settings.get('fpsLimit')) || 60;
    if (this.mode === 'pause' || this.mode === 'ending') return 0;         // картинка неподвижна
    if (this.mode === 'menu' || this.mode === 'boot') return Math.min(cap, 30);
    if (this.reader.isOpen || this.inventoryUI.isOpen) return Math.min(cap, 20);
    if (this.phone.isOpen) return Math.min(cap, 30);                        // мир за телефоном затемнён
    return cap;
  }

  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    const budget = this.frameBudget();
    const elapsed = now - (this.last || now);
    if (budget === 0) {
      // Пауза: дорисовываем пару кадров после смены режима и больше не нагружаем GPU
      if (this.staticFrames > 1) { this.last = now; return; }
      this.staticFrames = (this.staticFrames || 0) + 1;
    } else {
      this.staticFrames = 0;
      if (this.last && elapsed < 1000 / budget - 1.5) return;
    }
    const dt = Math.min(0.05, Math.max(0.0001, elapsed / 1000));
    this.last = now;
    try {
      this.physics.beginFrame();
      this.update(dt);
      this.sm.render();
    } catch (e) {
      console.error('[Game] ошибка кадра', e);
    }
    if (budget >= 45) this.sm.trackFrame(dt);
  }

  update(dt) {
    const mode = this.mode;
    this.world.exterior.update(dt);
    for (const d of this.world.doors.values()) d.update(dt);
    if (mode === 'menu' || mode === 'boot') {
      this.updateMenuScene(dt);
      this.lighting.update(dt, this.sm.camera.position, 'room47');
      return;
    }
    if (mode === 'pause' || mode === 'ending') return;

    const gs = this.gs;
    gs.data.stats.playSeconds += dt;
    gs.data.time += dt * (gs.data.timeScale / 60);
    if (mode === 'peephole') this.peepholeTime += dt;
    this.handleInput();

    const look = this.input.takeLook();
    const lookAllowed = !this.player.locked && !this.reader.isOpen && !this.inventoryUI.isOpen && mode !== 'peephole';
    if (lookAllowed) this.cam.applyLook(look.dx, look.dy);
    this.input.wantsPointerLock = mode === 'play' && !this.anyOverlay();
    this.player.locked = this.dialogue.isActive || mode === 'peephole' || this.reader.isOpen || this.inventoryUI.isOpen;

    this.player.update(dt, this.input);
    this.rooms.update(dt, this.player.pos);
    this.viewModel.update(dt, this.player.speed, this.player.bob);
    this.interaction.enabled = mode === 'play' && !this.phone.isOpen && !this.dialogue.isActive && !this.reader.isOpen && !this.inventoryUI.isOpen;
    this.interaction.update(dt, this.player.pos);
    this.npcs.update(dt, { x: this.player.pos.x, y: this.player.eye.y, z: this.player.pos.z }, this.storyCtx);
    this.lighting.update(dt, this.player.pos, this.rooms.current);
    this.chats.update(dt);
    this.contacts.update(dt);
    this.events.update(dt);
    this.story.update(dt);
    this.ch2.update(dt);
    this.ch3.update(dt);
    this.home.update(dt);
    this.ambience.update(dt, this.player.pos);
    this.audio.updateListener(this.sm.camera, dt);
    this.phone.update(dt, { chargeOk: this.rooms.current === 'room47' });

    // Второстепенное — раз в четверть секунды
    this.slowTimer -= dt;
    if (this.slowTimer <= 0) {
      this.slowTimer = 0.25;
      const p = gs.data.player;
      if (p.flashlight) {
        p.flashBattery = Math.max(0, p.flashBattery - 0.25 * (gs.data.timeScale / 60) / 1.2);
        if (p.flashBattery <= 0) { p.flashlight = false; this.bus.emit('hud:toast', { text: 'Фонарик погас — сели батарейки' }); }
      }
      this.updateFlashlight();
      this.phone.setSignal(this.computeSignal());
      this.controls.setBadge(this.chats.totalUnread());
      this.controls.setGlow('phone', this.chats.totalUnread() > 0 || !!this.contacts.active);
      this.controls.setGlow('interact', !!this.interaction.current);
    }
    this.autosaveTimer -= dt;
    if (this.autosaveTimer <= 0) { this.autosaveTimer = AUTOSAVE_INTERVAL; this.autosave(); }
  }

  computeSignal() {
    if (this.gs.flag('knock_active')) return 1;
    let s = this.rooms.room?.signal ?? 1;
    if (this.gs.flag('signal_jam')) s = 0;
    return Math.max(0, Math.min(3, s));
  }

  handleInput() {
    const inp = this.input;
    if (inp.consume('pause')) {
      if (this.reader.isOpen) this.reader.close();
      else if (this.inventoryUI.isOpen) this.inventoryUI.close();
      else if (this.mode === 'peephole') this.exitPeephole();
      else if (this.mode === 'camera') this.exitCamera();
      else if (this.phone.isOpen) this.phone.close();
      else if (!this.dialogue.isActive) this.pause();
      return;
    }
    if (this.mode === 'peephole') {
      if (inp.consume('interact') || inp.consume('confirm')) this.exitPeephole();
      inp.clearPresses();
      return;
    }
    if (this.reader.isOpen) { if (inp.consume('interact') || inp.consume('confirm')) this.reader.close(); inp.clearPresses(); return; }
    if (inp.consume('phone')) {
      if (this.mode === 'camera') this.exitCamera();
      if (!this.dialogue.isActive && !this.inventoryUI.isOpen) this.phone.toggle();
    }
    if (inp.consume('bag') && !this.dialogue.isActive) { this.phone.close(); this.inventoryUI.toggle(); }
    if (inp.consume('flashlight')) this.toggleFlashlight();
    if (inp.consume('crouch')) this.controls.setToggle('crouch', this.player.toggleCrouch());
    if (inp.consume('interact')) {
      if (this.mode === 'camera') this.takePhoto();
      else if (!this.dialogue.isActive && !this.phone.isOpen && !this.inventoryUI.isOpen) this.interaction.interact();
    }
    inp.clearPresses();
  }
}

function nextFrame() { return new Promise((r) => requestAnimationFrame(() => r())); }
function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
