// Минимальный статический сервер без зависимостей для запуска игры по HTTP.
// ES-модули не работают при открытии index.html через file://, поэтому нужен сервер.
// Запуск: node server.js  (порт можно задать переменной окружения PORT)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    // Защита от выхода за пределы корня проекта (../)
    let filePath = path.normalize(path.join(ROOT, urlPath));
    if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Не найдено'); return;
    }
    const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      // Без кэша: при разработке изменения видны сразу
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    res.writeHead(500); res.end('Ошибка сервера');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  «Тополиная, 14» запущена:\n`);
  console.log(`  На этом компьютере:   http://localhost:${PORT}/`);
  const nets = os.networkInterfaces();
  const lan = [];
  for (const list of Object.values(nets)) {
    for (const n of list || []) if (n.family === 'IPv4' && !n.internal) lan.push(n.address);
  }
  if (lan.length) {
    console.log(`  Откройте на телефоне в той же Wi‑Fi сети:`);
    for (const ip of lan) console.log(`                        http://${ip}:${PORT}/`);
  }
  console.log('\n  Остановить: Ctrl+C\n');
});
