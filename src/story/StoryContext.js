// Сюжетный контекст — единственный «фасад», через который данные сценария (сообщения, диалоги, события,
// расписания) читают и меняют мир. Так данные не зависят от внутреннего устройства систем.
import { CHATS, GROUP } from '../data/messages.js';

export class StoryContext {
  constructor(game) {
    this.g = game;
    const g = game;
    this.rel = g.rel;
    this.quest = g.quests;
    this.contacts = g.contacts;
    this.ambience = g.ambience;
    this.phone = { glitch: () => g.phone.glitch() };
  }

  get story() { return this.g.story; }
  get time() { return this.g.gs.time; }
  get playSeconds() { return this.g.gs.data.stats.playSeconds; }

  flag(name) { return this.g.gs.flag(name); }
  setFlag(name, v = true) { this.g.gs.setFlag(name, v); }

  /** Сколько реальных секунд прошло с момента события (Infinity, если не было) */
  since(eventId) {
    const at = this.g.events.firedAt(eventId);
    return at === undefined ? -Infinity : this.playSeconds - at;
  }

  // Инвентарь
  hasItem(id) { return this.g.inventory.has(id); }
  give(id, qty = 1) { this.g.inventory.add(id, qty); }
  take(id, qty = 1) { return this.g.inventory.remove(id, qty); }

  // Переписки
  runSeq(id) { this.g.chats.runSequence(id); }
  closeChoice(id) { this.g.chats.closeChoice(id); }
  setVisible(chatId) { this.g.chats.setVisible(chatId); }
  broadcast(fact) { this.rel.broadcast(fact, CHATS[GROUP].members.filter((m) => this.g.rel.get(m))); }

  // Улики
  clue(id) {
    const list = this.g.gs.data.story.clues;
    if (list.includes(id)) return;
    list.push(id);
    this.g.bus.emit('clue:found', { id });
  }
  knowsClue(id) { return this.g.gs.data.story.clues.includes(id); }
  photoTag(tag) { return this.g.gallery.hasTag(tag); }

  // Мир
  playerRoom() { return this.g.rooms.current; }
  playerApartment() { return this.g.rooms.room?.apartment || null; }
  playerX() { return this.g.player.pos.x; }
  lookingWest() { return this.g.cam.forward().x < -0.75; }
  doorClosed(id) { return !this.g.gs.door(id).open; }
  npcAt(id, node) { const n = this.g.npcs.get(id); return !!n && n.node === node && !n.moving; }
  npcActivity(id) { const n = this.g.npcs.get(id); return n && !n.moving ? n.activity : null; }
  flicker(circuit = 'corridor', duration = 1.5) { this.g.bus.emit('lights:flicker', { circuit, duration }); }
  busy() { return this.g.dialogue.isActive || this.g.mode !== 'play' || !!this.g.contacts.active; }

  // Действия сценария, требующие нескольких систем
  vetrovPing(force = false) { this.g.story.vetrovPing(force); }
  dropNote() { this.g.story.dropNote(); }
  inviteZina() { this.g.story.inviteZina(); }
  deliverInhaler() { this.g.story.deliverInhaler(); }
  witnessGena() { this.g.story.witnessGena(); }
  knockPeephole() { this.g.story.knockPeephole(); }
  knockOpen() { this.g.story.knockOpen(); }
}
