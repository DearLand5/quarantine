// Изображения-вложения. 2D-снимки рисуются процедурно; «кадры с камеры» рендерятся из настоящей 3D-сцены,
// поэтому их можно сопоставить с тем, что игрок видит в мире.
import { Random, hashString } from '../utils/Random.js';

function cv(w = 480, h = 360) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function grain(ctx, w, h, amount, seed) {
  const r = new Random(seed);
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r.next() - 0.5) * amount;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

function flashGlare(ctx, x, y, r) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, 'rgba(255,255,240,0.55)');
  g.addColorStop(0.3, 'rgba(255,250,220,0.15)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

export const PHOTO_META = {
  basement_hatch: { caption: 'Подвал, 19:12', tags: ['basement'] },
  zina_ceiling: { caption: 'Потолок', tags: [] },
  lyosha_facade: { caption: 'Дом снаружи', tags: ['facade', 'window52'] },
  lisa_ramen: { caption: 'Доширак', tags: [] },
  denis_cam_1: { caption: 'CAM-49 · 21:13', tags: ['cam', 'figure52'] },
  denis_cam_2: { caption: 'CAM-49 · 21:41', tags: ['cam', 'figure52'] },
  denis_cam_3: { caption: 'CAM-49 · 21:53', tags: ['cam'] },
};

export const PAINT_2D = {
  basement_hatch() {
    const [c, ctx] = cv();
    const g = ctx.createLinearGradient(0, 0, 0, 360);
    g.addColorStop(0, '#1b1a17'); g.addColorStop(1, '#0b0b0a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 480, 360);
    const r = new Random(17);
    for (let i = 0; i < 300; i++) { ctx.fillStyle = `rgba(${r.int(60, 110)},${r.int(55, 100)},${r.int(45, 90)},0.25)`; ctx.fillRect(r.next() * 480, r.next() * 360, r.range(1, 6), r.range(1, 4)); }
    // Мокрый пол, отражение вспышки
    ctx.fillStyle = 'rgba(40,50,55,0.6)'; ctx.fillRect(0, 270, 480, 90);
    // Люк
    ctx.save(); ctx.translate(250, 190);
    ctx.fillStyle = '#2e2a24'; ctx.beginPath(); ctx.ellipse(0, 0, 130, 95, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#5b4a36'; ctx.lineWidth = 10; ctx.stroke();
    ctx.strokeStyle = '#3d3125'; ctx.lineWidth = 3;
    for (let a = 0; a < 12; a++) { ctx.beginPath(); ctx.arc(Math.cos(a / 12 * 6.28) * 115, Math.sin(a / 12 * 6.28) * 82, 5, 0, 7); ctx.stroke(); }
    ctx.fillStyle = '#c8b28a'; ctx.font = 'bold 22px "PT Mono", monospace'; ctx.textAlign = 'center';
    ctx.fillText('ОБЪЕКТ 17', 0, -12);
    ctx.font = '15px "PT Mono", monospace';
    ctx.fillText('ВХОД ПО ДОПУСКУ', 0, 14);
    ctx.fillText('уровень 1', 0, 36);
    // Приоткрытая щель — чёрная
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(-60, 50, 70, 10, -0.3, 0, 7); ctx.fill();
    ctx.restore();
    flashGlare(ctx, 230, 150, 260);
    grain(ctx, 480, 360, 34, 1912);
    return c;
  },
  zina_ceiling() {
    const [c, ctx] = cv();
    ctx.fillStyle = '#d7d1bf'; ctx.fillRect(0, 0, 480, 360);
    ctx.fillStyle = '#c9b38a'; ctx.beginPath(); ctx.arc(250, 160, 45, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff6dc'; ctx.beginPath(); ctx.arc(250, 160, 22, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(80,60,40,0.3)'; ctx.beginPath(); ctx.moveTo(20, 300); ctx.lineTo(300, 260); ctx.stroke();
    grain(ctx, 480, 360, 18, 3);
    return c;
  },
  lyosha_facade() {
    const [c, ctx] = cv();
    ctx.fillStyle = '#0a0d10'; ctx.fillRect(0, 0, 480, 360);
    // Засветка неба
    const sky = ctx.createLinearGradient(0, 0, 0, 120);
    sky.addColorStop(0, '#0a0d10'); sky.addColorStop(1, '#2a2620');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, 480, 120);
    // Дом — вид снизу, перспектива
    ctx.save(); ctx.translate(240, 380); ctx.transform(1, 0, 0.0, 1, 0, 0);
    ctx.fillStyle = '#1a1d1c'; ctx.beginPath(); ctx.moveTo(-200, 0); ctx.lineTo(-150, -360); ctx.lineTo(150, -360); ctx.lineTo(200, 0); ctx.fill();
    ctx.restore();
    const floors = 9, cols = 6;
    const r = new Random(6);
    for (let f = 0; f < floors; f++) {
      for (let col = 0; col < cols; col++) {
        const yb = 340 - f * 36;
        const shrink = 1 - f * 0.028;
        const x = 240 + (col - (cols - 1) / 2) * 52 * shrink;
        const lit = f === 5 && col === cols - 3;
        ctx.fillStyle = lit ? '#e8c47a' : (r.chance(0.12) ? '#6a5a3a' : '#0c0e0e');
        ctx.fillRect(x - 15 * shrink, yb - 24, 30 * shrink, 22);
        if (lit) {
          // Силуэт в окне 52-й
          ctx.fillStyle = '#1a140c';
          ctx.beginPath(); ctx.ellipse(x, yb - 17, 3.4, 4, 0, 0, 7); ctx.fill();
          ctx.fillRect(x - 5, yb - 13, 10, 11);
        }
      }
    }
    // Мигалки снизу и сетка забора
    ctx.fillStyle = 'rgba(60,110,255,0.5)'; ctx.beginPath(); ctx.arc(70, 345, 30, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,60,40,0.4)'; ctx.beginPath(); ctx.arc(420, 350, 26, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(120,120,110,0.35)'; ctx.lineWidth = 1;
    for (let x = 0; x < 480; x += 14) { ctx.beginPath(); ctx.moveTo(x, 290); ctx.lineTo(x + 40, 360); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + 40, 290); ctx.lineTo(x, 360); ctx.stroke(); }
    grain(ctx, 480, 360, 40, 77);
    return c;
  },
  lisa_ramen() {
    const [c, ctx] = cv();
    ctx.fillStyle = '#3a2e26'; ctx.fillRect(0, 0, 480, 360);
    ctx.fillStyle = '#e8e2d4'; ctx.beginPath(); ctx.ellipse(240, 190, 150, 110, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#c98a3a'; ctx.beginPath(); ctx.ellipse(240, 185, 125, 88, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#f0d27a'; ctx.lineWidth = 4;
    for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.arc(240 + Math.cos(i) * 40, 185 + Math.sin(i * 1.3) * 30, 30 + i, i, i + 1.5); ctx.stroke(); }
    ctx.fillStyle = '#fff8e0'; ctx.beginPath(); ctx.ellipse(270, 170, 34, 26, 0.2, 0, 7); ctx.fill();
    ctx.fillStyle = '#f2b52c'; ctx.beginPath(); ctx.arc(272, 170, 14, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,120,0.7)'; ctx.fillRect(170, 200, 50, 18);
    grain(ctx, 480, 360, 14, 9);
    return c;
  },
};

/** Надпись-таймстамп поверх кадра камеры наблюдения и перевод в «ночной режим». */
export function stampCamFrame(dataUrl, label) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const [c, ctx] = cv(img.width, img.height);
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < d.data.length; i += 4) {
        const l = (d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11) * 1.25;
        d.data[i] = l * 0.75; d.data[i + 1] = l; d.data[i + 2] = l * 0.8;
      }
      ctx.putImageData(d, 0, 0);
      // Бочкообразная «рыбий глаз» виньетка
      const g = ctx.createRadialGradient(c.width / 2, c.height / 2, c.height * 0.3, c.width / 2, c.height / 2, c.width * 0.62);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.92)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = '#e8ffe8'; ctx.font = '15px "PT Mono", monospace';
      ctx.fillText(label, 14, c.height - 16);
      ctx.fillText('CAM-49  IR', 14, 22);
      grain(ctx, c.width, c.height, 26, hashString(label));
      resolve(c.toDataURL('image/jpeg', 0.75));
    };
    img.src = dataUrl;
  });
}
