// Отслеживает, в какой комнате игрок, и скрывает невидимые помещения (упрощённое портальное отсечение):
// если игрок не внутри квартиры и её входная дверь закрыта — геометрия квартиры не рисуется, и наоборот.
const ENTRY_DOOR = { '47': 'd47', '45': 'd45', '48': 'd48', '49': 'd49', '51': 'd51' };
const PUBLIC = new Set(['corridor', 'lifthall', 'stair']);

export class RoomManager {
  constructor(world, bus) {
    this.world = world;
    this.bus = bus;
    this.current = null;
    this.zoneMeshes = new Map();
    for (const m of world.staticRoot.children) {
      const z = m.userData.zone || 'misc';
      if (!this.zoneMeshes.has(z)) this.zoneMeshes.set(z, []);
      this.zoneMeshes.get(z).push(m);
    }
    this.cullTimer = 0;
  }

  get room() { return this.current ? this.world.rooms.get(this.current) : null; }

  update(dt, pos) {
    const room = this.world.roomAt(pos.x, pos.z);
    const id = room ? room.id : this.current;
    if (id !== this.current) {
      const from = this.current;
      this.current = id;
      this.bus.emit('room:changed', { from, to: id, room });
    }
    this.cullTimer -= dt;
    if (this.cullTimer <= 0) { this.cullTimer = 0.2; this.cull(); }
  }

  cull() {
    const cur = this.room;
    const inApartment = cur?.apartment || null;
    for (const [zone, meshes] of this.zoneMeshes) {
      const room = this.world.rooms.get(zone);
      let visible = true;
      if (room) {
        if (room.apartment && room.apartment !== inApartment) {
          const door = this.world.getDoor(ENTRY_DOOR[room.apartment]);
          visible = !door || !door.isClosed;
        } else if (PUBLIC.has(zone) && inApartment) {
          const door = this.world.getDoor(ENTRY_DOOR[inApartment]);
          visible = !door || !door.isClosed;
        }
      }
      for (const m of meshes) m.visible = visible;
    }
  }

  isPublic() { return PUBLIC.has(this.current); }
}
