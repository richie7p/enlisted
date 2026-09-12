type Bus = { master: GainNode; sfx: GainNode; music: GainNode; ctx: AudioContext };

let bus: Bus | null = null;
let musicTimer: number | null = null;

function ctxNow(c: AudioContext) {
  return c.currentTime;
}

export function unlockAudio() {
  try {
    if (!bus) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      const ctx = new Ctx({ latencyHint: "interactive" });
      const master = ctx.createGain();
      const sfxNode = ctx.createGain();
      const music = ctx.createGain();
      sfxNode.connect(master);
      music.connect(master);
      master.connect(ctx.destination);
      bus = { ctx, master, sfx: sfxNode, music };
    }
    if (bus.ctx.state === "suspended") void bus.ctx.resume();
    return bus;
  } catch {
    return null;
  }
}

export function setMix(sfx: number, music: number) {
  const b = bus;
  if (!b) return;
  b.sfx.gain.setTargetAtTime(sfx * sfx, ctxNow(b.ctx), 0.03);
  b.music.gain.setTargetAtTime(music * music * 0.45, ctxNow(b.ctx), 0.05);
}

function noiseBuffer(ctx: AudioContext, seconds = 0.25) {
  const n = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function beep(freq: number, dur: number, type: OscillatorType, gain = 0.08, dest?: AudioNode) {
  const b = bus;
  if (!b) return;
  const t = ctxNow(b.ctx);
  const osc = b.ctx.createOscillator();
  const g = b.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(dest ?? b.sfx);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export function sfx(kind: string) {
  try {
    const b = bus;
    if (!b) return;
  const t = ctxNow(b.ctx);
  const dest = b.sfx;
  if (kind === "ui") {
    beep(520, 0.06, "square", 0.04);
    return;
  }
  if (kind === "ui2") {
    beep(280, 0.08, "triangle", 0.05);
    return;
  }
  if (kind === "radio") {
    beep(880, 0.04, "square", 0.03);
    beep(440, 0.08, "square", 0.025);
    return;
  }
  if (kind === "reload") {
    beep(180, 0.05, "square", 0.04);
    beep(320, 0.08, "triangle", 0.03);
    return;
  }
  if (kind === "hit") {
    const src = b.ctx.createBufferSource();
    src.buffer = noiseBuffer(b.ctx, 0.08);
    const f = b.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 900;
    const g = b.ctx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(t + 0.1);
    return;
  }
  if (kind === "down") {
    beep(90, 0.35, "sine", 0.1);
    return;
  }
  if (kind === "explode") {
    const src = b.ctx.createBufferSource();
    src.buffer = noiseBuffer(b.ctx, 0.4);
    const f = b.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(1400, t);
    f.frequency.exponentialRampToValueAtTime(120, t + 0.35);
    const g = b.ctx.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start(t);
    return;
  }
  if (kind === "promote") {
    [392, 523, 659, 784].forEach((f, i) => {
      const osc = b.ctx.createOscillator();
      const g = b.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.08, t + i * 0.12 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.28);
      osc.connect(g);
      g.connect(dest);
      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 0.3);
    });
    return;
  }
  if (kind.startsWith("shoot")) {
    const src = b.ctx.createBufferSource();
    src.buffer = noiseBuffer(b.ctx, 0.12);
    src.playbackRate.value = 0.92 + Math.random() * 0.18;
    const f = b.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = kind === "shoot-sniper" ? 400 : kind === "shoot-lmg" ? 700 : 1100;
    f.Q.value = 0.7;
    const g = b.ctx.createGain();
    const vol = kind === "shoot-pistol" ? 0.08 : 0.11;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === "shoot-sniper" ? 0.16 : 0.07));
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start(t);
    beep(kind === "shoot-pistol" ? 240 : 140, 0.03, "square", 0.03);
  }
  } catch {
    /* audio is optional — never block UI */
  }
}

export function startMusic() {
  const b = unlockAudio();
  stopMusic();
  if (!b) return;
  const loop = () => {
    if (!bus) return;
    const base = 98;
    [0, 3, 7, 10].forEach((st, i) => {
      const osc = b.ctx.createOscillator();
      const g = b.ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = base * Math.pow(2, st / 12);
      const t = ctxNow(b.ctx) + i * 0.55;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.035, t + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      osc.connect(g);
      g.connect(b.music);
      osc.start(t);
      osc.stop(t + 1.2);
    });
    musicTimer = window.setTimeout(loop, 2400);
  };
  loop();
}

export function stopMusic() {
  if (musicTimer != null) {
    clearTimeout(musicTimer);
    musicTimer = null;
  }
}

if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (!bus) return;
    if (document.hidden) void bus.ctx.suspend();
    else void bus.ctx.resume();
  });
}
