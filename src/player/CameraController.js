// Камера от первого лица: углы обзора, покачивание, встряска, FOV при беге, режимы «глазок» и «фокус на собеседнике».
import * as THREE from 'three';

export class CameraController {
  constructor(sceneManager, settings) {
    this.sm = sceneManager;
    this.camera = sceneManager.camera;
    this.settings = settings;
    this.yaw = 0;
    this.pitch = 0;
    this.shake = 0;
    this.shakeTime = 0;
    this.fovKick = 0;
    this.focus = null;            // { target: Vector3, strength }
    this.override = null;         // { position, quaternion, fov } — глазок и сцены
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.tmpV = new THREE.Vector3();
    this.tmpQ = new THREE.Quaternion();
  }

  applyLook(dx, dy) {
    const sens = this.settings.get('sensitivity') * 0.0022;
    const inv = this.settings.get('invertY') ? -1 : 1;
    this.yaw -= dx * sens;
    this.pitch -= dy * sens * inv;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.35, 1.35);
  }

  addShake(amount) { this.shake = Math.min(1.2, this.shake + amount); }

  /** Плавно повернуть взгляд к точке (используется при начале диалога) */
  lookAtPoint(target, eye, dt, speed = 4) {
    const dx = target.x - eye.x, dy = target.y - eye.y, dz = target.z - eye.z;
    const yaw = Math.atan2(-dx, -dz);
    const pitch = Math.atan2(dy, Math.hypot(dx, dz));
    let dyaw = yaw - this.yaw;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    const k = Math.min(1, dt * speed);
    this.yaw += dyaw * k;
    this.pitch += (pitch - this.pitch) * k;
  }

  update(dt, eye, bob, running) {
    const cam = this.camera;
    if (this.focus) this.lookAtPoint(this.focus.target, eye, dt, this.focus.speed || 3);
    this.shakeTime += dt;
    this.shake = Math.max(0, this.shake - dt * 1.2);
    const sh = this.shake * this.shake;
    const sx = (Math.sin(this.shakeTime * 37) + Math.sin(this.shakeTime * 23)) * 0.012 * sh;
    const sy = (Math.cos(this.shakeTime * 31) + Math.sin(this.shakeTime * 19)) * 0.012 * sh;

    if (this.override) {
      cam.position.copy(this.override.position);
      cam.quaternion.copy(this.override.quaternion);
      const fov = this.override.fov || this.sm.baseFov;
      if (Math.abs(cam.fov - fov) > 0.1) { cam.fov = fov; cam.updateProjectionMatrix(); }
      return;
    }
    const useBob = this.settings.get('headBob');
    cam.position.set(eye.x + (useBob ? bob.x : 0), eye.y + (useBob ? bob.y : 0), eye.z);
    this.euler.set(this.pitch + sy + (useBob ? bob.pitch : 0), this.yaw + sx, useBob ? bob.roll : 0);
    cam.quaternion.setFromEuler(this.euler);
    const targetKick = running ? 5 : 0;
    this.fovKick += (targetKick - this.fovKick) * Math.min(1, dt * 4);
    const fov = this.sm.baseFov + this.fovKick;
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = fov; cam.updateProjectionMatrix(); }
  }

  forward(out = new THREE.Vector3()) {
    return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }
}
