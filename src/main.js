// Точка входа: загрузка, экран «нажмите, чтобы начать» (нужен жест для звука и полноэкранного режима), меню.
import { Game } from './core/Game.js';

const statusEl = document.getElementById('boot-status');
const startBtn = document.getElementById('boot-start');
const bootEl = document.getElementById('boot');
const setStatus = (t) => { statusEl.textContent = t; };

function showFatal(err) {
  console.error(err);
  setStatus(`Не удалось запустить игру: ${err?.message || err}. Проверьте поддержку WebGL и откройте страницу через http(s)://, а не file://.`);
  statusEl.style.color = '#e0796b';
}

async function main() {
  const canvas = document.getElementById('gl');
  const probe = document.createElement('canvas');
  if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) throw new Error('WebGL недоступен в этом браузере');
  const game = new Game(canvas, document.getElementById('ui-root'));
  await game.boot(setStatus);
  setStatus('');
  startBtn.hidden = false;
  startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    try { await game.audio.init(); } catch (e) { console.warn('Звук не запущен', e); }
    // Полноэкранный режим и горизонтальная ориентация — где браузер позволяет
    try {
      const el = document.documentElement;
      if (matchMedia('(pointer: coarse)').matches && el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      await screen.orientation?.lock?.('landscape');
    } catch (e) { /* не поддерживается (например, iOS Safari) — играем как есть */ }
    bootEl.classList.add('hidden');
    setTimeout(() => bootEl.remove(), 1100);
    game.showMainMenu();
  }, { once: true });
}

window.addEventListener('error', (e) => console.error('[window]', e.error || e.message));
main().catch(showFatal);
