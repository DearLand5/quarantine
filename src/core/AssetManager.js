// Управление ресурсами: процедурные и файловые текстуры, общая библиотека материалов, загрузка GLB-моделей.
// Материалы переиспользуются всеми объектами, что важно для объединения геометрии и числа вызовов отрисовки.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { paintTexture, paintSign } from '../world/TextureFactory.js';

// Размер тайла текстуры в метрах. UV статической геометрии задаются в метрах (см. world/geometry.js).
const TEXTURE_DEFS = {
  wallpaper_room: 0.6, wallpaper_hall: 0.7, wallpaper_zina: 0.7, wallpaper_marina: 0.6, wallpaper_gena: 0.8,
  paint_denis: 1.5, paint_cream: 1.2, paint_green: 1.6, whitewash: 1.8, ceiling: 2.0, concrete: 1.6,
  tiles_white: 0.9, tiles_kitchen: 0.6, floor_corridor: 1.2, parquet: 1.0, lino_kitchen: 1.2, floor_bath: 0.8,
  rug: 2.0, wood: 0.8, wood_dark: 0.8, veneer: 1.0, door_leather: 0.9, door_metal: 1.0, door_painted: 1.0,
  fabric: 0.5, fabric_red: 0.5, bedding: 0.8, metal: 1.0, rust: 1.0, enamel: 1.0, facade: 24, ground: 8, paper: 1,
};

// Пресеты материалов: имя -> параметры. tex — имя процедурной текстуры.
const MATERIAL_DEFS = {
  wall_room:        { tex: 'wallpaper_room', roughness: 0.92, bump: 0.004 },
  wall_hall:        { tex: 'wallpaper_hall', roughness: 0.9, bump: 0.004 },
  wall_kitchen_up:  { tex: 'paint_cream', roughness: 0.8 },
  wall_kitchen_low: { tex: 'tiles_kitchen', roughness: 0.35, bump: 0.006 },
  wall_bath:        { tex: 'tiles_white', roughness: 0.25, bump: 0.006 },
  wall_zina:        { tex: 'wallpaper_zina', roughness: 0.92 },
  wall_marina:      { tex: 'wallpaper_marina', roughness: 0.92 },
  wall_denis:       { tex: 'paint_denis', roughness: 0.85 },
  wall_gena:        { tex: 'wallpaper_gena', roughness: 0.9 },
  wall_paint_green: { tex: 'paint_green', roughness: 0.55, bump: 0.008 },
  wall_whitewash:   { tex: 'whitewash', roughness: 0.95, bump: 0.006 },
  wall_concrete:    { tex: 'concrete', roughness: 0.95, bump: 0.012 },
  ceiling:          { tex: 'ceiling', roughness: 0.95 },
  floor_corridor:   { tex: 'floor_corridor', roughness: 0.6, bump: 0.006 },
  floor_parquet:    { tex: 'parquet', roughness: 0.55, bump: 0.004 },
  floor_lino:       { tex: 'lino_kitchen', roughness: 0.5 },
  floor_bath:       { tex: 'floor_bath', roughness: 0.4, bump: 0.005 },
  floor_concrete:   { tex: 'concrete', roughness: 0.9, bump: 0.01 },
  rug:              { tex: 'rug', roughness: 1 },
  wood:             { tex: 'wood', roughness: 0.7 },
  wood_dark:        { tex: 'wood_dark', roughness: 0.65 },
  veneer:           { tex: 'veneer', roughness: 0.35 },
  door_leather:     { tex: 'door_leather', roughness: 0.6, bump: 0.01 },
  door_metal:       { tex: 'door_metal', roughness: 0.6, metalness: 0.3 },
  door_painted:     { tex: 'door_painted', roughness: 0.7 },
  fabric:           { tex: 'fabric', roughness: 1 },
  fabric_red:       { tex: 'fabric_red', roughness: 1 },
  bedding:          { tex: 'bedding', roughness: 1 },
  metal:            { tex: 'metal', roughness: 0.45, metalness: 0.6 },
  rust:             { tex: 'rust', roughness: 0.85, metalness: 0.3 },
  enamel:           { tex: 'enamel', roughness: 0.3 },
  paper:            { tex: 'paper', roughness: 1 },
  plastic_white:    { color: 0xd8d4c8, roughness: 0.5 },
  plastic_dark:     { color: 0x1f2120, roughness: 0.5 },
  plastic_beige:    { color: 0xbfb193, roughness: 0.6 },
  chrome:           { color: 0xb8b8b0, roughness: 0.2, metalness: 0.9 },
  brass:            { color: 0xa88a4a, roughness: 0.35, metalness: 0.8 },
  black:            { color: 0x0d0e0d, roughness: 0.8 },
  rubber:           { color: 0x161615, roughness: 0.95 },
  glass:            { color: 0x6d7f86, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.22, depthWrite: false },
  glass_wired:      { color: 0x7c8a80, roughness: 0.3, transparent: true, opacity: 0.35, depthWrite: false },
  mirror:           { color: 0x8f989a, roughness: 0.08, metalness: 0.85 },
  ceramic:          { color: 0xe2e0d8, roughness: 0.2 },
  cardboard:        { color: 0x8a6c47, roughness: 1 },
  trash_bag:        { color: 0x151716, roughness: 0.35 },
  plant:            { color: 0x34472c, roughness: 0.9 },
  soil:             { color: 0x2c1f15, roughness: 1 },
  books:            { color: 0x5a3a2a, roughness: 0.9 },
  skin:             { color: 0xc9a58a, roughness: 0.75 },
  cloth_dark:       { color: 0x22252a, roughness: 0.95 },
  ground:           { tex: 'ground', roughness: 1 },
  facade:           { tex: 'facade', basic: true },
  // Светящиеся материалы (без освещения): плафоны, экраны, окна напротив
  lamp_on:          { color: 0xfff1cf, basic: true },
  lamp_off:         { color: 0x3a3830, roughness: 0.4 },
  lamp_red:         { color: 0xff3a24, basic: true },
  lamp_blue:        { color: 0x3a6cff, basic: true },
  screen_glow:      { color: 0x9fc3d6, basic: true },
  led_purple:       { color: 0x8a4dff, basic: true },
  window_far:       { color: 0xd9b066, basic: true },
  sky:              { color: 0x0c1014, basic: true, fog: false },
};

export class AssetManager {
  constructor(sceneManager) {
    this.sm = sceneManager;
    this.textures = new Map();
    this.materials = new Map();
    this.models = new Map();
    this.loader = new GLTFLoader();
    this.texLoader = new THREE.TextureLoader();
    this.lambert = sceneManager.profile.lambert;
    this.texSize = sceneManager.profile.textureSize;
    this.errors = [];
    this.manifest = { textures: {}, models: {}, audio: {} };
  }

  /** Необязательный assets/manifest.json: позволяет подменить процедурные ресурсы файлами. */
  async loadManifest() {
    try {
      const res = await fetch('assets/manifest.json', { cache: 'no-cache' });
      if (res.ok) this.manifest = { textures: {}, models: {}, audio: {}, ...(await res.json()) };
    } catch (e) {
      console.info('[Assets] manifest.json не найден — используются процедурные ресурсы');
    }
    return this.manifest;
  }

  texture(name) {
    if (this.textures.has(name)) return this.textures.get(name);
    const c = paintTexture(name, this.texSize);
    if (!c) { console.warn(`[Assets] Нет текстуры "${name}"`); return null; }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.sm.maxAnisotropy;
    const size = TEXTURE_DEFS[name] || 1;
    tex.repeat.set(1 / size, 1 / size);
    this.textures.set(name, tex);
    // Если в assets/textures лежит файл с тем же именем — подменяем процедурную текстуру.
    this.tryFileOverride(name, tex);
    return tex;
  }

  tryFileOverride(name, tex) {
    const file = this.manifest?.textures?.[name];
    if (!file) return;
    this.texLoader.load(`assets/textures/${file}`, (img) => {
      tex.image = img.image;
      tex.needsUpdate = true;
    }, undefined, () => this.errors.push(`texture:${name}`));
  }

  material(name) {
    if (this.materials.has(name)) return this.materials.get(name);
    const def = MATERIAL_DEFS[name];
    if (!def) { console.warn(`[Assets] Нет материала "${name}"`); return this.material('plastic_white'); }
    const map = def.tex ? this.texture(def.tex) : null;
    let mat;
    if (def.basic) {
      mat = new THREE.MeshBasicMaterial({ color: def.color ?? 0xffffff, map, fog: def.fog !== false });
    } else if (this.lambert) {
      mat = new THREE.MeshLambertMaterial({ color: def.color ?? 0xffffff, map });
    } else {
      mat = new THREE.MeshStandardMaterial({
        color: def.color ?? 0xffffff, map,
        roughness: def.roughness ?? 0.8, metalness: def.metalness ?? 0,
        bumpMap: def.bump ? map : null, bumpScale: def.bump ? def.bump * 40 : 1,
      });
    }
    if (def.transparent) { mat.transparent = true; mat.opacity = def.opacity; mat.depthWrite = def.depthWrite ?? true; }
    mat.name = name;
    this.materials.set(name, mat);
    return mat;
  }

  // Уникальный материал (не объединяется с другими) — для объектов с изменяемым свечением.
  uniqueMaterial(name) {
    const base = this.material(name);
    const m = base.clone();
    m.name = `${name}#unique`;
    return m;
  }

  signMaterial(lines, opts = {}) {
    const key = 'sign:' + lines.join('|') + JSON.stringify(opts);
    if (this.materials.has(key)) return this.materials.get(key);
    const c = paintSign(lines, opts);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.sm.maxAnisotropy;
    const mat = this.lambert || opts.basic
      ? new (opts.basic ? THREE.MeshBasicMaterial : THREE.MeshLambertMaterial)({ map: tex })
      : new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
    mat.name = key;
    this.materials.set(key, mat);
    return mat;
  }

  /** Загрузка GLB/GLTF с кэшем. При ошибке возвращает null — вызывающий код использует процедурную модель. */
  loadModel(url) {
    if (this.models.has(url)) return this.models.get(url);
    const p = new Promise((resolve) => {
      this.loader.load(url, (gltf) => resolve(gltf), undefined, (err) => {
        console.warn(`[Assets] Модель не загружена: ${url}`, err?.message || err);
        this.errors.push(`model:${url}`);
        resolve(null);
      });
    });
    this.models.set(url, p);
    return p;
  }

  dispose() {
    for (const t of this.textures.values()) t.dispose();
    for (const m of this.materials.values()) { m.map?.dispose(); m.dispose(); }
    this.textures.clear();
    this.materials.clear();
  }
}
