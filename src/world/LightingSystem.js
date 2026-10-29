// Освещение: фиксированный пул точечных источников, который «переезжает» к ближайшим включённым светильникам.
// Число источников не меняется во время игры, поэтому шейдеры не перекомпилируются, а нагрузка предсказуема.
import * as THREE from 'three';

export class LightingSystem {
  constructor(sceneManager, world, gameState, bus) {
    this.sm = sceneManager;
    this.world = world;
    this.gs = gameState;
    this.bus = bus;
    const scene = sceneManager.scene;

    this.hemi = new THREE.HemisphereLight(0x5a6670, 0x1a1612, 0.55);
    scene.add(this.hemi);
    // Свет улицы через окна: слабый холодный направленный свет с севера
    this.moon = new THREE.DirectionalLight(0x8094b0, 0.22);
    this.moon.position.set(-3, 8, -12);
    scene.add(this.moon);

    this.pool = [];
    const n = sceneManager.profile.poolLights;
    for (let i = 0; i < n; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 6, 2);
      l.userData = { fixture: null, target: 0 };
      scene.add(l);
      this.pool.push(l);
    }

    // Фонарик игрока
    this.flashlight = new THREE.SpotLight(0xfff1dc, 0, 16, 0.5, 0.55, 1.6);
    this.flashlight.castShadow = sceneManager.profile.shadows;
    if (this.flashlight.castShadow) {
      this.flashlight.shadow.mapSize.set(512, 512);
      this.flashlight.shadow.camera.near = 0.1;
      this.flashlight.shadow.bias = -0.0015;
    }
    this.flashTarget = new THREE.Object3D();
    sceneManager.camera.add(this.flashlight);
    sceneManager.camera.add(this.flashTarget);
    this.flashlight.position.set(0.18, -0.16, 0.05);
    this.flashTarget.position.set(0.05, -0.1, -5);
    this.flashlight.target = this.flashTarget;
    this.flashIntensity = 0;

    this.fixtures = world.fixtures.map((f) => ({ ...f, level: 0, flick: 1, flickTimer: Math.random() * 3, color: new THREE.Color(f.def.color) }));
    this.byId = new Map(this.fixtures.map((f) => [f.def.id, f]));
    this.assignTimer = 0;
    this.burst = 0;            // общий сюжетный «сбой» света
    this.burstCircuit = null;
    this.time = 0;
    this.playerPos = new THREE.Vector3();

    bus.on('lights:flicker', ({ duration = 1.5, circuit = 'corridor' } = {}) => { this.burst = duration; this.burstCircuit = circuit; });
  }

  switchState(fx) {
    if (!fx.def.switch) return true;
    const p = this.gs.prop(fx.def.switch);
    return p.on === undefined ? fx.def.on : p.on;
  }

  isPowered(fx) {
    const w = this.gs.data.world;
    const c = fx.def.circuit;
    if (c === 'apartment') return w.power.apartment;
    if (c === 'corridor') return w.power.corridor;
    if (c === 'emergency') return !w.power.corridor;
    if (c === 'neighbor') return !this.gs.flag('neighbors_dark');
    return true;
  }

  isOn(fx) {
    if (this.gs.data.world.brokenLamps.includes(fx.def.id)) return false;
    if (fx.def.glimpse) {
      const door = this.world.getDoor(fx.def.glimpse);
      if (!door || door.isClosed) return false;
    }
    if (fx.def.circuit === 'emergency') return this.isPowered(fx);
    return this.isPowered(fx) && this.switchState(fx);
  }

  toggleSwitch(switchId) {
    const fx = this.fixtures.find((f) => f.def.switch === switchId);
    if (!fx) return false;
    const p = this.gs.prop(switchId);
    p.on = !(p.on === undefined ? fx.def.on : p.on);
    this.bus.emit('sound:play', { name: 'switch', pos: fx.group.position });
    return p.on;
  }

  /** Уровень освещённости в точке (грубая оценка для подсказок и поведения NPC). */
  lightAt(x, z) {
    let sum = 0;
    for (const fx of this.fixtures) {
      if (fx.level <= 0.01) continue;
      const d2 = (fx.def.x - x) ** 2 + (fx.def.z - z) ** 2;
      if (d2 < fx.def.range * fx.def.range) sum += fx.level * (1 - Math.sqrt(d2) / fx.def.range);
    }
    return sum;
  }

  setFlashlight(on, battery) {
    const base = on ? 6 * (0.35 + 0.65 * Math.min(1, battery / 40)) : 0;
    this.flashIntensity = base;
  }

  update(dt, playerPos, playerRoom) {
    this.time += dt;
    this.playerPos.copy(playerPos);
    if (this.burst > 0) this.burst -= dt;

    // Мерцание и включение/выключение каждого светильника
    for (const fx of this.fixtures) {
      const on = this.isOn(fx);
      let target = on ? 1 : 0;
      if (on) {
        fx.flickTimer -= dt;
        const kind = fx.def.flicker;
        if (kind && fx.flickTimer <= 0) {
          fx.flick = Math.random() < (kind === 'bad' ? 0.5 : 0.25) ? Math.random() * 0.3 : 1;
          fx.flickTimer = kind === 'bad' ? 0.05 + Math.random() * (fx.flick < 1 ? 0.15 : 2.5) : (fx.flick < 1 ? 0.06 : 3 + Math.random() * 8);
        }
        if (this.burst > 0 && (fx.def.circuit === this.burstCircuit || this.burstCircuit === 'all')) {
          target *= Math.random() < 0.5 ? 0.05 : 1;
        } else {
          target *= fx.flick;
        }
      }
      const speed = target > fx.level ? 18 : 10;
      fx.level += (target - fx.level) * Math.min(1, dt * speed);
      if (fx.glowMat) {
        const c = fx.color;
        const k = 0.08 + fx.level * 0.92;
        if (fx.glowMat.isMeshBasicMaterial) fx.glowMat.color.copy(c).multiplyScalar(k);
        else if (fx.glowMat.emissive) fx.glowMat.emissive.copy(c).multiplyScalar(fx.level);
      }
    }

    // Переназначение пула раз в 0.15 с
    this.assignTimer -= dt;
    if (this.assignTimer <= 0) {
      this.assignTimer = 0.15;
      this.assign(playerRoom);
    }
    for (const l of this.pool) {
      const fx = l.userData.fixture;
      const target = fx ? fx.def.intensity * fx.level : 0;
      l.intensity += (target - l.intensity) * Math.min(1, dt * 12);
    }

    // Фонарик: лёгкое «дыхание» и сбои на низком заряде
    const bat = this.gs.data.player.flashBattery;
    let fl = this.flashIntensity;
    if (fl > 0 && bat < 15) fl *= Math.random() < 0.06 ? 0.15 : 1;
    this.flashlight.intensity += (fl - this.flashlight.intensity) * Math.min(1, dt * 20);
  }

  assign(playerRoom) {
    const px = this.playerPos.x, pz = this.playerPos.z;
    const scored = [];
    for (const fx of this.fixtures) {
      if (fx.level < 0.02 && !this.isOn(fx)) continue;
      const d2 = (fx.def.x - px) ** 2 + (fx.def.z - pz) ** 2;
      if (d2 > 22 * 22) continue;
      let score = (fx.def.intensity * Math.max(fx.level, 0.3)) / (1 + d2 * 0.12);
      if (playerRoom && fx.def.room === playerRoom) score *= 2.5;
      scored.push({ fx, score });
    }
    scored.sort((a, b) => b.score - a.score);
    const chosen = scored.slice(0, this.pool.length).map((s) => s.fx);
    // Сохраняем уже занятые слоты, чтобы свет не «прыгал»
    const free = [];
    for (const l of this.pool) {
      if (l.userData.fixture && chosen.includes(l.userData.fixture)) chosen.splice(chosen.indexOf(l.userData.fixture), 1);
      else free.push(l);
    }
    for (const l of free) {
      const fx = chosen.shift() || null;
      l.userData.fixture = fx;
      if (fx) {
        l.position.set(fx.def.x, fx.def.y - (fx.def.type === 'none' ? 0 : 0.18), fx.def.z);
        l.color.setHex(fx.def.color);
        l.distance = fx.def.range;
        l.intensity = 0;
      }
    }
  }
}
