// Все жильцы этажа: создание, расписания, ответы на стук, «разговор в дверях»,
// а также аномальная фигура, видимая только на фотографиях (слой LAYER_ANOMALY).
import * as THREE from 'three';
import { CHARACTERS } from '../data/characters.js';
import { NPCController } from './NPCController.js';
import { NavGraph, evaluateSchedule } from './NPCSchedule.js';
import { HumanoidModel, GltfHumanoid } from './HumanoidModel.js';
import { LAYER_ANOMALY } from '../core/SceneManager.js';

const ANOMALY_SPOTS = {
  stair_glass: { x: 11.75, z: 0.25, yaw: -Math.PI / 2, layer: LAYER_ANOMALY },
  corridor_west: { x: -10.35, z: 0.1, yaw: Math.PI / 2, layer: 0 },
  door47: { x: 0.05, z: 0.42, yaw: Math.PI, layer: 0, tall: true },
  cam52: { x: 8, z: 0.45, yaw: 0, layer: 0 },
  zina_room: { x: -9.4, z: -6.3, yaw: 0.5, layer: LAYER_ANOMALY },
};

export class NPCManager {
  constructor(deps) {
    this.deps = deps;   // world, gs, bus, physics, scene, interaction, lambert, assets
    this.nav = new NavGraph();
    this.npcs = new Map();
    this.scheduleTimer = 0;
    this.ctx = null;
    this.inDialogue = null;
    this.pendingDoor = null;
    this.arrivals = new Map();
  }

  init() {
    const { scene, interaction } = this.deps;
    for (const [id, def] of Object.entries(CHARACTERS)) {
      if (!def.npc) continue;
      const npc = new NPCController(id, def, { ...this.deps, nav: this.nav });
      scene.add(npc.root);
      interaction.addHit(npc.hit);
      this.npcs.set(id, npc);
      this.tryGltf(npc);
    }
    // Аномальная фигура: высокая, худая, без лица, руки длиннее нормы
    this.echo = new HumanoidModel({ height: 1.95, build: 0.78, skin: 0x0d0e0d, hair: 0x050505, hairStyle: 'none_echo', top: 0x0b0c0c, bottom: 0x070808, extra: [] }, { echo: true, lambert: this.deps.lambert });
    this.echo.root.visible = false;
    scene.add(this.echo.root);
    this.echoSpot = null;
  }

  async tryGltf(npc) {
    const url = this.deps.assets.manifest?.models?.[npc.id];
    if (!url) return;
    const gltf = await this.deps.assets.loadModel(`assets/models/${url}`);
    if (!gltf) return;
    npc.root.remove(npc.model.root);
    npc.model = new GltfHumanoid(gltf, npc.def.look);
    npc.root.add(npc.model.root);
  }

  get(id) { return this.npcs.get(id); }

  // ------------------------------------------------------------ аномалия
  setAnomaly(spotId, { variant = null } = {}) {
    this.echoSpot = spotId;
    if (!spotId) { this.echo.root.visible = false; return; }
    const s = ANOMALY_SPOTS[spotId];
    this.echo.root.visible = true;
    this.echo.root.position.set(s.x, 0, s.z);
    this.echo.root.rotation.y = s.yaw;
    this.echo.root.scale.setScalar(s.tall ? 1.05 : 1);
    this.echo.setLayer(s.layer);
    this.echoVariant = variant;
  }

  anomalyAt(spotId) { return this.echoSpot === spotId; }
  anomalyPos() { return this.echo.root.visible ? this.echo.root.position : null; }

  // ------------------------------------------------------------ расписания
  update(dt, playerPos, ctx) {
    this.ctx = ctx;
    this.scheduleTimer -= dt;
    if (this.scheduleTimer <= 0) {
      this.scheduleTimer = 0.3;
      for (const npc of this.npcs.values()) this.applySchedule(npc, ctx);
    }
    for (const npc of this.npcs.values()) {
      const wasMoving = npc.moving;
      npc.update(dt, playerPos);
      if (wasMoving && !npc.moving) this.deps.bus.emit('npc:arrived', { id: npc.id, node: npc.node });
    }
    if (this.echo.root.visible) this.echo.update(dt, { speed: 0, talking: false, lookAt: null, activity: 'idle', headTilt: 0.35, roll: 0.25 });
  }

  applySchedule(npc, ctx) {
    if (npc.talking || npc.forceDoorway || this.inDialogue === npc.id) return;
    const rule = evaluateSchedule(npc.def, ctx);
    if (rule.at === 'gone') {
      if (!npc.gone) { npc.gone = true; this.deps.bus.emit('npc:gone', { id: npc.id }); }
      return;
    }
    npc.gone = false;
    npc.activity = rule.activity || 'idle';
    if (rule.at === 'patrol') {
      const route = rule.route;
      if (!npc.moving) {
        npc.patrolIndex = (npc.patrolIndex + 1) % route.length;
        npc.goTo(route[npc.patrolIndex]);
      }
      return;
    }
    npc.goTo(rule.at);
  }

  // ------------------------------------------------------------ двери и разговоры
  /** NPC подходит к своей двери и открывает её (с цепочкой, если есть). onReady — когда можно говорить. */
  answerDoor(id, onReady, { chain = false } = {}) {
    const npc = this.get(id);
    if (!npc) return;
    npc.forceDoorway = true;
    const inNode = `in${npc.def.apartment}`;
    const finish = () => {
      const st = this.deps.gs.door(npc.def.door);
      st.open = true;
      st.chained = chain;
      this.deps.world.getDoor(npc.def.door).apply();
      this.deps.bus.emit('sound:play', { name: chain ? 'chain' : 'lock', pos: this.deps.world.getDoor(npc.def.door).sidePoint(1, 0.1) });
      setTimeout(() => this.deps.bus.emit('sound:play', { name: 'door_open', pos: this.deps.world.getDoor(npc.def.door).sidePoint(1, 0.1), volume: 0.8 }), 350);
      setTimeout(onReady, 900);
    };
    if (npc.node === inNode && !npc.moving) { finish(); return; }
    npc.goTo(inNode);
    const off = this.deps.bus.on('npc:arrived', ({ id: aid, node }) => {
      if (aid === id && node === inNode) { off(); finish(); }
    });
  }

  /** Закончить разговор у двери: закрыть дверь (если не пригласили) и вернуться к делам */
  leaveDoor(id, { keepOpen = false } = {}) {
    const npc = this.get(id);
    if (!npc) return;
    npc.talking = false;
    npc.forceDoorway = false;
    if (!keepOpen) {
      const st = this.deps.gs.door(npc.def.door);
      if (st.open) {
        st.open = false;
        st.chained = npc.def.door === 'd48';
        this.deps.world.getDoor(npc.def.door).apply();
        this.deps.bus.emit('sound:play', { name: 'door_close', pos: this.deps.world.getDoor(npc.def.door).sidePoint(1, 0.1) });
        setTimeout(() => this.deps.bus.emit('sound:play', { name: 'lock', pos: this.deps.world.getDoor(npc.def.door).sidePoint(1, 0.1) }), 500);
      }
    }
    this.scheduleTimer = 0;
  }

  /** Кто живёт за дверью и находится дома */
  occupant(doorId) {
    for (const npc of this.npcs.values()) {
      if (npc.def.door === doorId && !npc.gone && npc.isInside()) return npc;
    }
    return null;
  }

  save() { for (const npc of this.npcs.values()) npc.save(); }

  /** Видит ли NPC точку (для «свидетелей» событий): дистанция и отсутствие стен */
  canSee(id, x, z, maxDist = 7) {
    const npc = this.get(id);
    if (!npc || npc.gone || !npc.root.visible) return false;
    if (Math.hypot(npc.x - x, npc.z - z) > maxDist) return false;
    return !this.deps.physics.segmentBlocked(npc.x, npc.z, x, z);
  }
}

export { ANOMALY_SPOTS };
