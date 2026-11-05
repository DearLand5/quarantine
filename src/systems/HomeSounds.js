// Бытовые звуки квартиры: вода из крана, закипающий чайник, свисток, телевизор, стиральная машина.
// Регистрируются в общих таблицах SYNTHS / LOOPS при импорте. Пики низкие, огибающие плавные,
// без прямоугольных волн — чтобы не трещать на динамиках телефонов.
import { SYNTHS, LOOPS } from './SoundSynth.js';

function noise(ctx, B, type, loop = false) {
  const src = ctx.createBufferSource();
  src.buffer = B[type];
  src.loop = loop;
  if (loop) src.loopStart = 0;
  return src;
}

/** Плавная огибающая: линейная атака, держим, линейное затухание (без щелчков на краях). */
function shape(g, t, a, hold, r, peak) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.setValueAtTime(peak, t + a + hold);
  g.gain.linearRampToValueAtTime(0.0001, t + a + hold + r);
}

Object.assign(SYNTHS, {
  /** Свисток чайника: два близких синуса с вибрато и лёгким паром */
  hm_whistle(ctx, out, o, B) {
    const t = ctx.currentTime;
    const dur = o.duration || 4.5;
    const g = ctx.createGain();
    shape(g, t, 0.7, dur - 1.7, 1.0, 0.07);
    const f1 = ctx.createOscillator(); f1.type = 'sine';
    f1.frequency.setValueAtTime(1750, t); f1.frequency.linearRampToValueAtTime(1980, t + 0.9);
    const f2 = ctx.createOscillator(); f2.type = 'sine';
    f2.frequency.setValueAtTime(2620, t); f2.frequency.linearRampToValueAtTime(2960, t + 0.9);
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 5.5;
    const lg = ctx.createGain(); lg.gain.value = 22;
    lfo.connect(lg); lg.connect(f1.frequency);
    f1.connect(g); f2.connect(g2).connect(g);
    const src = noise(ctx, B, 'pink', true);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 1.2;
    const ng = ctx.createGain(); shape(ng, t, 0.7, dur - 1.7, 1.0, 0.05);
    src.connect(bp).connect(ng).connect(out);
    g.connect(out);
    for (const n of [f1, f2, lfo]) { n.start(t); n.stop(t + dur + 0.1); }
    src.start(t, 0); src.stop(t + dur + 0.1);
  },
  /** Три тихих сигнала (конец стирки) */
  hm_beep(ctx, out) {
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const s = t + i * 0.32;
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 1040;
      const g = ctx.createGain(); shape(g, s, 0.03, 0.12, 0.06, 0.08);
      o.connect(g).connect(out); o.start(s); o.stop(s + 0.3);
    }
  },
  /** Вода начинает литься: короткий плеск и бульканье трубы */
  hm_splash(ctx, out, o, B) {
    const t = ctx.currentTime;
    const src = noise(ctx, B, 'pink');
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(500, t); bp.frequency.linearRampToValueAtTime(1500, t + 0.5); bp.Q.value = 0.9;
    const g = ctx.createGain(); shape(g, t, 0.12, 0.2, 0.6, 0.12);
    src.connect(bp).connect(g).connect(out); src.start(t, 0.3); src.stop(t + 1.1);
    for (let i = 0; i < 3; i++) {
      const s = t + 0.05 + i * 0.09;
      const os = ctx.createOscillator(); os.type = 'sine';
      os.frequency.setValueAtTime(220 + Math.random() * 120, s); os.frequency.linearRampToValueAtTime(420 + Math.random() * 120, s + 0.07);
      const og = ctx.createGain(); shape(og, s, 0.01, 0.03, 0.05, 0.04);
      os.connect(og).connect(out); os.start(s); os.stop(s + 0.12);
    }
  },
  /** Чай льётся в кружку и негромко звякает ложка */
  hm_pour(ctx, out, o, B) {
    const t = ctx.currentTime;
    const src = noise(ctx, B, 'pink');
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(900, t); bp.frequency.linearRampToValueAtTime(2200, t + 1.6); bp.Q.value = 1.4;
    const g = ctx.createGain(); shape(g, t, 0.2, 1.1, 0.5, 0.1);
    src.connect(bp).connect(g).connect(out); src.start(t, 0.2); src.stop(t + 2.0);
    for (let i = 0; i < 2; i++) {
      const s = t + 2.1 + i * 0.16;
      const os = ctx.createOscillator(); os.type = 'sine'; os.frequency.value = i ? 3420 : 2790;
      const og = ctx.createGain(); shape(og, s, 0.004, 0.01, 0.22, 0.035);
      os.connect(og).connect(out); os.start(s); os.stop(s + 0.35);
    }
  },
});

Object.assign(LOOPS, {
  /** Струя воды: розовый шум через полосовой фильтр с медленным дрейфом */
  hm_water(ctx, out, B) {
    const src = noise(ctx, B, 'pink', true);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.45;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 280;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.6;
    const lg = ctx.createGain(); lg.gain.value = 260;
    lfo.connect(lg); lg.connect(bp.frequency);
    const g = ctx.createGain(); g.gain.value = 0.2;
    src.connect(bp).connect(hp).connect(g).connect(out);
    // плеск о дно: низкий тёплый шум
    const src2 = noise(ctx, B, 'pink', true);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const g2 = ctx.createGain(); g2.gain.value = 0.16;
    src2.connect(lp).connect(g2).connect(out);
    src.start(); src2.start(0, 1.1); lfo.start();
    return () => { src.stop(); src2.stop(); lfo.stop(); };
  },
  /** Нагрев воды: шум, который с каждой секундой становится ярче и ровнее (громкость — снаружи) */
  hm_kettle(ctx, out, B) {
    const t = ctx.currentTime;
    const src = noise(ctx, B, 'pink', true);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.7;
    bp.frequency.setValueAtTime(420, t); bp.frequency.linearRampToValueAtTime(1500, t + 25);
    const am = ctx.createGain(); am.gain.value = 0.8;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 3.4;
    const lg = ctx.createGain(); lg.gain.value = 0.18;
    lfo.connect(lg); lg.connect(am.gain);
    const g = ctx.createGain(); g.gain.value = 0.22;
    src.connect(bp).connect(am).connect(g).connect(out);
    src.start(); lfo.start();
    return () => { src.stop(); lfo.stop(); };
  },
  /** Телевизор: тихий шорох эфира и низкий гул трансформатора */
  hm_tv(ctx, out, B) {
    const src = noise(ctx, B, 'pink', true);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1400;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
    const g = ctx.createGain(); g.gain.value = 0.05;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.35;
    const lg = ctx.createGain(); lg.gain.value = 0.02;
    lfo.connect(lg); lg.connect(g.gain);
    src.connect(hp).connect(lp).connect(g).connect(out);
    const hum = ctx.createOscillator(); hum.type = 'sine'; hum.frequency.value = 100;
    const hg = ctx.createGain(); hg.gain.value = 0.025;
    hum.connect(hg).connect(out);
    src.start(); lfo.start(); hum.start();
    return () => { src.stop(); lfo.stop(); hum.stop(); };
  },
  /** Стиральная машина: вращающийся барабан, всплески воды */
  hm_washer(ctx, out, B) {
    const src = noise(ctx, B, 'pink', true);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 280;
    const am = ctx.createGain(); am.gain.value = 0.7;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.85;
    const lg = ctx.createGain(); lg.gain.value = 0.3;
    lfo.connect(lg); lg.connect(am.gain);
    const g = ctx.createGain(); g.gain.value = 0.3;
    src.connect(lp).connect(am).connect(g).connect(out);
    const src2 = noise(ctx, B, 'pink', true);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.6;
    const am2 = ctx.createGain(); am2.gain.value = 0.5;
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.42;
    const lg2 = ctx.createGain(); lg2.gain.value = 0.45;
    lfo2.connect(lg2); lg2.connect(am2.gain);
    const g2 = ctx.createGain(); g2.gain.value = 0.1;
    src2.connect(bp).connect(am2).connect(g2).connect(out);
    const motor = ctx.createOscillator(); motor.type = 'sine'; motor.frequency.value = 52;
    const mg = ctx.createGain(); mg.gain.value = 0.04;
    motor.connect(mg).connect(out);
    src.start(); src2.start(0, 0.8); lfo.start(); lfo2.start(); motor.start();
    return () => { src.stop(); src2.stop(); lfo.stop(); lfo2.stop(); motor.stop(); };
  },
});
