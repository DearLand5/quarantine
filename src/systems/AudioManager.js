// Модульная аудиосистема: шины громкости, пространственный звук (PannerNode), реверберация по типу помещения,
// приглушение звуков за стенами, фоновые петли и случайные атмосферные события.
// Контекст создаётся только после жеста пользователя (ограничение мобильных браузеров).
import { SYNTHS, LOOPS, makeNoiseBuffers, makeImpulse } from './SoundSynth.js';

const ENV_REVERB = { home: 0.08, neighbor: 0.1, corridor: 0.28, stair: 0.45 };

export class AudioManager {
  constructor(bus, settings) {
    this.bus = bus;
    this.settings = settings;
    this.ctx = null;
    this.ready = false;
    this.loops = new Map();
    this.fileBuffers = new Map();
    this.manifest = {};
    this.occluder = null;   // функция (x0,z0,x1,z1) -> bool
    this.listenerPos = { x: 0, y: 1.6, z: 0 };
    this.lowQuality = false;
    this.unsubs = [
      bus.on('settings:changed', () => this.applyVolumes()),
      bus.on('sound:play', (e) => this.play(e.name, e)),
    ];
  }

  async init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') await this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { console.warn('[Audio] Web Audio недоступен'); return; }
    this.ctx = new AC({ latencyHint: 'interactive' });
    const ctx = this.ctx;
    this.buffers = makeNoiseBuffers(ctx);

    this.master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);

    this.buses = {};
    for (const name of ['sfx', 'ambient', 'music', 'voice', 'ui']) {
      const g = ctx.createGain();
      g.connect(this.master);
      this.buses[name] = g;
    }
    // Реверберация: общий посыл, уровень зависит от помещения
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = makeImpulse(ctx, 2.2, 3.2);
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.15;
    this.reverbSend.connect(this.reverb).connect(this.master);

    this.applyVolumes();
    if (ctx.state === 'suspended') await ctx.resume();
    this.ready = true;
    // iOS может приостановить контекст при сворачивании — возобновляем при возврате
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.ctx?.state === 'suspended') this.ctx.resume();
    });
    this.loadFileOverrides();
  }

  setManifest(m) { this.manifest = m?.audio || {}; }

  async loadFileOverrides() {
    for (const [name, file] of Object.entries(this.manifest)) {
      try {
        const res = await fetch(`assets/audio/${file}`);
        if (!res.ok) throw new Error(res.status);
        const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
        this.fileBuffers.set(name, buf);
      } catch (e) {
        console.warn(`[Audio] Не удалось загрузить ${file}, используется синтез`, e);
      }
    }
  }

  applyVolumes() {
    if (!this.ctx) return;
    const s = this.settings.values;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.volMaster, t, 0.05);
    this.buses.sfx.gain.setTargetAtTime(s.volSfx, t, 0.05);
    this.buses.ui.gain.setTargetAtTime(s.volSfx, t, 0.05);
    this.buses.ambient.gain.setTargetAtTime(s.volAmbient, t, 0.05);
    this.buses.music.gain.setTargetAtTime(s.volMusic, t, 0.05);
    this.buses.voice.gain.setTargetAtTime(s.volVoice, t, 0.05);
  }

  setEnvironment(type) {
    if (!this.ctx) return;
    const level = ENV_REVERB[type] ?? 0.12;
    this.reverbSend.gain.setTargetAtTime(level, this.ctx.currentTime, 0.4);
  }

  /** Цепочка выхода для источника: [панорама] -> [приглушение] -> шина (+ посыл в реверб). */
  makeOutput(opts) {
    const ctx = this.ctx;
    const busNode = this.buses[opts.bus || 'sfx'];
    const vol = ctx.createGain();
    vol.gain.value = opts.volume ?? 1;
    let head = vol;
    let tail = vol;
    let panner = null;
    if (opts.pos) {
      panner = ctx.createPanner();
      panner.panningModel = this.lowQuality ? 'equalpower' : 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = opts.ref || 1.2;
      panner.rolloffFactor = opts.rolloff || 1.3;
      panner.maxDistance = 40;
      setPannerPos(panner, opts.pos, ctx);
      tail.connect(panner);
      tail = panner;
      const occluded = this.occluder && this.occluder(this.listenerPos.x, this.listenerPos.z, opts.pos.x, opts.pos.z);
      if (occluded) {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 650;
        const og = ctx.createGain(); og.gain.value = 0.55;
        tail.connect(lp).connect(og);
        tail = og;
      }
    }
    tail.connect(busNode);
    if (opts.bus !== 'ui' && opts.reverb !== false) {
      const send = ctx.createGain();
      send.gain.value = opts.pos ? 0.6 : 0.25;
      tail.connect(send).connect(this.reverbSend);
    }
    return { input: head, panner, vol };
  }

  play(name, opts = {}) {
    if (!this.ready) return;
    try {
      const out = this.makeOutput(opts);
      const file = this.fileBuffers.get(name);
      if (file) {
        const src = this.ctx.createBufferSource();
        src.buffer = file;
        src.playbackRate.value = opts.rate || 1;
        src.connect(out.input);
        src.start();
        return;
      }
      const fn = SYNTHS[name];
      if (!fn) { console.warn(`[Audio] неизвестный звук ${name}`); return; }
      fn(this.ctx, out.input, opts, this.buffers);
      // Отключаем выходную цепочку после затухания, чтобы не копить узлы
      const life = (opts.duration || 3) + 8;
      setTimeout(() => { try { out.vol.disconnect(); } catch (_) { /* уже отключено */ } }, life * 1000);
    } catch (e) {
      console.warn('[Audio] ошибка воспроизведения', name, e);
    }
  }

  loop(id, name, opts = {}) {
    if (!this.ready || this.loops.has(id)) return this.loops.get(id);
    const out = this.makeOutput({ ...opts, volume: 0 });
    let stopFn;
    const file = this.fileBuffers.get(name);
    if (file) {
      const src = this.ctx.createBufferSource();
      src.buffer = file; src.loop = true; src.connect(out.input); src.start();
      stopFn = () => src.stop();
    } else {
      const fn = LOOPS[name];
      if (!fn) return null;
      stopFn = fn(this.ctx, out.input, this.buffers);
    }
    out.vol.gain.setTargetAtTime(opts.volume ?? 1, this.ctx.currentTime, opts.fade ?? 0.6);
    const handle = {
      id, out, opts,
      setVolume: (v, fade = 0.5) => out.vol.gain.setTargetAtTime(v, this.ctx.currentTime, fade),
      setPos: (p) => out.panner && setPannerPos(out.panner, p, this.ctx),
      stop: (fade = 0.6) => {
        out.vol.gain.setTargetAtTime(0, this.ctx.currentTime, fade / 3);
        setTimeout(() => { try { stopFn(); out.vol.disconnect(); } catch (_) { /* уже остановлено */ } }, fade * 1000 + 200);
        this.loops.delete(id);
      },
    };
    this.loops.set(id, handle);
    return handle;
  }

  stopLoop(id, fade) { this.loops.get(id)?.stop(fade); }
  hasLoop(id) { return this.loops.has(id); }

  updateListener(camera) {
    if (!this.ready) return;
    const l = this.ctx.listener;
    const p = camera.getWorldPosition(this._p || (this._p = camera.position.clone()));
    this.listenerPos.x = p.x; this.listenerPos.y = p.y; this.listenerPos.z = p.z;
    const e = camera.matrixWorld.elements;
    const fx = -e[8], fy = -e[9], fz = -e[10];
    const ux = e[4], uy = e[5], uz = e[6];
    const t = this.ctx.currentTime;
    if (l.positionX) {
      l.positionX.setTargetAtTime(p.x, t, 0.02); l.positionY.setTargetAtTime(p.y, t, 0.02); l.positionZ.setTargetAtTime(p.z, t, 0.02);
      l.forwardX.setTargetAtTime(fx, t, 0.02); l.forwardY.setTargetAtTime(fy, t, 0.02); l.forwardZ.setTargetAtTime(fz, t, 0.02);
      l.upX.setTargetAtTime(ux, t, 0.02); l.upY.setTargetAtTime(uy, t, 0.02); l.upZ.setTargetAtTime(uz, t, 0.02);
    } else {
      l.setPosition(p.x, p.y, p.z);
      l.setOrientation(fx, fy, fz, ux, uy, uz);
    }
  }

  suspend() { this.ctx?.suspend(); }
  resume() { this.ctx?.resume(); }

  stopAll() { for (const h of [...this.loops.values()]) h.stop(0.3); }

  dispose() { this.stopAll(); this.unsubs.forEach((u) => u()); this.ctx?.close(); }
}

function setPannerPos(panner, p, ctx) {
  if (panner.positionX) {
    panner.positionX.value = p.x; panner.positionY.value = p.y ?? 1.5; panner.positionZ.value = p.z;
  } else panner.setPosition(p.x, p.y ?? 1.5, p.z);
}
