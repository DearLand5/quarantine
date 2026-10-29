// Шина событий: слабая связь между независимыми модулями.
// Каждый подписчик получает функцию отписки, чтобы модули могли корректно освобождать обработчики.
export class EventBus {
  constructor() { this.handlers = new Map(); }

  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
    return () => this.off(type, fn);
  }

  once(type, fn) {
    const off = this.on(type, (payload) => { off(); fn(payload); });
    return off;
  }

  off(type, fn) {
    const set = this.handlers.get(type);
    if (set) set.delete(fn);
  }

  emit(type, payload) {
    const set = this.handlers.get(type);
    if (!set) return;
    // Копия, чтобы подписчики могли отписываться прямо во время обработки.
    for (const fn of [...set]) {
      try { fn(payload); } catch (err) { console.error(`[EventBus] Ошибка в обработчике "${type}":`, err); }
    }
  }

  clear() { this.handlers.clear(); }
}
