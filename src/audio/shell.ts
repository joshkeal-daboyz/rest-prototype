/**
 * The thin Web Audio wrapper: builds the graph and plays what the pure core decided.
 * master -> compressor -> destination; cues -> master; hum/whine -> duck -> master.
 */
import { makeNoiseBuffer, noiseOffset } from "./noise";
import {
  CRACKLE_DB,
  FLICKER_ATTACK,
  FLICKER_RELEASE,
  LAYER_RAMP,
  crackleTick,
  dbToGain,
  envelope,
} from "./recipes";
import { DUCK_ATTACK, DUCK_RELEASE } from "./mixer";
import type { Layers } from "./layers";
import type {
  AudioContextLike,
  BiquadLike,
  BufferLike,
  Cue,
  GainNodeLike,
  NodeLike,
  OscLike,
  ParamLike,
  SourceLike,
  Voice,
} from "./types";

const NOISE_SECONDS = 2;
const NOISE_SEED = 20240519;
const MUTE_RAMP = 0.02;
const MIN_HZ = 1;

interface Handle {
  nodes: NodeLike[];
  sources: SourceLike[];
  gain: GainNodeLike;
}

function ramp(p: ParamLike, to: number, now: number, seconds: number): void {
  p.cancelScheduledValues(now);
  p.setValueAtTime(p.value, now);
  p.linearRampToValueAtTime(to, now + seconds);
}

export class Player {
  private readonly master: GainNodeLike;
  private readonly duck: GainNodeLike;
  private readonly noise: BufferLike;
  private readonly active = new Set<Handle>();
  private readonly held = new Map<string, { h: Handle; osc: OscLike }>();
  private readonly humGain: GainNodeLike;
  private readonly whineGain: GainNodeLike;
  private readonly whineOsc: OscLike;
  private readonly flickerGain: GainNodeLike;
  private target = { hum: -1, whine: -1, flicker: -1, whineHz: -1, duck: 1 };

  constructor(private readonly ctx: AudioContextLike, muted: boolean, volume: number) {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.knee.value = 0;
    comp.ratio.value = 12;
    comp.attack.value = 0.003;
    comp.release.value = 0.1;
    this.master = ctx.createGain();
    this.master.gain.value = muted ? 0 : volume;
    this.master.connect(comp);
    comp.connect(ctx.destination);
    this.noise = makeNoiseBuffer(ctx, NOISE_SECONDS, NOISE_SEED);

    this.duck = ctx.createGain();
    this.duck.gain.value = 1;
    this.duck.connect(this.master);

    // Hum: sine 50 + triangle 100 through a lowpass.
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 300;
    this.humGain = ctx.createGain();
    this.humGain.gain.value = 0;
    lp.connect(this.humGain);
    this.humGain.connect(this.duck);
    for (const [wave, f] of [["sine", 50], ["triangle", 100]] as const) {
      const o = ctx.createOscillator();
      o.type = wave;
      o.frequency.value = f;
      o.connect(lp);
      o.start();
    }

    // Charge whine.
    this.whineOsc = ctx.createOscillator();
    this.whineOsc.type = "sine";
    this.whineOsc.frequency.value = 600;
    this.whineGain = ctx.createGain();
    this.whineGain.gain.value = 0;
    this.whineOsc.connect(this.whineGain);
    this.whineGain.connect(this.duck);
    this.whineOsc.start();

    // Flicker: sawtooth 100 -> bandpass 1.2 kHz -> tremolo (LFO 11 Hz, depth 0.6) -> envelope.
    const saw = ctx.createOscillator();
    saw.type = "sawtooth";
    saw.frequency.value = 100;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1200;
    bp.Q.value = 3;
    const trem = ctx.createGain();
    trem.gain.value = 1 - 0.6 / 2;
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 11;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.6 / 2;
    lfo.connect(lfoDepth);
    lfoDepth.connect(trem.gain);
    this.flickerGain = ctx.createGain();
    this.flickerGain.gain.value = 0;
    saw.connect(bp);
    bp.connect(trem);
    trem.connect(this.flickerGain);
    this.flickerGain.connect(this.master);
    saw.start();
    lfo.start();
  }

  setMaster(muted: boolean, volume: number): void {
    ramp(this.master.gain, muted ? 0 : volume, this.ctx.currentTime, MUTE_RAMP);
  }

  /** Play a cue `base` seconds (absolute context time) plus its own offsets. */
  play(cue: Cue, base: number): void {
    const t0 = base + cue.at;
    if (cue.stop) this.stopHeld(cue.stop.key, cue.stop.fade, cue.stop.freqTo, t0);
    if (cue.hold) this.startHeld(cue.hold.key, cue.hold.voice, t0);
    for (const v of cue.voices) this.voice(v, t0 + v.at);
  }

  /** Schedule crackle ticks at absolute times. */
  crackle(times: readonly number[]): void {
    const v = crackleTick()[0];
    if (!v) return;
    for (const t of times) this.voice({ ...v, gainDb: CRACKLE_DB }, t);
  }

  setLayers(l: Layers, duckDb: number): void {
    const now = this.ctx.currentTime;
    const t = this.target;
    const set = (p: ParamLike, to: number, key: "hum" | "whine", seconds: number) => {
      if (Math.abs(t[key] - to) > 1e-6) {
        t[key] = to;
        ramp(p, to, now, seconds);
      }
    };
    set(this.humGain.gain, l.hum, "hum", LAYER_RAMP);
    set(this.whineGain.gain, l.whine, "whine", LAYER_RAMP);
    if (Math.abs(t.flicker - l.flicker) > 1e-6) {
      ramp(this.flickerGain.gain, l.flicker, now, l.flicker > t.flicker ? FLICKER_ATTACK : FLICKER_RELEASE);
      t.flicker = l.flicker;
    }
    if (l.whineOn && Math.abs(t.whineHz - l.whineHz) > 0.5) {
      t.whineHz = l.whineHz;
      ramp(this.whineOsc.frequency, l.whineHz, now, LAYER_RAMP);
    }
    const duck = dbToGain(duckDb);
    if (Math.abs(t.duck - duck) > 1e-6) {
      this.duck.gain.cancelScheduledValues(now);
      this.duck.gain.setTargetAtTime(duck, now, (duck < t.duck ? DUCK_ATTACK : DUCK_RELEASE) / 3);
      t.duck = duck;
    }
  }

  /** Silence this map's sounds: stop every voice and zero the continuous layers. */
  stopAll(): void {
    const now = this.ctx.currentTime;
    for (const h of [...this.active]) this.kill(h, now);
    this.held.clear();
    this.setLayers(
      { hum: 0, flicker: 0, whineOn: false, whineHz: 600, whine: 0, crackleOn: false, fullTick: false, next: { full: new Set(), seen: false } },
      0,
    );
  }

  private kill(h: Handle, now: number): void {
    try {
      h.gain.gain.cancelScheduledValues(now);
      h.gain.gain.setTargetAtTime(0, now, 0.004);
      for (const s of h.sources) s.stop(now + 0.03);
    } catch {
      /* already stopped */
    }
  }

  private build(v: Voice, t: number): { h: Handle; src: SourceLike; osc: OscLike | null } {
    const ctx = this.ctx;
    const nodes: NodeLike[] = [];
    let osc: OscLike | null = null;
    let src: SourceLike;
    if (v.kind === "noise") {
      const b = ctx.createBufferSource();
      b.buffer = this.noise;
      b.loop = true;
      src = b;
    } else {
      osc = ctx.createOscillator();
      osc.type = v.wave ?? "sine";
      osc.frequency.setValueAtTime(Math.max(MIN_HZ, v.freq), t);
      if (v.freqTo !== undefined) {
        const end = t + (v.glideTime ?? v.duration);
        if (v.glide === "linear") osc.frequency.linearRampToValueAtTime(v.freqTo, end);
        else osc.frequency.exponentialRampToValueAtTime(Math.max(MIN_HZ, v.freqTo), end);
      }
      src = osc;
    }
    nodes.push(src);
    let tail: NodeLike = src;
    if (v.filter) {
      const f: BiquadLike = ctx.createBiquadFilter();
      f.type = v.filter.type;
      f.Q.value = v.filter.q;
      f.frequency.setValueAtTime(Math.max(MIN_HZ, v.filter.freq), t);
      if (v.filter.freqTo !== undefined) {
        f.frequency.exponentialRampToValueAtTime(Math.max(MIN_HZ, v.filter.freqTo), t + (v.filter.glideTime ?? v.duration));
      }
      tail.connect(f);
      nodes.push(f);
      tail = f;
    }
    const sources: SourceLike[] = [src];
    if (v.lfo) {
      const trem = ctx.createGain();
      trem.gain.value = 1 - v.lfo.depth / 2;
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = v.lfo.freq;
      const depth = ctx.createGain();
      depth.gain.value = v.lfo.depth / 2;
      lfo.connect(depth);
      depth.connect(trem.gain);
      lfo.start(t);
      tail.connect(trem);
      nodes.push(trem, depth, lfo);
      sources.push(lfo);
      tail = trem;
    }
    const gain = ctx.createGain();
    tail.connect(gain);
    gain.connect(this.master);
    nodes.push(gain);
    return { h: { nodes, sources, gain }, src, osc };
  }

  private voice(v: Voice, t: number): void {
    const { h, src } = this.build(v, t);
    const pts = envelope(v);
    const g = h.gain.gain;
    const first = pts[0];
    if (first) g.setValueAtTime(first[1], t);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      if (p) g.linearRampToValueAtTime(p[1], t + p[0]);
    }
    const stopAt = t + v.duration + 0.05;
    src.start(t, v.kind === "noise" ? noiseOffset(v.at) : undefined);
    for (const s of h.sources) if (s !== src) s.stop(stopAt);
    src.stop(stopAt);
    this.active.add(h);
    src.onended = () => {
      this.active.delete(h);
      for (const n of h.nodes) {
        try {
          n.disconnect();
        } catch {
          /* already gone */
        }
      }
    };
  }

  private startHeld(key: string, v: Voice, t: number): void {
    this.stopHeld(key, 0.02, undefined, t);
    const { h, src, osc } = this.build(v, t);
    const g = h.gain.gain;
    g.setValueAtTime(0, t);
    g.linearRampToValueAtTime(dbToGain(v.gainDb), t + v.attack);
    src.start(t);
    this.active.add(h);
    if (osc) this.held.set(key, { h, osc });
    src.onended = () => {
      this.active.delete(h);
      for (const n of h.nodes) {
        try {
          n.disconnect();
        } catch {
          /* already gone */
        }
      }
    };
  }

  private stopHeld(key: string, fade: number, freqTo: number | undefined, t: number): void {
    const e = this.held.get(key);
    if (!e) return;
    this.held.delete(key);
    const now = Math.max(t, this.ctx.currentTime);
    e.h.gain.gain.cancelScheduledValues(now);
    e.h.gain.gain.setValueAtTime(e.h.gain.gain.value, now);
    e.h.gain.gain.linearRampToValueAtTime(0, now + fade);
    if (freqTo !== undefined) {
      e.osc.frequency.cancelScheduledValues(now);
      e.osc.frequency.setValueAtTime(e.osc.frequency.value, now);
      e.osc.frequency.linearRampToValueAtTime(freqTo, now + fade);
    }
    for (const s of e.h.sources) s.stop(now + fade + 0.02);
  }
}
