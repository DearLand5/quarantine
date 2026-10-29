// Рендерер, сцена, камера, профили качества и адаптивное разрешение.
import * as THREE from 'three';

export const QUALITY_PROFILES = {
  low:    { maxPixelRatio: 1.0, poolLights: 3, shadows: false, anisotropy: 1, lambert: true,  minScale: 0.55, textureSize: 256 },
  medium: { maxPixelRatio: 1.5, poolLights: 4, shadows: false, anisotropy: 2, lambert: false, minScale: 0.6,  textureSize: 512 },
  high:   { maxPixelRatio: 2.0, poolLights: 6, shadows: true,  anisotropy: 4, lambert: false, minScale: 0.7,  textureSize: 512 },
};

// Слои камеры: 0 — обычный мир; 2 — «аномалии», видимые только на фотографиях.
export const LAYER_ANOMALY = 2;

export class SceneManager {
  constructor(canvas, bus, settings) {
    this.canvas = canvas;
    this.bus = bus;
    this.settings = settings;
    this.qualityName = settings.resolveQuality();
    this.profile = QUALITY_PROFILES[this.qualityName];

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.qualityName === 'high',
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = this.profile.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setClearColor(0x050606, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x070808, 0.075);
    this.scene.background = new THREE.Color(0x050606);

    this.camera = new THREE.PerspectiveCamera(70, 1, 0.05, 140);
    this.camera.layers.enable(0);
    this.scene.add(this.camera);

    this.dynamicScale = 1;
    this.frameTimes = [];
    this.adaptTimer = 0;
    this.photoTarget = null;

    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    window.addEventListener('orientationchange', () => setTimeout(this.resize, 250));
    this.unsub = bus.on('settings:changed', ({ key }) => {
      if (key === 'renderScale' || key === 'quality') this.resize();
    });
    this.resize();
  }

  get maxAnisotropy() { return Math.min(this.profile.anisotropy, this.renderer.capabilities.getMaxAnisotropy()); }

  pixelRatio() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.profile.maxPixelRatio);
    return Math.max(0.4, dpr * this.settings.get('renderScale') * this.dynamicScale);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setPixelRatio(this.pixelRatio());
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // На вертикальных экранах расширяем угол обзора, чтобы не было ощущения «туннеля».
    this.baseFov = w < h ? 82 : 70;
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
    this.bus.emit('viewport:resize', { w, h });
  }

  // Адаптивное разрешение: следим за средним временем кадра и плавно меняем масштаб.
  trackFrame(dt) {
    if (!this.settings.get('adaptiveResolution')) return;
    this.frameTimes.push(dt);
    this.adaptTimer += dt;
    if (this.adaptTimer < 2) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    this.adaptTimer = 0;
    const fps = 1 / avg;
    let next = this.dynamicScale;
    if (fps < 38) next -= 0.12;
    else if (fps < 48) next -= 0.06;
    else if (fps > 57) next += 0.05;
    next = THREE.MathUtils.clamp(next, this.profile.minScale, 1);
    if (Math.abs(next - this.dynamicScale) > 0.01) {
      this.dynamicScale = next;
      this.renderer.setPixelRatio(this.pixelRatio());
      this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    }
  }

  render(camera = this.camera) {
    this.renderer.render(this.scene, camera);
  }

  /**
   * Снимок «камерой телефона»: рендер в отдельную цель с включённым слоем аномалий.
   * Возвращает JPEG dataURL. Обработка в 2D-канвасе имитирует шум и экспозицию мобильной камеры.
   */
  capturePhoto({ position, target, quaternion, fov = 68, width = 480, height = 360, exposure = 1.9, anomalies = true, beforeRender, afterRender } = {}) {
    if (!this.photoTarget || this.photoTarget.width !== width) {
      this.photoTarget?.dispose();
      this.photoTarget = new THREE.WebGLRenderTarget(width, height, { colorSpace: THREE.SRGBColorSpace });
      this.photoTarget.texture.colorSpace = THREE.SRGBColorSpace;
      this.photoCam = new THREE.PerspectiveCamera(fov, width / height, 0.05, 140);
    }
    const cam = this.photoCam;
    cam.fov = fov;
    cam.aspect = width / height;
    if (position) cam.position.copy(position); else cam.position.copy(this.camera.getWorldPosition(new THREE.Vector3()));
    if (quaternion) cam.quaternion.copy(quaternion);
    else if (target) cam.lookAt(target);
    else cam.quaternion.copy(this.camera.getWorldQuaternion(new THREE.Quaternion()));
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
    cam.layers.set(0);
    if (anomalies) cam.layers.enable(LAYER_ANOMALY);

    beforeRender?.(cam);
    const prevFog = this.scene.fog.density;
    this.scene.fog.density = prevFog * 0.7;
    this.renderer.setRenderTarget(this.photoTarget);
    this.renderer.render(this.scene, cam);
    const pixels = new Uint8Array(width * height * 4);
    this.renderer.readRenderTargetPixels(this.photoTarget, 0, 0, width, height, pixels);
    this.renderer.setRenderTarget(null);
    this.scene.fog.density = prevFog;
    afterRender?.(cam);

    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(width, height);
    // Переворачиваем по Y, добавляем экспозицию, шум и лёгкое виньетирование.
    for (let y = 0; y < height; y++) {
      const src = (height - 1 - y) * width * 4;
      const dst = y * width * 4;
      for (let x = 0; x < width; x++) {
        const i = x * 4;
        const dx = (x / width - 0.5), dy = (y / height - 0.5);
        const vig = 1 - (dx * dx + dy * dy) * 1.25;
        const noise = (Math.random() - 0.5) * 22;
        for (let c = 0; c < 3; c++) {
          const v = pixels[src + i + c] / 255;
          const lifted = Math.pow(v, 0.8) * exposure * vig;
          img.data[dst + i + c] = Math.max(0, Math.min(255, lifted * 235 + noise + 6));
        }
        img.data[dst + i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.72);
  }

  dispose() {
    window.removeEventListener('resize', this.resize);
    this.unsub?.();
    this.photoTarget?.dispose();
    this.renderer.dispose();
  }
}
