// Атмосферный звук: фоновые петли по комнатам и редкие случайные события (трубы, шаги сверху, голоса за стеной).
// События выбираются с учётом состояния мира — после отключения света, например, перестаёт гудеть холодильник.
export class Ambience {
  constructor(audio, gameState, bus) {
    this.audio = audio;
    this.gs = gameState;
    this.bus = bus;
    this.env = 'home';
    this.oneShotTimer = 12;
    this.checkTimer = 0;
    this.tension = 0;
    bus.on('room:changed', ({ room }) => {
      if (!room) return;
      this.env = room.ambient || 'home';
      this.audio.setEnvironment(this.env);
    });
  }

  ensure(id, name, cond, opts) {
    const has = this.audio.hasLoop(id);
    if (cond && !has) this.audio.loop(id, name, opts);
    else if (!cond && has) this.audio.stopLoop(id, 1.2);
  }

  update(dt, playerPos) {
    if (!this.audio.ready) return;
    this.checkTimer -= dt;
    if (this.checkTimer <= 0) {
      this.checkTimer = 0.5;
      const w = this.gs.data.world;
      const f = this.gs.data.flags;
      this.ensure('vent', 'vent', true, { bus: 'ambient', volume: 0.35, reverb: false });
      const vent = this.audio.loops.get('vent');
      vent?.setVolume({ corridor: 0.5, stair: 0.3, home: 0.18, neighbor: 0.2 }[this.env] ?? 0.25, 1.5);
      this.ensure('city', 'city', true, { bus: 'ambient', volume: 0.12, reverb: false });
      this.ensure('fridge', 'fridge', w.power.apartment, { bus: 'ambient', pos: { x: 4.1, y: 0.8, z: -4.15 }, volume: 0.35, ref: 0.8 });
      this.ensure('fluo', 'fluorescent', w.power.corridor && !w.brokenLamps.includes('L_c5'), { bus: 'ambient', pos: { x: 7.5, y: 2.5, z: 0 }, volume: 0.6, ref: 0.8, rolloff: 2 });
      this.ensure('clock45', 'clock', true, { bus: 'ambient', pos: { x: -9.6, y: 1.9, z: -7.3 }, volume: 0.5, ref: 0.6, rolloff: 2 });
      this.ensure('tv50', 'tv', !f.tv50_off, { bus: 'ambient', pos: { x: 0, y: 1.2, z: 2.6 }, volume: 0.5, ref: 1, rolloff: 1.6 });
      this.ensure('wind', 'wind', true, { bus: 'ambient', pos: { x: 15.3, y: 2.2, z: -1.3 }, volume: 0.5, ref: 1.2 });
      this.ensure('drone', 'drone', this.tension > 0.3, { bus: 'music', volume: 0.25 * this.tension, fade: 3 });
    }

    this.oneShotTimer -= dt;
    if (this.oneShotTimer <= 0) {
      this.oneShotTimer = 16 + Math.random() * 30;
      this.randomEvent(playerPos);
    }
  }

  randomEvent(p) {
    const r = Math.random();
    const f = this.gs.data.flags;
    if (r < 0.25) {
      this.audio.play('pipes', { bus: 'ambient', pos: { x: p.x + (Math.random() - 0.5) * 6, y: 2.4, z: p.z + (Math.random() - 0.5) * 4 } });
      this.caption('[в трубах что-то гулко стучит]');
    } else if (r < 0.45) {
      // Шаги этажом выше — по пустому, казалось бы, седьмому
      this.audio.play('steps_far', { bus: 'ambient', pos: { x: p.x + (Math.random() - 0.5) * 8, y: 4.2, z: p.z + (Math.random() - 0.5) * 4 }, count: 4 + Math.floor(Math.random() * 5) });
      this.caption('[шаги сверху]');
    } else if (r < 0.62) {
      const spots = [{ x: 0, y: 1.6, z: 3.0 }, { x: -4, y: 1.6, z: -2.6 }, { x: -8, y: 1.6, z: 3.2 }];
      const s = spots[Math.floor(Math.random() * spots.length)];
      this.audio.play('babble', { bus: 'ambient', pos: s, duration: 2.5 + Math.random() * 2, pitch: 120 + Math.random() * 100, muffled: true, volume: 0.6 });
      this.caption('[за стеной неразборчиво разговаривают]');
    } else if (r < 0.75) {
      this.audio.play('siren', { bus: 'ambient', volume: 0.6 });
      this.caption('[далёкая сирена]');
    } else if (r < 0.85 && f.after_vetrov) {
      this.audio.play('whisper', { bus: 'ambient', pos: { x: 8, y: 1.4, z: 2.2 }, duration: 1.8, volume: 0.5 });
    } else {
      this.audio.play('drip', { bus: 'ambient', pos: { x: 3.0, y: 0.8, z: -2.6 } });
    }
  }

  caption(text) {
    if (Math.random() < 0.6) this.bus.emit('caption:sound', { text });
  }

  setTension(v) { this.tension = Math.max(0, Math.min(1, v)); }
}
