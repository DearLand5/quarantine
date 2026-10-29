// Процедурный синтез звуков через Web Audio API. Позволяет игре звучать без единого аудиофайла.
// Каждая функция: (ctx, out, opts, buffers) — создаёт узлы, подключает их к out и сама планирует остановку.

function env(ctx, gainNode, t, a, d, peak = 1, sustain = 0) {
  const g = gainNode.gain;
  g.setValueAtTime(0.0001, t);
  g.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
  g.exponentialRampToValueAtTime(Math.max(0.0001, sustain || 0.0001), t + a + d);
}

function noiseSrc(ctx, buffers, type = 'white', loop = false) {
  const src = ctx.createBufferSource();
  src.buffer = buffers[type];
  src.loop = loop;
  if (!loop) src.playbackRate.value = 0.9 + Math.random() * 0.2;
  return src;
}

function burst(ctx, out, buffers, { t, type = 'white', filter = 'bandpass', freq = 1000, q = 1, a = 0.002, d = 0.1, peak = 0.6, offset = Math.random() }) {
  const src = noiseSrc(ctx, buffers, type);
  const f = ctx.createBiquadFilter();
  f.type = filter; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  env(ctx, g, t, a, d, peak);
  src.connect(f).connect(g).connect(out);
  src.start(t, offset * 1.5);
  src.stop(t + a + d + 0.05);
}

function tone(ctx, out, { t, type = 'sine', freq = 440, freqEnd = null, a = 0.005, d = 0.2, peak = 0.3, detune = 0 }) {
  const o = ctx.createOscillator();
  o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
  if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + a + d);
  const g = ctx.createGain();
  env(ctx, g, t, a, d, peak);
  o.connect(g).connect(out);
  o.start(t); o.stop(t + a + d + 0.05);
  return o;
}

export function makeNoiseBuffers(ctx) {
  const len = ctx.sampleRate * 3;
  const make = (fn) => {
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    fn(d);
    return b;
  };
  const white = make((d) => { for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; });
  const pink = make((d) => {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
    }
  });
  const brown = make((d) => {
    let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
  });
  return { white, pink, brown };
}

export function makeImpulse(ctx, seconds, decay) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return b;
}

// ------------------------------------------------------------------ одноразовые звуки
export const SYNTHS = {
  footstep(ctx, out, o, B) {
    const t = ctx.currentTime;
    const s = o.surface || 'tile';
    const v = (o.run ? 1 : o.crouch ? 0.35 : 0.65) * (0.85 + Math.random() * 0.3);
    if (s === 'wood') {
      tone(ctx, out, { t, freq: 120 + Math.random() * 30, freqEnd: 70, d: 0.09, peak: 0.25 * v });
      burst(ctx, out, B, { t, freq: 700, q: 1.2, d: 0.07, peak: 0.25 * v });
      if (Math.random() < 0.25) tone(ctx, out, { t: t + 0.05, type: 'triangle', freq: 300 + Math.random() * 200, freqEnd: 260, d: 0.12, peak: 0.03 * v });
    } else if (s === 'lino') {
      burst(ctx, out, B, { t, filter: 'lowpass', freq: 900, d: 0.08, peak: 0.35 * v });
      tone(ctx, out, { t, freq: 90, freqEnd: 60, d: 0.06, peak: 0.15 * v });
    } else if (s === 'concrete') {
      burst(ctx, out, B, { t, freq: 1300, q: 0.8, d: 0.09, peak: 0.4 * v });
      burst(ctx, out, B, { t: t + 0.015, freq: 3500, q: 2, d: 0.04, peak: 0.1 * v });
      tone(ctx, out, { t, freq: 80, freqEnd: 50, d: 0.07, peak: 0.18 * v });
    } else {
      burst(ctx, out, B, { t, freq: 2200, q: 1.5, d: 0.05, peak: 0.35 * v });
      burst(ctx, out, B, { t: t + 0.01, filter: 'lowpass', freq: 600, d: 0.07, peak: 0.25 * v });
    }
  },
  steps_far(ctx, out, o, B) {
    const n = o.count || 6;
    for (let i = 0; i < n; i++) {
      const t = ctx.currentTime + i * (o.interval || 0.55) + Math.random() * 0.05;
      burst(ctx, out, B, { t, filter: 'lowpass', freq: 500, d: 0.09, peak: 0.5 });
      tone(ctx, out, { t, freq: 70, freqEnd: 45, d: 0.08, peak: 0.3 });
    }
  },
  door_open(ctx, out, o, B) {
    const t = ctx.currentTime;
    burst(ctx, out, B, { t, freq: 3000, q: 4, d: 0.03, peak: 0.4 });
    if (o.creak !== false) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      const base = 70 + Math.random() * 40;
      osc.frequency.setValueAtTime(base, t + 0.08);
      osc.frequency.linearRampToValueAtTime(base * 1.6, t + 0.5);
      osc.frequency.linearRampToValueAtTime(base * 1.1, t + 0.9);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 23 + Math.random() * 10;
      const lfoG = ctx.createGain(); lfoG.gain.value = 18;
      lfo.connect(lfoG).connect(osc.frequency);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 6;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + 0.08);
      g.gain.exponentialRampToValueAtTime(0.18 * (o.volume ?? 1), t + 0.2);
      g.gain.exponentialRampToValueAtTime(0.06, t + 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
      osc.connect(f).connect(g).connect(out);
      osc.start(t + 0.08); lfo.start(t + 0.08); osc.stop(t + 1.05); lfo.stop(t + 1.05);
    }
  },
  door_close(ctx, out, o, B) {
    const t = ctx.currentTime;
    tone(ctx, out, { t, freq: 90, freqEnd: 45, d: 0.25, peak: 0.6 });
    burst(ctx, out, B, { t, filter: 'lowpass', freq: 700, d: 0.18, peak: 0.6 });
    burst(ctx, out, B, { t: t + 0.03, freq: 3200, q: 5, d: 0.04, peak: 0.25 });
  },
  lock(ctx, out, o, B) {
    const t = ctx.currentTime;
    for (let i = 0; i < 2; i++) burst(ctx, out, B, { t: t + i * 0.13, freq: 3800 + i * 400, q: 8, d: 0.04, peak: 0.45 });
    tone(ctx, out, { t: t + 0.13, type: 'triangle', freq: 1800, d: 0.05, peak: 0.05 });
  },
  chain(ctx, out, o, B) {
    const t = ctx.currentTime;
    for (let i = 0; i < 7; i++) burst(ctx, out, B, { t: t + i * 0.035 + Math.random() * 0.03, freq: 5000 + Math.random() * 3000, q: 10, d: 0.03, peak: 0.25 });
  },
  knock(ctx, out, o, B) {
    const n = o.count || 3;
    for (let i = 0; i < n; i++) {
      const t = ctx.currentTime + i * (o.interval || 0.42);
      tone(ctx, out, { t, freq: 140, freqEnd: 70, d: 0.14, peak: 0.9 * (o.volume ?? 1) });
      burst(ctx, out, B, { t, filter: 'lowpass', freq: 1100, d: 0.07, peak: 0.7 * (o.volume ?? 1) });
    }
  },
  switch(ctx, out, o, B) {
    const t = ctx.currentTime;
    burst(ctx, out, B, { t, freq: 2600, q: 3, d: 0.025, peak: 0.5 });
    burst(ctx, out, B, { t: t + 0.03, freq: 1600, q: 3, d: 0.02, peak: 0.25 });
  },
  breaker(ctx, out, o, B) {
    const t = ctx.currentTime;
    tone(ctx, out, { t, freq: 110, freqEnd: 50, d: 0.2, peak: 0.6 });
    burst(ctx, out, B, { t, freq: 2500, q: 2, d: 0.08, peak: 0.6 });
    tone(ctx, out, { t: t + 0.1, type: 'sawtooth', freq: 100, d: 0.6, peak: 0.08 });
  },
  notify(ctx, out, o) {
    const t = ctx.currentTime;
    tone(ctx, out, { t, freq: 988, d: 0.12, peak: 0.18 });
    tone(ctx, out, { t: t + 0.11, freq: 1480, d: 0.22, peak: 0.16 });
  },
  notify_group(ctx, out, o) {
    const t = ctx.currentTime;
    tone(ctx, out, { t, type: 'triangle', freq: 660, freqEnd: 880, d: 0.14, peak: 0.2 });
  },
  notify_sys(ctx, out, o) {
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) tone(ctx, out, { t: t + i * 0.28, type: 'square', freq: 1050, d: 0.18, peak: 0.06 });
  },
  vibrate(ctx, out, o) {
    const t = ctx.currentTime;
    const pulses = o.pulses || 2;
    for (let i = 0; i < pulses; i++) {
      const osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = 148 + Math.random() * 6;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
      const g = ctx.createGain();
      const s = t + i * 0.42;
      g.gain.setValueAtTime(0.0001, s); g.gain.linearRampToValueAtTime(0.22 * (o.volume ?? 1), s + 0.02);
      g.gain.setValueAtTime(0.22 * (o.volume ?? 1), s + 0.26); g.gain.linearRampToValueAtTime(0.0001, s + 0.3);
      osc.connect(f).connect(g).connect(out);
      osc.start(s); osc.stop(s + 0.32);
    }
  },
  send(ctx, out, o, B) {
    const t = ctx.currentTime;
    burst(ctx, out, B, { t, filter: 'bandpass', freq: 1800, q: 0.8, a: 0.03, d: 0.12, peak: 0.12 });
    tone(ctx, out, { t, freq: 520, freqEnd: 1040, d: 0.1, peak: 0.06 });
  },
  tap(ctx, out, o, B) {
    burst(ctx, out, B, { t: ctx.currentTime, freq: 3000, q: 2, d: 0.015, peak: 0.12 });
  },
  shutter(ctx, out, o, B) {
    const t = ctx.currentTime;
    burst(ctx, out, B, { t, freq: 4000, q: 2, d: 0.03, peak: 0.5 });
    burst(ctx, out, B, { t: t + 0.07, freq: 2500, q: 2, d: 0.04, peak: 0.4 });
  },
  glitch(ctx, out, o, B) {
    const t = ctx.currentTime;
    for (let i = 0; i < 6; i++) tone(ctx, out, { t: t + i * 0.04, type: 'square', freq: 200 + Math.random() * 2400, d: 0.03, peak: 0.07 });
    burst(ctx, out, B, { t, freq: 2000, q: 0.5, d: 0.25, peak: 0.12 });
  },
  static(ctx, out, o, B) {
    burst(ctx, out, B, { t: ctx.currentTime, freq: 2400, q: 0.4, a: 0.05, d: o.duration || 0.8, peak: 0.25 });
  },
  elevator(ctx, out, o, B) {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(48, t); osc.frequency.linearRampToValueAtTime(62, t + 3); osc.frequency.linearRampToValueAtTime(40, t + 6);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 1.2); g.gain.setValueAtTime(0.3, t + 5); g.gain.exponentialRampToValueAtTime(0.0001, t + 6.5);
    osc.connect(f).connect(g).connect(out); osc.start(t); osc.stop(t + 6.6);
    burst(ctx, out, B, { t: t + 6.2, filter: 'lowpass', freq: 400, d: 0.4, peak: 0.8 });
    tone(ctx, out, { t: t + 6.2, freq: 60, freqEnd: 35, d: 0.5, peak: 0.6 });
  },
  pipes(ctx, out, o, B) {
    const t = ctx.currentTime;
    const n = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      const s = t + i * (0.15 + Math.random() * 0.3);
      tone(ctx, out, { t: s, type: 'triangle', freq: 180 + Math.random() * 120, freqEnd: 120, d: 0.25, peak: 0.12 });
      burst(ctx, out, B, { t: s, freq: 900, q: 6, d: 0.1, peak: 0.12 });
    }
    burst(ctx, out, B, { t: t + 0.4, type: 'brown', filter: 'lowpass', freq: 300, a: 0.3, d: 1.5, peak: 0.2 });
  },
  drip(ctx, out) {
    const t = ctx.currentTime;
    tone(ctx, out, { t, freq: 1400 + Math.random() * 600, freqEnd: 700, d: 0.06, peak: 0.12 });
  },
  siren(ctx, out, o) {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator(); osc.type = 'sawtooth';
    for (let i = 0; i < 4; i++) {
      osc.frequency.setValueAtTime(600, t + i * 1.4);
      osc.frequency.linearRampToValueAtTime(900, t + i * 1.4 + 0.7);
      osc.frequency.linearRampToValueAtTime(600, t + i * 1.4 + 1.4);
    }
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 1); g.gain.exponentialRampToValueAtTime(0.0001, t + 5.6);
    osc.connect(f).connect(g).connect(out); osc.start(t); osc.stop(t + 5.7);
  },
  helicopter(ctx, out, o, B) {
    const t = ctx.currentTime;
    const src = noiseSrc(ctx, B, 'brown', true);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
    const am = ctx.createGain(); am.gain.value = 0;
    const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 11;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.5;
    lfo.connect(lfoG).connect(am.gain);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 4); g.gain.exponentialRampToValueAtTime(0.0001, t + 12);
    src.connect(f).connect(am).connect(g).connect(out);
    src.start(t); lfo.start(t); src.stop(t + 12.2); lfo.stop(t + 12.2);
  },
  babble(ctx, out, o) {
    // Неразборчивая речь: слоги из пилообразного сигнала через форманты (для NPC и голосов за стеной)
    const t0 = ctx.currentTime;
    const dur = o.duration || 1.5;
    const pitch = o.pitch || 160;
    const formants = [[700, 1200], [400, 2000], [500, 900], [300, 2300], [600, 1700]];
    const muffle = o.muffled ? 450 : 4000;
    let t = t0;
    while (t < t0 + dur) {
      const syl = 0.08 + Math.random() * 0.14;
      const osc = ctx.createOscillator(); osc.type = 'sawtooth';
      const p = pitch * (0.85 + Math.random() * 0.35);
      osc.frequency.setValueAtTime(p, t); osc.frequency.linearRampToValueAtTime(p * (0.9 + Math.random() * 0.2), t + syl);
      const [f1, f2] = formants[Math.floor(Math.random() * formants.length)];
      const b1 = ctx.createBiquadFilter(); b1.type = 'bandpass'; b1.frequency.value = f1; b1.Q.value = 5;
      const b2 = ctx.createBiquadFilter(); b2.type = 'bandpass'; b2.frequency.value = f2; b2.Q.value = 7;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = muffle;
      const g = ctx.createGain();
      env(ctx, g, t, 0.02, syl, (o.volume ?? 1) * 0.55);
      osc.connect(b1); osc.connect(b2); b1.connect(lp); b2.connect(lp); lp.connect(g).connect(out);
      osc.start(t); osc.stop(t + syl + 0.05);
      t += syl + (Math.random() < 0.18 ? 0.15 + Math.random() * 0.2 : 0.02);
    }
  },
  whisper(ctx, out, o, B) {
    const t = ctx.currentTime;
    const dur = o.duration || 2;
    const src = noiseSrc(ctx, B, 'white');
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(1800, t);
    for (let i = 0; i < dur * 6; i++) f.frequency.setValueAtTime(1200 + Math.random() * 2400, t + i / 6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18 * (o.volume ?? 1), t + 0.3);
    g.gain.setValueAtTime(0.18 * (o.volume ?? 1), t + dur - 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(out); src.start(t); src.stop(t + dur + 0.05);
  },
  sting(ctx, out, o) {
    // Редкий музыкальный акцент: диссонансный кластер с медленной атакой
    const t = ctx.currentTime;
    const base = o.base || 55;
    for (const [mult, det] of [[1, 0], [1.5, 12], [2.13, -8], [3.02, 5]]) {
      const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = base * mult; osc.detune.value = det;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(200, t); f.frequency.linearRampToValueAtTime(900, t + 2.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 1.8); g.gain.exponentialRampToValueAtTime(0.0001, t + (o.duration || 6));
      osc.connect(f).connect(g).connect(out); osc.start(t); osc.stop(t + (o.duration || 6) + 0.1);
    }
  },
  hit(ctx, out, o, B) {
    const t = ctx.currentTime;
    tone(ctx, out, { t, freq: 60, freqEnd: 30, d: 1.2, peak: 0.8 });
    burst(ctx, out, B, { t, type: 'brown', filter: 'lowpass', freq: 500, d: 1.0, peak: 0.6 });
    tone(ctx, out, { t, type: 'sawtooth', freq: 233, freqEnd: 110, d: 1.5, peak: 0.08 });
  },
  kettle(ctx, out, o, B) {
    const t = ctx.currentTime;
    burst(ctx, out, B, { t, type: 'pink', filter: 'lowpass', freq: 800, a: 2, d: 3, peak: 0.25 });
    tone(ctx, out, { t: t + 4.2, freq: 1900, freqEnd: 2100, a: 0.6, d: 1.6, peak: 0.07 });
  },
  ring(ctx, out, o) {
    const t = ctx.currentTime;
    const notes = [659, 784, 988, 784, 659, 523];
    notes.forEach((n, i) => tone(ctx, out, { t: t + i * 0.16, type: 'triangle', freq: n, d: 0.14, peak: 0.16 }));
  },
  breath(ctx, out, o, B) {
    const t = ctx.currentTime;
    burst(ctx, out, B, { t, type: 'pink', filter: 'bandpass', freq: 700, q: 0.7, a: 0.4, d: 0.8, peak: 0.15 });
  },
  heartbeat(ctx, out, o) {
    const t = ctx.currentTime;
    for (let i = 0; i < (o.count || 4); i++) {
      const s = t + i * 0.85;
      tone(ctx, out, { t: s, freq: 55, freqEnd: 40, d: 0.12, peak: 0.5 });
      tone(ctx, out, { t: s + 0.22, freq: 50, freqEnd: 38, d: 0.1, peak: 0.35 });
    }
  },
};

// ------------------------------------------------------------------ зацикленные фоны
export const LOOPS = {
  vent(ctx, out, B) {
    const src = noiseSrc(ctx, B, 'brown', true);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 180;
    const hum = ctx.createOscillator(); hum.frequency.value = 50;
    const hg = ctx.createGain(); hg.gain.value = 0.05;
    src.connect(f).connect(out); hum.connect(hg).connect(out);
    src.start(); hum.start();
    return () => { src.stop(); hum.stop(); };
  },
  fluorescent(ctx, out) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 100;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 2;
    const g = ctx.createGain(); g.gain.value = 0.03;
    o.connect(f).connect(g).connect(out); o.start();
    return () => o.stop();
  },
  fridge(ctx, out, B) {
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 58;
    const g = ctx.createGain(); g.gain.value = 0.12;
    const src = noiseSrc(ctx, B, 'pink', true);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
    const ng = ctx.createGain(); ng.gain.value = 0.1;
    o.connect(g).connect(out); src.connect(f).connect(ng).connect(out);
    o.start(); src.start();
    return () => { o.stop(); src.stop(); };
  },
  clock(ctx, out, B) {
    let alive = true;
    let next = ctx.currentTime + 0.1;
    let tick = 0;
    const timer = setInterval(() => {
      if (!alive) return;
      while (next < ctx.currentTime + 0.5) {
        const src = noiseSrc(ctx, B, 'white');
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = tick % 2 ? 3200 : 2600; f.Q.value = 12;
        const g = ctx.createGain(); env(ctx, g, next, 0.001, 0.03, 0.5);
        src.connect(f).connect(g).connect(out); src.start(next, Math.random()); src.stop(next + 0.05);
        next += 1; tick++;
      }
    }, 200);
    return () => { alive = false; clearInterval(timer); };
  },
  tv(ctx, out, B) {
    const src = noiseSrc(ctx, B, 'pink', true);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
    const g = ctx.createGain(); g.gain.value = 0.25;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 3.1;
    const lg = ctx.createGain(); lg.gain.value = 0.15;
    lfo.connect(lg).connect(g.gain);
    src.connect(f).connect(g).connect(out);
    src.start(); lfo.start();
    return () => { src.stop(); lfo.stop(); };
  },
  wind(ctx, out, B) {
    const src = noiseSrc(ctx, B, 'pink', true);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.8;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.13;
    const lg = ctx.createGain(); lg.gain.value = 300;
    lfo.connect(lg).connect(f.frequency);
    const g = ctx.createGain(); g.gain.value = 0.3;
    src.connect(f).connect(g).connect(out); src.start(); lfo.start();
    return () => { src.stop(); lfo.stop(); };
  },
  city(ctx, out, B) {
    const src = noiseSrc(ctx, B, 'brown', true);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 350;
    const g = ctx.createGain(); g.gain.value = 0.25;
    src.connect(f).connect(g).connect(out); src.start();
    return () => src.stop();
  },
  drone(ctx, out) {
    const os = [41.2, 61.7, 82.4 * 1.01].map((fq) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fq; return o; });
    const g = ctx.createGain(); g.gain.value = 0.08;
    for (const o of os) { o.connect(g); o.start(); }
    g.connect(out);
    return () => os.forEach((o) => o.stop());
  },
  ringtone(ctx, out) {
    let alive = true;
    const play = () => { if (alive) SYNTHS.ring(ctx, out, {}); };
    play();
    const timer = setInterval(play, 2200);
    return () => { alive = false; clearInterval(timer); };
  },
};
