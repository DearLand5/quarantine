// Предметы главы 2: кабина и двери лифта, трубы, лужи, сарайки, котлы, люк, «Объект 17».
// Регистрируются в общем каталоге PROPS, поэтому расставляются теми же данными, что и всё остальное.
import * as THREE from 'three';
import { PROPS } from './Props.js';
import { planeGeo } from './geometry.js';

// Материалы, которые меняются по сюжету (свечение кристаллов) — общие для всех стен лаборатории
export const LAB_STATE = { crystalMat: null, waterMat: null };

function crystalTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#07080c'; ctx.fillRect(0, 0, 256, 256);
  const r = 22, h = Math.sqrt(3) * r;
  for (let row = -1; row < 8; row++) {
    for (let col = -1; col < 8; col++) {
      const x = col * r * 1.5, y = row * h + (col % 2 ? h / 2 : 0);
      const v = 0.35 + ((row * 7 + col * 13) % 10) / 16;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) { const a = (Math.PI / 3) * k; ctx.lineTo(x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2)); }
      ctx.closePath();
      const g = ctx.createRadialGradient(x, y, 2, x, y, r);
      g.addColorStop(0, `rgba(150,170,255,${v})`); g.addColorStop(1, `rgba(40,30,90,${v * 0.6})`);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(10,10,20,0.9)'; ctx.lineWidth = 3; ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let circleCache = null;
function circleGeo() {
  // единичный эллипс диаметром 1 (масштабируется под лужу)
  return (circleCache ??= new THREE.CircleGeometry(0.5, 28));
}

function waterMat() {
  if (!LAB_STATE.waterMat) LAB_STATE.waterMat = new THREE.MeshStandardMaterial({ color: 0x1b2a2e, roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.72, depthWrite: false });
  return LAB_STATE.waterMat;
}

Object.assign(PROPS, {
  lift_cabin(b) {
    // Кабина 0.9 × 1.01 м, высота 2.15; локально: x ±0.45, z -0.5 (задняя стена) … +0.51 (стена с дверью), дверь на юге (+Z).
    const XW = 0.45, ZB = -0.5, ZF = 0.51;
    // Нижняя деревянная панель по трём стенам
    b.box('wood_dark', 0.9, 0.9, 0.012, 0, 0, ZB + 0.006);
    b.box('wood_dark', 0.012, 0.9, 1.0, -XW + 0.006, 0, 0.005);
    b.box('wood_dark', 0.012, 0.9, 1.0, XW - 0.006, 0, 0.005);
    // Верхняя часть стен — светлый пластик (иначе тёмный металл стен кабины проваливается во мрак)
    b.box('plastic_beige', 0.9, 1.25, 0.004, 0, 0.9, ZB + 0.002);
    b.box('plastic_beige', 0.004, 1.25, 0.99, -XW + 0.002, 0.9, -0.005);
    b.box('plastic_beige', 0.004, 1.25, 0.99, XW - 0.002, 0.9, -0.005);
    // Поручни на кронштейнах: задний и два боковых (с восточной стороны — до панели кнопок)
    b.box('chrome', 0.76, 0.03, 0.03, 0, 0.9, ZB + 0.045);
    for (const [x, z0, z1] of [[-XW + 0.045, ZB + 0.03, 0.2], [XW - 0.045, ZB + 0.03, 0.02]]) {
      b.box('chrome', 0.03, 0.03, z1 - z0, x, 0.9, (z0 + z1) / 2);
      for (const z of [z0 + 0.04, z1 - 0.04]) b.box('chrome', 0.012, 0.012, 0.045, x + (x < 0 ? -0.0225 : 0.0225), 0.9 + 0.009, z).rotation.y = Math.PI / 2;
    }
    for (const x of [-0.34, 0.34]) b.box('chrome', 0.012, 0.012, 0.03, x, 0.909, ZB + 0.015);
    // Зеркало в раме на задней стене
    b.box('chrome', 0.74, 0.86, 0.008, 0, 0.98, ZB + 0.004);
    b.box('mirror', 0.7, 0.82, 0.006, 0, 1.0, ZB + 0.011);
    // Панель кнопок на восточной стене у двери (z 0.12..0.40, y 0.95..1.45): hit-зона 'lift_panel' смотрит сюда
    b.box('metal', 0.02, 0.5, 0.2, XW - 0.01, 0.95, 0.26);
    b.box('black', 0.004, 0.46, 0.16, XW - 0.022, 0.97, 0.26);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
      const m = b.cyl('plastic_beige', 0.016, 0.016, 0.01, 0, 0, 0, 10);
      m.rotation.z = Math.PI / 2; m.position.set(XW - 0.027, 1.37 - i * 0.075, 0.22 + j * 0.08);
    }
    const alarm = b.cyl('lamp_red', 0.018, 0.018, 0.01, 0, 0, 0, 10);
    alarm.rotation.z = Math.PI / 2; alarm.position.set(XW - 0.027, 1.06, 0.30);
    const stop = b.cyl('plastic_dark', 0.018, 0.018, 0.01, 0, 0, 0, 10);
    stop.rotation.z = Math.PI / 2; stop.position.set(XW - 0.027, 1.06, 0.22);
    // Табличка грузоподъёмности на западной стене
    b.plane(b.a.signMaterial(['ЛИФТ ПАССАЖИРСКИЙ', 'г/п 320 кг · 4 чел.', 'КМЗ 1980'], { w: 256, h: 128, bg: '#c8c1a8', size: 20, pad: 10 }), 0.2, 0.1, -XW + 0.0045, 1.5, 0.15, 0, Math.PI / 2);
    // Окантовка проёма со стороны кабины и порог
    for (const s of [-1, 1]) b.box('metal', 0.05, 1.97, 0.02, s * 0.425, 0, ZF - 0.01);
    b.box('metal', 0.9, 0.03, 0.02, 0, 1.95, ZF - 0.01);
    b.box('metal', 0.82, 0.014, 0.1, 0, 0, ZF - 0.05);
  },
  pipes(b, o) {
    const len = o.len || 6, y = o.y || 2.1, n = o.n || 2;
    for (let i = 0; i < n; i++) {
      const p = b.cyl(i ? 'metal' : 'rust', 0.05 + i * 0.02, 0.05 + i * 0.02, len, 0, y - i * 0.16, i * 0.05, 8);
      p.rotation.z = Math.PI / 2;
      p.position.y = y - i * 0.16;
    }
    for (let x = -len / 2 + 0.5; x < len / 2; x += 1.6) b.box('rust', 0.05, 0.3, 0.05, x, y - 0.25, 0.04);
  },
  puddle(b, o) {
    // Лужа — два перекрывающихся эллипса (не прямоугольник), чуть выше пола
    const w = o.w || 1.5, d = o.d || 1;
    const blobs = [[0, 0, 1, 1, 0.006], [w * 0.2, -d * 0.12, 0.62, 0.7, 0.008]];
    for (const [x, z, sx, sz, y] of blobs) {
      const m = new THREE.Mesh(circleGeo(), waterMat());
      m.rotation.x = -Math.PI / 2;
      m.scale.set(w * sx, d * sz, 1);
      m.position.set(x, y, z);
      m.userData.dynamic = true;
      m.renderOrder = 2;
      b.group.add(m);
    }
  },
  storage_cells(b, o) {
    // Деревянные двери сараек с навесными замками; одна приоткрыта — за ней темнота
    const n = o.n || 3, w = 1.3;
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * (w + 0.08);
      b.box('black', w + 0.08, 1.9, 0.02, x, 0, 0.005);
      const open = o.open === i;
      for (let s = 0; s < 6; s++) {
        const slat = b.box('wood_dark', w / 6 - 0.03, 1.85, 0.03, x - w / 2 + w / 12 + s * (w / 6) + (open ? 0.25 : 0), 0.02, open ? 0.18 + s * 0.04 : 0.03);
        if (open) slat.rotation.y = -0.5;
      }
      b.box('wood_dark', w, 0.06, 0.04, x, 1.88, 0.03);
      b.box('wood_dark', w, 0.06, 0.04, x, 0.3, 0.05);
      if (!open) b.box('rust', 0.05, 0.07, 0.03, x + w / 2 - 0.12, 1.0, 0.07);
      b.plane(b.a.signMaterial([`${21 + i + (o.base || 0)}`], { w: 64, h: 48, bg: '#bfb69a', size: 30, pad: 6 }), 0.1, 0.07, x, 1.75, 0.065);
    }
  },
  dropped_torch(b) {
    const body = b.cyl('plastic_dark', 0.025, 0.025, 0.2, 0, 0, 0, 10);
    body.rotation.z = Math.PI / 2; body.position.y = 0.03;
    const head = b.cyl('plastic_dark', 0.035, 0.03, 0.05, 0.12, 0, 0, 10);
    head.rotation.z = Math.PI / 2; head.position.y = 0.035;
    const lens = b.cyl(b.a.uniqueMaterial('lamp_on'), 0.03, 0.03, 0.005, 0.148, 0, 0, 10);
    lens.rotation.z = Math.PI / 2; lens.position.y = 0.035;
    b.parts.lens = b.dynamic(lens);
  },
  phone_floor(b) {
    b.box('plastic_dark', 0.075, 0.01, 0.155, 0, 0, 0);
    const scr = b.dynamic(b.plane(b.a.uniqueMaterial('screen_glow'), 0.066, 0.14, 0, 0.0115, 0, -Math.PI / 2));
    scr.material.color.setHex(0x2a3a44);
  },
  boiler(b) {
    // Старый котёл: лежащий цилиндр на опорах, топка, манометр
    const body = b.cyl('rust', 0.7, 0.7, 2.2, 0, 0.55, 0, 16);
    body.rotation.x = Math.PI / 2; body.position.y = 1.25;
    for (const z of [-0.8, 0.8]) b.box('rust', 1.2, 0.55, 0.12, 0, 0, z);
    b.box('black', 0.5, 0.5, 0.06, 0, 0.95, 1.12);
    b.cyl('chrome', 0.09, 0.09, 0.04, 0.4, 1.7, 1.12, 12).rotation.x = Math.PI / 2;
    b.cyl('rust', 0.12, 0.12, 1.4, 0, 1.9, -0.6, 8);
    b.col(0, 0, 1.5, 2.3);
  },
  hatch(b) {
    // Открытый люк: рама, откинутая крышка, чёрный провал, верх лестницы
    b.box('metal', 1.0, 0.05, 0.08, 0, 0, -0.46);
    b.box('metal', 1.0, 0.05, 0.08, 0, 0, 0.46);
    b.box('metal', 0.08, 0.05, 1.0, -0.46, 0, 0);
    b.box('metal', 0.08, 0.05, 1.0, 0.46, 0, 0);
    b.plane('black', 0.86, 0.86, 0, 0.004, 0, -Math.PI / 2);
    // Крышка откинута назад на задней кромке рамы (шарнир на z=-0.5, угол 100° от закрытого положения)
    const L = 0.95, al = 100 * Math.PI / 180;
    const lid = b.box('rust', 0.95, 0.05, L, 0, 0, 0);
    lid.position.set(0, 0.05 + (L / 2) * Math.sin(al), -0.5 + (L / 2) * Math.cos(al));
    lid.rotation.x = -al;
    // Табличка на лицевой (обращённой к игроку) стороне крышки
    const ny = -Math.cos(al), nz = Math.sin(al);
    b.plane(b.a.signMaterial(['ОБЪЕКТ 17', 'ВХОД ПО ДОПУСКУ', 'уровень 1'], { w: 256, h: 128, bg: '#3a3026', fg: '#c8b28a', size: 22, pad: 14 }), 0.6, 0.3,
      0, lid.position.y + ny * 0.0275, lid.position.z + nz * 0.0275, -al + Math.PI / 2);
    for (const x of [-0.2, 0.2]) b.box('metal', 0.03, 0.5, 0.03, x, 0, 0.4);
    b.col(0, 0, 1.05, 1.05);
  },
  chalk_wall(b) {
    b.plane(b.a.signMaterial(['НЕ ОТВЕЧАТЬ', 'ИМ', '', 'ОНИ НЕ ЗНАЮТ', 'ТВОЙ ГОЛОС', 'ПОКА ТЫ МОЛЧИШЬ', '', '— П.К. 1990'], { w: 384, h: 384, bg: '#2a2a26', fg: '#d8d6cc', titleSize: 30, size: 26, aged: false, font: '"Comic Sans MS", cursive' }), 1.4, 1.4, 0, 1.45, 0.01);
  },
  workbench(b) {
    b.box('wood_dark', 1.6, 0.05, 0.7, 0, 0.85, 0);
    for (const x of [-0.75, 0.75]) for (const z of [-0.3, 0.3]) b.box('metal', 0.05, 0.85, 0.05, x, 0, z);
    b.box('rust', 0.35, 0.12, 0.2, -0.4, 0.9, 0);
    b.box('metal', 0.3, 0.04, 0.05, 0.2, 0.9, 0.1).rotation.y = 0.4;
    b.cyl('plastic_dark', 0.04, 0.04, 0.12, 0.5, 0.9, -0.1, 8);
    b.col(0, 0, 1.6, 0.7);
  },
  crystal_wall(b, o) {
    // Стена из «кристаллических» панелей — светится; свечение гаснет, если выключить резонатор
    if (!LAB_STATE.crystalMat) {
      const tex = crystalTexture();
      tex.repeat.set(1 / 0.55, 1 / 0.55);
      LAB_STATE.crystalMat = new THREE.MeshBasicMaterial({ map: tex, color: 0x6a74a8 });
      LAB_STATE.crystalMat.name = 'crystal#unique';
    }
    const w = o.w || 6;
    const ch = o.h || 2.66;
    const m = new THREE.Mesh(planeGeo(w, ch), LAB_STATE.crystalMat);
    m.position.set(0, ch / 2, 0.012);
    m.userData.dynamic = true;
    b.group.add(m);
  },
  ladder(b) {
    for (const x of [-0.22, 0.22]) b.box('metal', 0.04, 2.7, 0.04, x, 0, 0);
    for (let y = 0.25; y < 2.7; y += 0.3) b.box('metal', 0.44, 0.03, 0.03, 0, y, 0);
    b.box('black', 1.0, 0.02, 1.0, 0, 2.68, 0.2);
    b.col(0, 0, 0.6, 0.3);
  },
  resonator(b) {
    // Пульт и шкаф резонатора «Кристалл-М»: лампы, шкалы, рубильник «СЕТЬ», микрофон
    b.box('door_metal', 2.0, 1.9, 0.6, 0, 0, -0.25);
    b.box('metal', 2.0, 0.9, 0.7, 0, 0, 0.35);
    const top = b.box('plastic_beige', 2.0, 0.04, 0.75, 0, 0.9, 0.35);
    top.rotation.x = -0.12;
    for (let i = 0; i < 6; i++) b.cyl('chrome', 0.06, 0.06, 0.02, -0.75 + i * 0.3, 1.3, 0.06, 12).rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) {
      const lamp = b.cyl(i % 3 ? 'lamp_blue' : 'lamp_red', 0.018, 0.018, 0.02, -0.8 + i * 0.23, 1.62, 0.06, 8);
      lamp.rotation.x = Math.PI / 2;
    }
    b.plane(b.a.signMaterial(['#РЕЗОНАТОР «КРИСТАЛЛ-М»', 'п/я 17 · отдел акустики'], { w: 512, h: 96, bg: '#c9c1a6', size: 20, titleSize: 30, pad: 10 }), 1.0, 0.19, 0, 1.78, 0.055);
    // Рубильник
    b.box('black', 0.22, 0.38, 0.06, 0.78, 0.98, 0.62);
    const lever = b.dynamic(b.box('lamp_red', 0.05, 0.26, 0.05, 0.78, 1.0, 0.68));
    lever.rotation.x = -0.5;
    b.parts.lever = lever;
    b.plane(b.a.signMaterial(['СЕТЬ'], { w: 128, h: 48, bg: '#8a1e16', fg: '#f0e6d0', size: 30, pad: 6 }), 0.16, 0.06, 0.78, 1.41, 0.655);
    // Микрофон на стойке
    b.cyl('metal', 0.012, 0.012, 0.45, -0.6, 0.92, 0.5, 6);
    b.sphere('black', 0.04, -0.6, 1.4, 0.5, 1, 1.3, 1);
    b.col(0, 0.05, 2.0, 1.2);
  },
  tape_deck(b) {
    b.box('wood_dark', 0.7, 0.75, 0.5, 0, 0, 0);
    b.box('plastic_dark', 0.55, 0.12, 0.38, 0, 0.75, 0);
    for (const x of [-0.14, 0.14]) {
      const reel = b.dynamic(b.cyl('chrome', 0.1, 0.1, 0.02, x, 0.87, -0.02, 14));
      b.parts[x < 0 ? 'reelL' : 'reelR'] = reel;
    }
    b.plane(b.a.signMaterial(['«Тембр-2»'], { w: 128, h: 32, bg: '#1a1a1a', fg: '#c8b28a', size: 20, pad: 4 }), 0.18, 0.045, 0, 0.8, 0.195);
    b.col(0, 0, 0.7, 0.5);
  },
});
