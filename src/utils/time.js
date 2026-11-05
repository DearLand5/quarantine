// Игровое время хранится в минутах от полуночи 26 октября (может быть > 1440 — следующие сутки).
export function fmtTime(minutes) {
  const m = ((Math.floor(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// Ночь главы 1: "21:40" -> 1300; "00:30" -> 1470 (часы раньше 12:00 считаются следующими сутками)
export function t(str) {
  const [h, m] = str.split(':').map(Number);
  const base = h * 60 + m;
  return h < 12 ? base + 1440 : base;
}

// Ночь главы 2 (27 → 28 октября)
export function t2(str) { return t(str) + 1440; }

// Дневное время 27 октября (для истории сообщений): "08:15" -> 1440 + 495
export function day2(str) {
  const [h, m] = str.split(':').map(Number);
  return 1440 + h * 60 + m;
}

const DAYS = ['26 октября', '27 октября', '28 октября', '29 октября'];
const WEEKDAYS = ['понедельник', 'вторник', 'среда', 'четверг'];

export function fmtDay(minutes) {
  return DAYS[Math.max(0, Math.min(DAYS.length - 1, Math.floor(minutes / 1440)))];
}

export function fmtWeekday(minutes) {
  return WEEKDAYS[Math.max(0, Math.min(WEEKDAYS.length - 1, Math.floor(minutes / 1440)))];
}
