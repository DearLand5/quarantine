// Единое сериализуемое состояние мира.
// Все системы читают и меняют свои «срезы» этого объекта, поэтому сохранение — это просто JSON.stringify(data).
// Функции и объекты Three.js здесь не хранятся: только идентификаторы и простые данные.
import { t } from '../utils/time.js';

export const SAVE_VERSION = 3;

export function createInitialState() {
  return {
    version: SAVE_VERSION,
    time: t('21:40'),               // игровые минуты
    timeScale: 10,                   // игровых секунд за реальную секунду
    chapter: 1,
    player: { x: -2.6, z: -6.4, yaw: -0.9, pitch: -0.05, crouch: false, flashlight: false, flashBattery: 100 },
    flags: {},
    counters: {},
    world: {
      power: { apartment: true, corridor: true },   // питание квартиры игрока и коридора этажа
      breakerTripped: false,
      brokenLamps: [],
      doors: {},                                    // id -> { open, locked, chained, sealed }
      props: {},                                    // id -> произвольное состояние предметов
    },
    inventory: [],
    npcs: {},                                        // заполняется RelationshipSystem
    npcRuntime: {},                                  // позиции и текущая цель NPC
    phone: {
      battery: 64,
      charging: false,
      chats: {},
      chatOrder: [],
      activeSequences: [],
      pendingChoices: {},
      usedResponses: {},
      contacts: [],
      calls: [],
      gallery: [],
      notifications: [],
      unlocked: false,
    },
    story: { fired: {}, scheduled: [], quests: {}, clues: [], ending: null },
    stats: { playSeconds: 0, photosTaken: 0, messagesSent: 0 },
  };
}

export class GameState {
  constructor(bus) {
    this.bus = bus;
    this.data = createInitialState();
  }

  reset() { this.data = createInitialState(); }

  get time() { return this.data.time; }

  flag(name) { return this.data.flags[name]; }

  setFlag(name, value = true) {
    const prev = this.data.flags[name];
    if (prev === value) return;
    this.data.flags[name] = value;
    this.bus.emit('flag:changed', { name, value, prev });
  }

  inc(name, by = 1) {
    this.data.counters[name] = (this.data.counters[name] || 0) + by;
    return this.data.counters[name];
  }

  door(id) {
    if (!this.data.world.doors[id]) this.data.world.doors[id] = { open: false, locked: true, chained: false, sealed: false };
    return this.data.world.doors[id];
  }

  prop(id) {
    if (!this.data.world.props[id]) this.data.world.props[id] = {};
    return this.data.world.props[id];
  }

  serialize() { return JSON.parse(JSON.stringify(this.data)); }

  load(data) {
    // Объединяем с начальным состоянием, чтобы новые поля из обновлений игры имели значения по умолчанию.
    this.data = deepMerge(createInitialState(), data);
  }
}

function deepMerge(base, over) {
  if (Array.isArray(over)) return over;
  if (over === null || typeof over !== 'object') return over === undefined ? base : over;
  const out = Array.isArray(base) ? [] : { ...base };
  for (const k of Object.keys(over)) {
    out[k] = (base && typeof base[k] === 'object' && base[k] !== null && !Array.isArray(base[k]))
      ? deepMerge(base[k], over[k])
      : over[k];
  }
  return out;
}
