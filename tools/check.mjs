// Синтаксическая проверка всех модулей игры: node --check для каждого .js в src/ и server.js.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [path.join(ROOT, 'server.js')];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.js')) files.push(p);
  }
})(path.join(ROOT, 'src'));

let failed = 0;
for (const f of files) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
  } catch (e) {
    failed++;
    console.error(`✗ ${path.relative(ROOT, f)}\n${e.stderr?.toString() || e.message}`);
  }
}
console.log(`Проверено файлов: ${files.length}, с ошибками: ${failed}`);
process.exit(failed ? 1 : 0);
