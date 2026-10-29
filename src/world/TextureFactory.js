// Процедурные текстуры на canvas. Используются, пока в assets/textures нет фотореалистичных замен.
// Каждая функция рисует квадратный тайл; масштаб в метрах задаётся в AssetManager (TEXTURE_DEFS).
import { Random, hashString } from '../utils/Random.js';

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

function noise(ctx, size, rand, amount = 18, alpha = 1) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand.next() - 0.5) * amount;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
    d[i + 3] = d[i + 3] * alpha;
  }
  ctx.putImageData(img, 0, 0);
}

function stains(ctx, size, rand, count, color, maxR = 0.25) {
  for (let i = 0; i < count; i++) {
    const x = rand.next() * size, y = rand.next() * size, r = rand.range(0.03, maxR) * size;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

function cracks(ctx, size, rand, count, color = 'rgba(30,25,20,0.35)') {
  ctx.strokeStyle = color;
  for (let i = 0; i < count; i++) {
    let x = rand.next() * size, y = rand.next() * size;
    ctx.lineWidth = rand.range(0.5, 1.4);
    ctx.beginPath();
    ctx.moveTo(x, y);
    const steps = rand.int(4, 12);
    let ang = rand.next() * Math.PI * 2;
    for (let s = 0; s < steps; s++) {
      ang += rand.range(-0.8, 0.8);
      x += Math.cos(ang) * rand.range(3, 14);
      y += Math.sin(ang) * rand.range(3, 14);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

// Вертикальный подтёк / грязь у пола
function bottomGrime(ctx, size, strength = 0.35) {
  const g = ctx.createLinearGradient(0, size * 0.6, 0, size);
  g.addColorStop(0, 'rgba(20,18,12,0)');
  g.addColorStop(1, `rgba(20,18,12,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
}

function damask(ctx, size, rand, bg, fg, scale = 1) {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = fg;
  ctx.strokeStyle = fg;
  const cell = size / 2;
  // Медальоны в шахматном порядке; копии по краям обеспечивают бесшовность тайла.
  const centers = [[0.25, 0.25], [0.75, 0.75]];
  for (const [cx, cy] of centers) {
    for (const ox of [-1, 0, 1]) for (const oy of [-1, 0, 1]) {
      ctx.save();
      ctx.translate((cx + ox) * size, (cy + oy) * size);
      ctx.scale(scale, scale);
      // Стилизованный «медальон» советских обоев
      for (let a = 0; a < 6; a++) {
        const ang = (a / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(Math.cos(ang) * cell * 0.16, Math.sin(ang) * cell * 0.2, cell * 0.06, cell * 0.11, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, cell * 0.34, cell * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

const PAINTERS = {
  wallpaper_room(ctx, s, r) {
    damask(ctx, s, r, '#b7a888', 'rgba(140,118,84,0.55)');
    stains(ctx, s, r, 6, 'rgba(110,90,50,0.12)', 0.3);
    noise(ctx, s, r, 14);
  },
  wallpaper_hall(ctx, s, r) {
    ctx.fillStyle = '#9b8a6c'; ctx.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += s / 8) {
      ctx.fillStyle = 'rgba(80,62,40,0.35)'; ctx.fillRect(x, 0, s / 32, s);
      ctx.fillStyle = 'rgba(200,185,150,0.18)'; ctx.fillRect(x + s / 20, 0, s / 64, s);
    }
    stains(ctx, s, r, 5, 'rgba(70,55,30,0.15)');
    noise(ctx, s, r, 16);
  },
  wallpaper_zina(ctx, s, r) {
    damask(ctx, s, r, '#3f4a37', 'rgba(150,140,90,0.35)', 1.1);
    noise(ctx, s, r, 14);
  },
  wallpaper_marina(ctx, s, r) {
    ctx.fillStyle = '#a9b3b3'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) {
      const x = r.next() * s, y = r.next() * s;
      ctx.fillStyle = r.pick(['rgba(160,110,120,0.5)', 'rgba(110,130,150,0.5)', 'rgba(220,200,150,0.5)']);
      for (let p = 0; p < 5; p++) { ctx.beginPath(); ctx.arc(x + Math.cos(p * 1.25) * 5, y + Math.sin(p * 1.25) * 5, 4, 0, 7); ctx.fill(); }
    }
    noise(ctx, s, r, 12);
  },
  wallpaper_gena(ctx, s, r) {
    ctx.fillStyle = '#6e5639'; ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(40,28,15,0.5)'; ctx.lineWidth = 3;
    for (let y = 0; y < s; y += s / 6) for (let x = 0; x < s; x += s / 6) {
      ctx.strokeRect(x + 4, y + 4, s / 6 - 8, s / 6 - 8);
      ctx.beginPath(); ctx.arc(x + s / 12, y + s / 12, s / 30, 0, 7); ctx.stroke();
    }
    noise(ctx, s, r, 16);
  },
  paint_denis(ctx, s, r) {
    ctx.fillStyle = '#2b2e31'; ctx.fillRect(0, 0, s, s);
    stains(ctx, s, r, 8, 'rgba(0,0,0,0.2)');
    noise(ctx, s, r, 10);
  },
  paint_cream(ctx, s, r) {
    ctx.fillStyle = '#c4b896'; ctx.fillRect(0, 0, s, s);
    stains(ctx, s, r, 10, 'rgba(120,100,60,0.12)');
    cracks(ctx, s, r, 2, 'rgba(60,50,30,0.25)');
    noise(ctx, s, r, 12);
  },
  paint_green(ctx, s, r) {
    // Масляная краска нижней части стен подъезда
    ctx.fillStyle = '#3c5446'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(${r.int(20, 80)},${r.int(50, 90)},${r.int(40, 70)},0.25)`;
      ctx.fillRect(r.next() * s, r.next() * s, r.range(2, 40), r.range(1, 4));
    }
    stains(ctx, s, r, 7, 'rgba(10,15,10,0.3)');
    // сколы до бетона
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = 'rgba(150,145,130,0.6)';
      ctx.beginPath(); ctx.ellipse(r.next() * s, r.next() * s, r.range(2, 9), r.range(2, 6), r.next() * 3, 0, 7); ctx.fill();
    }
    cracks(ctx, s, r, 3, 'rgba(0,0,0,0.35)');
    noise(ctx, s, r, 18);
  },
  whitewash(ctx, s, r) {
    ctx.fillStyle = '#b9b5a6'; ctx.fillRect(0, 0, s, s);
    stains(ctx, s, r, 12, 'rgba(110,100,70,0.16)', 0.35);
    stains(ctx, s, r, 4, 'rgba(70,60,40,0.18)', 0.12);
    cracks(ctx, s, r, 4, 'rgba(40,35,25,0.3)');
    noise(ctx, s, r, 20);
  },
  ceiling(ctx, s, r) {
    ctx.fillStyle = '#c9c5b6'; ctx.fillRect(0, 0, s, s);
    stains(ctx, s, r, 6, 'rgba(140,120,70,0.14)', 0.4);
    cracks(ctx, s, r, 2, 'rgba(40,35,25,0.2)');
    noise(ctx, s, r, 10);
  },
  concrete(ctx, s, r) {
    ctx.fillStyle = '#6f6d66'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(${r.int(30, 140)},${r.int(30, 135)},${r.int(30, 125)},0.25)`;
      ctx.beginPath(); ctx.arc(r.next() * s, r.next() * s, r.range(0.5, 2.5), 0, 7); ctx.fill();
    }
    stains(ctx, s, r, 10, 'rgba(20,20,15,0.25)');
    cracks(ctx, s, r, 5, 'rgba(10,10,8,0.45)');
    noise(ctx, s, r, 26);
  },
  tiles_white(ctx, s, r) {
    const n = 6, t = s / n;
    ctx.fillStyle = '#7d7a70'; ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = r.int(198, 222);
      ctx.fillStyle = `rgb(${v},${v},${v - 6})`;
      ctx.fillRect(x * t + 1.5, y * t + 1.5, t - 3, t - 3);
      if (r.chance(0.08)) { ctx.strokeStyle = 'rgba(60,55,45,0.5)'; ctx.beginPath(); ctx.moveTo(x * t + r.next() * t, y * t); ctx.lineTo(x * t + r.next() * t, y * t + t); ctx.stroke(); }
    }
    stains(ctx, s, r, 5, 'rgba(120,110,70,0.15)');
    noise(ctx, s, r, 8);
  },
  tiles_kitchen(ctx, s, r) {
    const n = 4, t = s / n;
    ctx.fillStyle = '#6e6553'; ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      ctx.fillStyle = r.chance(0.15) ? '#a99a74' : '#c7bc9c';
      ctx.fillRect(x * t + 2, y * t + 2, t - 4, t - 4);
      ctx.strokeStyle = 'rgba(120,90,50,0.35)';
      ctx.beginPath(); ctx.arc(x * t + t / 2, y * t + t / 2, t * 0.22, 0, 7); ctx.stroke();
    }
    stains(ctx, s, r, 6, 'rgba(100,80,40,0.18)');
    noise(ctx, s, r, 10);
  },
  floor_corridor(ctx, s, r) {
    // Метлахская плитка подъезда
    const n = 8, t = s / n;
    ctx.fillStyle = '#2b241d'; ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const pat = (x + y) % 2;
      ctx.fillStyle = pat ? `rgb(${r.int(105, 120)},${r.int(62, 72)},${r.int(45, 52)})` : `rgb(${r.int(150, 165)},${r.int(135, 145)},${r.int(110, 120)})`;
      ctx.fillRect(x * t + 1, y * t + 1, t - 2, t - 2);
      if (r.chance(0.06)) { ctx.fillStyle = '#2b241d'; ctx.fillRect(x * t + r.next() * t, y * t + r.next() * t, 5, 3); }
    }
    stains(ctx, s, r, 10, 'rgba(15,12,8,0.35)');
    noise(ctx, s, r, 18);
  },
  parquet(ctx, s, r) {
    // «Ёлочка»
    ctx.fillStyle = '#3d2a1a'; ctx.fillRect(0, 0, s, s);
    const w = s / 8, l = s / 2;
    for (let row = -2; row < 10; row++) {
      for (let col = -1; col < 5; col++) {
        const x = col * l + (row % 2) * w, y = row * w;
        const c = r.int(95, 130);
        ctx.fillStyle = `rgb(${c},${Math.floor(c * 0.68)},${Math.floor(c * 0.42)})`;
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
        ctx.fillRect(0, 0, l * 0.7, w * 0.92);
        ctx.restore();
      }
    }
    for (let i = 0; i < 300; i++) { ctx.fillStyle = 'rgba(30,18,8,0.2)'; ctx.fillRect(r.next() * s, r.next() * s, r.range(4, 30), 1); }
    stains(ctx, s, r, 5, 'rgba(10,6,3,0.25)');
    noise(ctx, s, r, 14);
  },
  lino_kitchen(ctx, s, r) {
    const n = 4, t = s / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      ctx.fillStyle = (x + y) % 2 ? '#8e7f62' : '#5d5242';
      ctx.fillRect(x * t, y * t, t, t);
    }
    stains(ctx, s, r, 8, 'rgba(20,15,8,0.3)');
    noise(ctx, s, r, 16);
  },
  floor_bath(ctx, s, r) {
    const n = 8, t = s / n;
    ctx.fillStyle = '#4f4b45'; ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = r.int(110, 128);
      ctx.fillStyle = `rgb(${v},${v - 8},${v - 18})`;
      ctx.fillRect(x * t + 1, y * t + 1, t - 2, t - 2);
    }
    noise(ctx, s, r, 12);
  },
  rug(ctx, s, r) {
    ctx.fillStyle = '#5b1d1a'; ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#b48a4a'; ctx.lineWidth = s / 40;
    ctx.strokeRect(s * 0.06, s * 0.06, s * 0.88, s * 0.88);
    ctx.strokeStyle = '#1d2a3a'; ctx.lineWidth = s / 60;
    ctx.strokeRect(s * 0.12, s * 0.12, s * 0.76, s * 0.76);
    ctx.fillStyle = '#b48a4a';
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.translate(s / 2, s / 2); ctx.rotate(i * Math.PI / 2);
      ctx.beginPath(); ctx.moveTo(0, -s * 0.3); ctx.lineTo(s * 0.12, 0); ctx.lineTo(0, s * 0.05); ctx.lineTo(-s * 0.12, 0); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#1d2a3a'; ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.08, 0, 7); ctx.fill();
    for (let i = 0; i < 80; i++) { ctx.fillStyle = r.pick(['#7a2a22', '#3a1210', '#9a7240']); ctx.fillRect(r.next() * s, r.next() * s, 3, 3); }
    noise(ctx, s, r, 24);
  },
  wood(ctx, s, r) {
    ctx.fillStyle = '#6b4a2c'; ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 2) {
      const c = 90 + Math.sin(y * 0.09 + r.next() * 0.5) * 18 + r.next() * 10;
      ctx.fillStyle = `rgba(${c},${c * 0.68},${c * 0.4},0.6)`;
      ctx.fillRect(0, y, s, 1.5);
    }
    noise(ctx, s, r, 12);
  },
  wood_dark(ctx, s, r) {
    ctx.fillStyle = '#3a2618'; ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 2) {
      const c = 55 + Math.sin(y * 0.12 + r.next()) * 12;
      ctx.fillStyle = `rgba(${c},${c * 0.62},${c * 0.4},0.6)`;
      ctx.fillRect(0, y, s, 1.4);
    }
    noise(ctx, s, r, 10);
  },
  veneer(ctx, s, r) {
    // Полированный шпон «под орех» — советская стенка
    ctx.fillStyle = '#5a3820'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(${r.int(30, 60)},${r.int(15, 30)},10,0.35)`;
      ctx.lineWidth = r.range(1, 3);
      ctx.beginPath();
      const x = r.next() * s;
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + r.range(-30, 30), s / 3, x + r.range(-30, 30), (2 * s) / 3, x + r.range(-10, 10), s);
      ctx.stroke();
    }
    noise(ctx, s, r, 8);
  },
  door_leather(ctx, s, r) {
    // Дерматиновая обивка с пуговицами
    ctx.fillStyle = '#3d2618'; ctx.fillRect(0, 0, s, s);
    const n = 4, t = s / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const g = ctx.createRadialGradient(x * t + t / 2, y * t + t / 2, 2, x * t + t / 2, y * t + t / 2, t * 0.7);
      g.addColorStop(0, 'rgba(110,70,45,0.6)'); g.addColorStop(1, 'rgba(20,10,5,0.4)');
      ctx.fillStyle = g; ctx.fillRect(x * t, y * t, t, t);
    }
    ctx.fillStyle = '#b8a070';
    for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++) { ctx.beginPath(); ctx.arc(x * t, y * t, 3, 0, 7); ctx.fill(); }
    noise(ctx, s, r, 12);
  },
  door_metal(ctx, s, r) {
    ctx.fillStyle = '#2f3231'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 300; i++) { ctx.fillStyle = `rgba(${r.int(60, 110)},${r.int(60, 100)},${r.int(55, 90)},0.15)`; ctx.fillRect(r.next() * s, r.next() * s, r.range(1, 3), r.range(1, 3)); }
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 3; ctx.strokeRect(s * 0.1, s * 0.1, s * 0.8, s * 0.8);
    stains(ctx, s, r, 5, 'rgba(90,50,20,0.25)');
    noise(ctx, s, r, 14);
  },
  door_painted(ctx, s, r) {
    ctx.fillStyle = '#7a6f5e'; ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(30,25,15,0.4)'; ctx.lineWidth = 4;
    ctx.strokeRect(s * 0.12, s * 0.08, s * 0.76, s * 0.38);
    ctx.strokeRect(s * 0.12, s * 0.54, s * 0.76, s * 0.38);
    stains(ctx, s, r, 5, 'rgba(40,30,15,0.2)');
    noise(ctx, s, r, 14);
  },
  fabric(ctx, s, r) {
    ctx.fillStyle = '#4c4a3a'; ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 3) { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, y, s, 1); }
    for (let x = 0; x < s; x += 3) { ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(x, 0, 1, s); }
    noise(ctx, s, r, 14);
  },
  fabric_red(ctx, s, r) {
    ctx.fillStyle = '#6a2f28'; ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 3) { ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(0, y, s, 1); }
    noise(ctx, s, r, 14);
  },
  bedding(ctx, s, r) {
    ctx.fillStyle = '#8e9a9c'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 30; i++) { ctx.fillStyle = 'rgba(60,70,90,0.25)'; ctx.beginPath(); ctx.arc(r.next() * s, r.next() * s, r.range(4, 10), 0, 7); ctx.fill(); }
    noise(ctx, s, r, 10);
  },
  metal(ctx, s, r) {
    ctx.fillStyle = '#9a9a92'; ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y++) { ctx.fillStyle = `rgba(255,255,255,${r.next() * 0.05})`; ctx.fillRect(0, y, s, 1); }
    stains(ctx, s, r, 4, 'rgba(60,40,20,0.2)');
    noise(ctx, s, r, 10);
  },
  rust(ctx, s, r) {
    ctx.fillStyle = '#4a4440'; ctx.fillRect(0, 0, s, s);
    stains(ctx, s, r, 18, 'rgba(120,60,25,0.35)');
    noise(ctx, s, r, 24);
  },
  enamel(ctx, s, r) {
    ctx.fillStyle = '#d9d6cc'; ctx.fillRect(0, 0, s, s);
    stains(ctx, s, r, 4, 'rgba(150,130,90,0.15)');
    noise(ctx, s, r, 6);
  },
  facade(ctx, s, r) {
    // Соседний дом ночью: сетка окон, часть горит
    ctx.fillStyle = '#121513'; ctx.fillRect(0, 0, s, s);
    const cols = 8, rows = 8, cw = s / cols, rh = s / rows;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const lit = r.chance(0.18);
      ctx.fillStyle = lit ? r.pick(['#d8b066', '#c9a35a', '#8fa7b8', '#e0c58a']) : '#070908';
      ctx.fillRect(x * cw + cw * 0.22, y * rh + rh * 0.2, cw * 0.56, rh * 0.5);
      if (lit && r.chance(0.4)) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x * cw + cw * 0.22, y * rh + rh * 0.2, cw * 0.2, rh * 0.5); }
    }
    for (let y = 0; y < rows; y++) { ctx.fillStyle = 'rgba(40,45,40,0.6)'; ctx.fillRect(0, y * rh + rh * 0.85, s, 2); }
  },
  ground(ctx, s, r) {
    ctx.fillStyle = '#141614'; ctx.fillRect(0, 0, s, s);
    stains(ctx, s, r, 20, 'rgba(40,45,35,0.4)');
    noise(ctx, s, r, 12);
  },
  paper(ctx, s, r) {
    ctx.fillStyle = '#d6cdb2'; ctx.fillRect(0, 0, s, s);
    stains(ctx, s, r, 5, 'rgba(150,120,60,0.2)');
    for (let y = s * 0.15; y < s * 0.9; y += s / 18) { ctx.fillStyle = 'rgba(40,35,30,0.35)'; ctx.fillRect(s * 0.1, y, s * r.range(0.4, 0.8), 2); }
    noise(ctx, s, r, 10);
  },
};

export function paintTexture(name, size) {
  const painter = PAINTERS[name];
  if (!painter) return null;
  const c = canvas(size);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  painter(ctx, size, new Random(hashString(name)));
  return c;
}

/** Табличка/объявление с текстом. lines — массив строк; opts: bg, fg, size, font, align, title */
export function paintSign(lines, opts = {}) {
  const w = opts.w || 512, h = opts.h || 256;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const rand = new Random(hashString(lines.join('|')));
  ctx.fillStyle = opts.bg || '#e2dccb';
  ctx.fillRect(0, 0, w, h);
  if (opts.aged !== false) {
    stains(ctx, Math.max(w, h), rand, 6, 'rgba(140,110,60,0.18)', 0.3);
  }
  if (opts.border) { ctx.strokeStyle = opts.border; ctx.lineWidth = 8; ctx.strokeRect(8, 8, w - 16, h - 16); }
  ctx.fillStyle = opts.fg || '#1d1b17';
  ctx.textAlign = opts.align || 'center';
  ctx.textBaseline = 'top';
  let y = opts.pad ?? 22;
  const x = ctx.textAlign === 'left' ? (opts.pad ?? 26) : w / 2;
  for (const line of lines) {
    const isTitle = line.startsWith('#');
    const text = isTitle ? line.slice(1) : line;
    const size = isTitle ? (opts.titleSize || 40) : (opts.size || 24);
    ctx.font = `${isTitle ? '700' : '400'} ${size}px ${opts.font || '"PT Mono", monospace'}`;
    ctx.fillStyle = isTitle ? (opts.titleColor || opts.fg || '#1d1b17') : (opts.fg || '#1d1b17');
    ctx.fillText(text, x, y);
    y += size * 1.3;
  }
  if (opts.handwritten) {
    ctx.strokeStyle = 'rgba(30,40,90,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w * 0.6, h * 0.85); ctx.bezierCurveTo(w * 0.7, h * 0.75, w * 0.75, h * 0.95, w * 0.9, h * 0.82); ctx.stroke();
  }
  return c;
}
