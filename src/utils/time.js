// Игровое время хранится в минутах от полуночи первого дня (может быть > 1440).
export function fmtTime(minutes) {
  const m = Math.floor(minutes) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// "21:40" -> 1300; "00:30" -> 1470 (часы раньше 12:00 считаются следующими сутками ночи)
export function t(str) {
  const [h, m] = str.split(':').map(Number);
  const base = h * 60 + m;
  return h < 12 ? base + 1440 : base;
}

export function fmtDay(minutes) {
  return minutes >= 1440 ? '27 октября' : '26 октября';
}

export function fmtWeekday(minutes) {
  return minutes >= 1440 ? 'вторник' : 'понедельник';
}
