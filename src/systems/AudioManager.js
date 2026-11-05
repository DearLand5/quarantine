// Модульная аудиосистема: шины громкости, пространственный звук (PannerNode), реверберация по типу помещения,
// приглушение звуков за стенами, фоновые петли и случайные атмосферные события.
// Контекст создаётся только после жеста пользователя (ограничение мобильных браузеров).
import { SYNTHS, LOOPS, makeNoiseBuffers, makeImpulse } from './SoundSynth.js';

const ENV_REVERB = { home: 0.08, neighbor: 0.1, corridor: 0.28, stair: 0.45, basement: 0.55 };

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
    // На телефонах: больше аудиобуфер, дешёвая панорама и короткий реверб — иначе звук «хрипит»
    // из-за перегрузки аудиопотока и клиппинга на маленьком динамике.
    this.mobile = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
    this.active = 0;          // число одновременно звучащих одноразовых звуков
    this.listenerTimer = 0;
    this.unsubs = [
      bus.on('settings:changed', () => this.applyVolumes()),
      bus.on('sound:play', (e) => this.play(e.name, e)),
      bus.on('sound:loop', (e) => this.loop(e.id, e.name, e)),
      bus.on('sound:stopLoop', (e) => this.stopLoop(e.id, e.fade)),
    ];
  }

  async init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') await this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { console.warn('[Audio] Web Audio недоступен'); return; }
    try { this.ctx = new AC({ latencyHint: this.mobile ? 'playback' : 'interactive' }); }
    catch (e) { this.ctx = new AC(); }
    const ctx = this.ctx;
    this.buffers = makeNoiseBuffers(ctx);

    this.master = ctx.createGain();
    // Запас по громкости + мягкий лимитер: сумма многих синтезированных голосов не уходит в перегруз
    this.headroom = ctx.createGain();
    this.headroom.gain.value = this.mobile ? 0.62 : 0.78;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 6;
    comp.attack.value = 0.004; comp.release.value = 0.22;
    // На телефоне срезаем инфранизкий гул: маленький динамик его не воспроизводит, а только хрипит от перегрузки
    this.lowCut = ctx.createBiquadFilter();
    this.lowCut.type = 'highpass';
    this.lowCut.frequency.value = this.mobile ? 110 : 25;
    this.lowCut.Q.value = 0.6;
    this.master.connect(this.lowCut).connect(this.headroom).connect(comp).connect(ctx.destination);

    this.buses = {};
    for (const name of ['sfx', 'ambient', 'music', 'voice', 'ui']) {
      const g = ctx.createGain();
      g.connect(this.master);
      this.buses[name] = g;
    }
    // Реверберация: общий посыл, уровень зависит от помещения
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = makeImpulse(ctx, this.mobile ? 1.3 : 2.2, 3.2);
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
      panner.panningModel = this.lowQuality || this.mobile ? 'equalpower' : 'HRTF';
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
    if (!this.ready || this.ctx.state !== 'running') return;
    // Ограничение полифонии: второстепенные звуки пропускаются, если и так звучит много
    const minor = name === 'footstep' || name === 'tap' || name === 'drip';
    if (this.active > (this.mobile ? 14 : 28) && minor) return;
    this.active++;
    setTimeout(() => { this.active--; }, ((opts.duration || 1.5) + 0.5) * 1000);
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

  updateListener(camera, dt = 0.016) {
    if (!this.ready) return;
    // Не чаще 30 раз в секунду и прямой записью значений: автоматизация каждого кадра
    // копит события в аудиопотоке и нагружает процессор
    this.listenerTimer -= dt;
    if (this.listenerTimer > 0) return;
    this.listenerTimer = 1 / 30;
    const l = this.ctx.listener;
    const p = camera.getWorldPosition(this._p || (this._p = camera.position.clone()));
    this.listenerPos.x = p.x; this.listenerPos.y = p.y; this.listenerPos.z = p.z;
    const e = camera.matrixWorld.elements;
    const fx = -e[8], fy = -e[9], fz = -e[10];
    const ux = e[4], uy = e[5], uz = e[6];
    const t = this.ctx.currentTime;
    if (l.positionX) {
      // Плавно и без накопления: отменяем прошлую цель и ставим новую. Скачок значения слышен как щелчок.
      const ramp = (param, v) => { param.cancelScheduledValues(t); param.setTargetAtTime(v, t, 0.035); };
      ramp(l.positionX, p.x); ramp(l.positionY, p.y); ramp(l.positionZ, p.z);
      ramp(l.forwardX, fx); ramp(l.forwardY, fy); ramp(l.forwardZ, fz);
      ramp(l.upX, ux); ramp(l.upY, uy); ramp(l.upZ, uz);
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
