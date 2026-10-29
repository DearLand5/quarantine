// Персонаж игрока: движение с инерцией, бег, приседание, столкновения, шаги и покачивание камеры.
import * as THREE from 'three';

const WALK = 1.55, RUN = 3.05, CROUCH = 0.85, PHONE_WALK = 0.75;
const EYE = 1.62, EYE_CROUCH = 1.08;
const RADIUS = 0.26;

export class PlayerController {
  constructor(physics, camera, bus, gameState) {
    this.physics = physics;
    this.cam = camera;
    this.bus = bus;
    this.gs = gameState;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector2();
    this.crouch = 0;
    this.crouching = false;
    this.locked = false;          // диалог, глазок, кат-сцена
    this.slowMode = false;        // телефон открыт — медленная ходьба
    this.stamina = 1;
    this.bobPhase = 0;
    this.stepAccum = 0;
    this.bob = { x: 0, y: 0, pitch: 0, roll: 0 };
    this.isRunning = false;
    this.speed = 0;
    this.eye = new THREE.Vector3();
    this.surface = 'tile';
  }

  load(p) {
    this.pos.set(p.x, 0, p.z);
    this.cam.yaw = p.yaw;
    this.cam.pitch = p.pitch || 0;
    this.crouching = !!p.crouch;
    this.crouch = this.crouching ? 1 : 0;
    this.vel.set(0, 0);
  }

  save() {
    const p = this.gs.data.player;
    p.x = this.pos.x; p.z = this.pos.z; p.yaw = this.cam.yaw; p.pitch = this.cam.pitch; p.crouch = this.crouching;
  }

  toggleCrouch() { this.crouching = !this.crouching; return this.crouching; }

  update(dt, input) {
    const move = this.locked ? { x: 0, y: 0 } : input.move();
    const wantsRun = !this.locked && !this.slowMode && !this.crouching && input.running && move.y > 0.2;
    // Выносливость: бег ограничен, после истощения нужна передышка
    if (wantsRun && this.speed > 0.5) this.stamina = Math.max(0, this.stamina - dt * 0.12);
    else this.stamina = Math.min(1, this.stamina + dt * (this.speed < 0.2 ? 0.25 : 0.12));
    const canRun = this.stamina > 0.05;
    this.isRunning = wantsRun && canRun;
    let max = this.crouching ? CROUCH : this.isRunning ? RUN : WALK;
    if (this.slowMode) max = Math.min(max, PHONE_WALK);

    // Желаемая скорость в мировых осях
    const fx = -Math.sin(this.cam.yaw), fz = -Math.cos(this.cam.yaw);
    const rx = Math.cos(this.cam.yaw), rz = -Math.sin(this.cam.yaw);
    const tx = (fx * move.y + rx * move.x) * max;
    const tz = (fz * move.y + rz * move.x) * max;
    const accel = Math.hypot(tx, tz) > Math.hypot(this.vel.x, this.vel.y) ? 9 : 12;
    this.vel.x += (tx - this.vel.x) * Math.min(1, dt * accel);
    this.vel.y += (tz - this.vel.y) * Math.min(1, dt * accel);
    if (Math.abs(this.vel.x) < 0.001) this.vel.x = 0;
    if (Math.abs(this.vel.y) < 0.001) this.vel.y = 0;

    const [nx, nz] = this.physics.move(this.pos.x, this.pos.z, this.vel.x * dt, this.vel.y * dt, RADIUS);
    const moved = Math.hypot(nx - this.pos.x, nz - this.pos.z);
    this.pos.x = nx; this.pos.z = nz;
    this.speed = moved / Math.max(dt, 1e-4);

    // Приседание — плавно
    this.crouch += ((this.crouching ? 1 : 0) - this.crouch) * Math.min(1, dt * 8);
    const eyeH = EYE + (EYE_CROUCH - EYE) * this.crouch;

    // Покачивание и шаги
    const sp = Math.min(this.speed, RUN);
    const stride = this.isRunning ? 1.45 : this.crouching ? 0.7 : 1.05;
    this.bobPhase += (moved / stride) * Math.PI * 2 * 0.5;
    const amp = sp < 0.05 ? 0 : (this.isRunning ? 1.0 : this.crouching ? 0.35 : 0.55);
    const t = performance.now() / 1000;
    const idleBreath = Math.sin(t * 1.4) * 0.006;
    this.bob.y += ((Math.abs(Math.sin(this.bobPhase)) * 0.045 - 0.02) * amp + idleBreath - this.bob.y) * Math.min(1, dt * 12);
    this.bob.x += (Math.cos(this.bobPhase) * 0.025 * amp - this.bob.x) * Math.min(1, dt * 12);
    this.bob.roll += (Math.cos(this.bobPhase) * 0.008 * amp - this.bob.roll) * Math.min(1, dt * 8);
    this.bob.pitch = Math.sin(this.bobPhase * 2) * 0.004 * amp;

    this.stepAccum += moved;
    const stepLen = this.isRunning ? 0.78 : this.crouching ? 0.5 : 0.62;
    if (this.stepAccum >= stepLen) {
      this.stepAccum = 0;
      this.bus.emit('player:footstep', { surface: this.surface, run: this.isRunning, crouch: this.crouching, pos: this.pos });
    }

    this.eye.set(this.pos.x, eyeH, this.pos.z);
    this.cam.update(dt, this.eye, this.bob, this.isRunning && this.speed > 1.8);
  }

  get radius() { return RADIUS; }
}
