// Procedural sound effects via WebAudio (no asset files needed).
let ctx = null, master = null, noiseBuf = null;

export function initAudio() {
  if (ctx) { ctx.resume?.(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.45;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch {
    ctx = null;
  }
}

function env(gain, vol, dur, attack = 0.005) {
  const t = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

function noise(dur, f0, f1, { q = 1, vol = 0.4, type = 'bandpass', attack = 0.005 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const filt = ctx.createBiquadFilter();
  filt.type = type;
  filt.Q.value = q;
  filt.frequency.setValueAtTime(f0, t);
  filt.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain();
  env(g, vol, dur, attack);
  src.connect(filt).connect(g).connect(master);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
}

function tone(dur, f0, f1, { type = 'sine', vol = 0.3, attack = 0.005, delay = 0 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export const sfx = {
  slash: (c = 0) => noise(c === 2 ? 0.32 : 0.17, 4200, 500, { q: 1.4, vol: 0.35 }),
  enemySwing: () => noise(0.16, 2200, 400, { q: 1.2, vol: 0.2 }),
  hit: (crit) => {
    tone(0.14, crit ? 220 : 160, 45, { type: 'triangle', vol: 0.55 });
    noise(0.09, 1800, 400, { vol: 0.35 });
    if (crit) tone(0.25, 1400, 900, { type: 'square', vol: 0.06 });
  },
  palm: () => { tone(0.55, 420, 70, { vol: 0.4 }); noise(0.45, 900, 150, { q: 0.7, vol: 0.3, attack: 0.03 }); },
  hurt: () => tone(0.22, 240, 90, { type: 'square', vol: 0.14 }),
  jump: (dbl) => noise(dbl ? 0.35 : 0.2, 400, 2600, { q: 0.8, vol: dbl ? 0.25 : 0.12, attack: 0.03 }),
  dash: () => noise(0.22, 3000, 600, { q: 0.6, vol: 0.25, attack: 0.01 }),
  charge: () => { tone(0.9, 120, 480, { type: 'sawtooth', vol: 0.08, attack: 0.3 }); noise(0.9, 300, 3000, { vol: 0.12, attack: 0.4 }); },
  ult: () => {
    tone(1.4, 90, 28, { type: 'sawtooth', vol: 0.35 });
    noise(1.1, 5000, 180, { q: 0.5, vol: 0.55 });
    tone(0.6, 1800, 300, { type: 'square', vol: 0.05, delay: 0.05 });
  },
  slam: () => { tone(0.8, 80, 30, { type: 'triangle', vol: 0.6 }); noise(0.6, 1200, 100, { vol: 0.45 }); },
  kill: () => tone(0.35, 520, 160, { type: 'triangle', vol: 0.18 }),
  heal: () => { tone(0.25, 520, 880, { vol: 0.15 }); tone(0.3, 780, 1320, { vol: 0.1, delay: 0.08 }); },
  gong: () => {
    tone(2.2, 110, 104, { vol: 0.35, attack: 0.01 });
    tone(2.0, 277, 270, { vol: 0.12, attack: 0.01 });
    tone(1.6, 415, 405, { vol: 0.06, attack: 0.01 });
  },
};
