/** Pure: one function per sound, returning Voice[]. Every number the ear depends on lives here, named. */
import { BLOW_TIMING } from "../core";
import { mulberry32 } from "./noise";
import type { Voice } from "./types";

export const dbToGain = (db: number): number => Math.pow(10, db / 20);

/** No single cue peaks above this (dBFS, before the master). */
export const CUE_CEILING_DB = -8;

// Continuous layers
export const HUM_DB = -30;
export const FLICKER_DB = -26;
export const WHINE_DB = -34;
export const WHINE_LOW_HZ = 600;
export const WHINE_HIGH_HZ = 1400;
export const CRACKLE_DB = -24;
export const LAYER_RAMP = 0.08;
export const FLICKER_ATTACK = 0.04;
export const FLICKER_RELEASE = 0.15;

// Glow envelope: matches the renderer's LINE_GLOW_RISE / LINE_GLOW_FALL
export const GLOW_RISE = 0.06;
export const GLOW_FALL = 0.1;

// Spark burst
export const SPARK_BASE_DB = -16;
export const SPARK_END_DB = -28;
export const SPARK_BOOST_PER_LAMP_DB = 1;
export const SPARK_BOOST_CAP_DB = 6;
export const SPARK_TICK_SECONDS = 0.008;

const voice = (o: Partial<Voice> & Pick<Voice, "kind" | "gainDb" | "duration">): Voice => ({
  freq: 0,
  attack: 0.002,
  decay: 0,
  sustain: 1,
  release: 0.01,
  at: 0,
  ...o,
});
const osc = (wave: OscillatorType, freq: number, o: Partial<Voice> & Pick<Voice, "gainDb" | "duration">): Voice =>
  voice({ kind: "osc", wave, freq, ...o });
const noise = (o: Partial<Voice> & Pick<Voice, "gainDb" | "duration">): Voice => voice({ kind: "noise", ...o });

/** [time, gain] points of a voice's envelope, relative to its start; linear ramps between them. Pure. */
export function envelope(v: Voice): Array<[number, number]> {
  const peak = dbToGain(v.gainDb);
  const end = Math.max(v.duration, 0.002);
  const a = Math.min(v.attack, end);
  const relStart = Math.max(a, end - v.release);
  const pts: Array<[number, number]> = [[0, 0], [a, peak]];
  if (v.gainDbTo !== undefined) {
    pts.push([relStart, dbToGain(v.gainDbTo)]);
  } else if (v.decay > 0 && v.sustain < 1) {
    const dEnd = Math.min(a + v.decay, relStart);
    pts.push([dEnd, peak * v.sustain], [relStart, peak * v.sustain]);
  } else {
    pts.push([relStart, peak]);
  }
  pts.push([end, 0]);
  return pts;
}

export function breakerThrow(closed: boolean): Voice[] {
  return [
    noise({ filter: { type: "lowpass", freq: 400, q: 1 }, attack: 0.002, release: 0.035, duration: 0.04, gainDb: -14 }),
    osc("sine", closed ? 110 : 90, {
      freqTo: 50, glide: "exp", glideTime: 0.06, attack: 0.002, release: 0.12, duration: 0.17, gainDb: -12,
    }),
  ];
}

export function switchThrow(spring: boolean): Voice[] {
  const q = spring ? 6 : 0;
  return [
    noise({ filter: { type: "highpass", freq: 2000, q: 0.7 }, attack: 0.001, release: 0.01, duration: 0.015, gainDb: -16 - q }),
    osc("square", spring ? 800 : 1200, { attack: 0.001, release: 0.012, duration: 0.02, gainDb: -20 - q }),
  ];
}

export function repairSound(part: "bulb" | "fuse" | "wire"): Voice[] {
  if (part === "bulb") {
    return [
      osc("sine", 2400, { attack: 0.002, release: 0.02, duration: 0.03, gainDb: -20 }),
      osc("triangle", 220, {
        at: 0.03, filter: { type: "lowpass", freq: 600, q: 0.7 }, attack: 0.2, release: 0.3, duration: 0.55, gainDb: -24,
      }),
    ];
  }
  if (part === "fuse") {
    return [
      osc("square", 600, { attack: 0.001, release: 0.015, duration: 0.025, gainDb: -16 }),
      noise({ filter: { type: "bandpass", freq: 3000, q: 4 }, attack: 0.001, release: 0.03, duration: 0.04, gainDb: -18 }),
    ];
  }
  const scrape = (at: number): Voice =>
    noise({ at, filter: { type: "bandpass", freq: 1500, q: 2 }, attack: 0.01, release: 0.04, duration: 0.06, gainDb: -20 });
  return [scrape(0), scrape(0.09)];
}

export function brownoutSag(): Voice[] {
  return [
    osc("sine", 160, {
      freqTo: 70, glide: "exp", glideTime: 0.35, filter: { type: "lowpass", freq: 500, q: 0.7 },
      attack: 0.01, release: 0.2, duration: 0.55, gainDb: -20,
    }),
  ];
}

export function brownoutRecovery(): Voice[] {
  return [osc("triangle", 120, { freqTo: 240, glide: "linear", glideTime: 0.15, attack: 0.01, release: 0.12, duration: 0.27, gainDb: -22 })];
}

export function batteryRelease(): Voice[] {
  return [
    osc("triangle", 200, { freqTo: 600, glide: "linear", glideTime: 0.25, attack: 0.01, release: 0.15, duration: 0.4, gainDb: -18 }),
    noise({ filter: { type: "lowpass", freq: 2000, q: 0.7 }, attack: 0.02, release: 0.15, duration: 0.2, gainDb: -26 }),
  ];
}

export const BATTERY_WHINE_HZ = 1800;
/** The faint whine while a battery is released. Held: its duration is unused. */
export function batteryWhine(): Voice {
  return osc("sine", BATTERY_WHINE_HZ, { attack: 0.05, release: 0.05, duration: 1, gainDb: -36, lfo: { freq: 4, depth: 0.3 } });
}
export const BATTERY_STOP_FADE = 0.02;
export const BATTERY_RUNOUT_FADE = 0.4;
export const BATTERY_RUNOUT_HZ = 900;

export function batteryCutOff(): Voice[] {
  return [osc("square", 400, { freqTo: 200, glide: "linear", glideTime: 0.06, attack: 0.002, release: 0.03, duration: 0.06, gainDb: -20 })];
}

/** One quiet dry tick; no tonal blip. */
export function playClick(): Voice[] {
  return [noise({ filter: { type: "highpass", freq: 3000, q: 0.7 }, attack: 0.001, release: 0.006, duration: 0.01, gainDb: -24 })];
}

export function fullTick(): Voice[] {
  return [osc("sine", 1600, { attack: 0.002, release: 0.02, duration: 0.025, gainDb: -24 })];
}

export function crackleTick(): Voice[] {
  return [noise({ filter: { type: "highpass", freq: 3000, q: 0.7 }, attack: 0.001, release: 0.004, duration: 0.006, gainDb: CRACKLE_DB })];
}

// ---- the blow ----

export function runSound(): Voice[] {
  return [
    noise({
      filter: { type: "bandpass", freq: 300, freqTo: 2500, glideTime: BLOW_TIMING.run, q: 2 },
      attack: 0.02, release: 0.02, duration: BLOW_TIMING.run, gainDb: -30, gainDbTo: -18,
    }),
  ];
}

export function glowSound(): Voice[] {
  const saw = (f: number): Voice =>
    osc("sawtooth", f, {
      filter: { type: "lowpass", freq: 800, q: 0.7 }, attack: GLOW_RISE, release: GLOW_FALL, duration: BLOW_TIMING.glow, gainDb: -22,
    });
  return [saw(100), saw(200)];
}

/** +1 dB per lamp after the first, capped at +6 dB. */
export function sparkBoostDb(lamps: number): number {
  const n = Number.isFinite(lamps) ? Math.max(1, Math.floor(lamps)) : 1;
  return Math.min(SPARK_BOOST_CAP_DB, (n - 1) * SPARK_BOOST_PER_LAMP_DB);
}

/** One burst for any number of lamps: 6 + min(lamps, 8) ticks over `spark` seconds, deterministic. */
export function sparkBurst(lamps: number): Voice[] {
  const n = Math.max(1, Math.floor(Number.isFinite(lamps) ? lamps : 1));
  const count = 6 + Math.min(n, 8);
  const boost = sparkBoostDb(n);
  const span = BLOW_TIMING.spark - SPARK_TICK_SECONDS;
  const out: Voice[] = [];
  for (let i = 0; i < count; i++) {
    const rnd = mulberry32(i * 7919 + 13)();
    const slot = span / count;
    const at = Math.min(span, i * slot + rnd * slot * 0.8);
    const f = count > 1 ? i / (count - 1) : 0;
    out.push(
      noise({
        at,
        filter: { type: "highpass", freq: 4000, q: 0.7 },
        attack: 0.001, release: 0.005, duration: SPARK_TICK_SECONDS,
        gainDb: SPARK_BASE_DB + (SPARK_END_DB - SPARK_BASE_DB) * f + boost,
      }),
    );
  }
  return out;
}

export function popSound(): Voice[] {
  return [
    osc("sine", 180, { freqTo: 40, glide: "exp", glideTime: 0.08, attack: 0.002, release: 0.15, duration: 0.25, gainDb: -8 }),
    noise({ filter: { type: "lowpass", freq: 1000, q: 0.7 }, attack: 0.002, release: 0.04, duration: 0.06, gainDb: -10 }),
  ];
}

// ---- the Relight ----

export const CHIME_HZ = [330, 392, 440, 523, 659] as const;
export const CHIME_MERGE = 0.06;
export const RELIGHT_TAIL = 1.5;

export function relightBed(lastChime: number, openSeconds: number): Voice[] {
  const f = { type: "lowpass" as const, freq: 200, freqTo: 2000, glideTime: Math.max(0.01, openSeconds), q: 0.7 };
  const dur = lastChime + RELIGHT_TAIL;
  return [
    osc("triangle", 55, { filter: f, attack: 0.3, release: RELIGHT_TAIL, duration: dur, gainDb: -24 }),
    osc("sine", 110, { filter: f, attack: 0.3, release: RELIGHT_TAIL, duration: dur, gainDb: -24 }),
  ];
}

export function relightChime(index: number): Voice[] {
  const hz = CHIME_HZ[index % CHIME_HZ.length] ?? CHIME_HZ[0];
  return [osc("sine", hz, { attack: 0.04, release: 0.6, duration: 0.7, gainDb: -22 })];
}

export function relightClose(): Voice[] {
  const v = (f: number): Voice => osc("sine", f, { attack: 0.3, release: 2, duration: 2.4, gainDb: -28 });
  return [v(220), v(330)];
}

// ---- the level-done cue (ticket 025): a soft latch knock, then a warm two-note figure in A major ----

export const LEVEL_KNOCK_HZ = 900;
export const LEVEL_KNOCK_DB = -20;
export const LEVEL_KNOCK_SECONDS = 0.04;
/** C#4 then A4: the third and the root of A, sitting over the Relight's closing 220 + 330 Hz fifth. */
export const LEVEL_NOTE1_HZ = 277.18;
export const LEVEL_NOTE2_HZ = 440;
export const LEVEL_NOTE1_AT = 0.06;
export const LEVEL_NOTE2_AT = 0.16;
export const LEVEL_NOTE_LOWPASS_HZ = 1500;
export const LEVEL_NOTE_DB = -20;
export const LEVEL_NOTE_ATTACK = 0.015;
export const LEVEL_NOTE_RELEASE = 0.6;
export const LEVEL_NOTE_SECONDS = 0.75;
/** A2 under the second note. */
export const LEVEL_UNDER_HZ = 110;
export const LEVEL_UNDER_DB = -26;
export const LEVEL_UNDER_ATTACK = 0.03;
export const LEVEL_UNDER_RELEASE = 0.5;
export const LEVEL_UNDER_SECONDS = 0.7;

export function levelDoneSound(): Voice[] {
  const note = (hz: number, at: number): Voice =>
    osc("triangle", hz, {
      filter: { type: "lowpass", freq: LEVEL_NOTE_LOWPASS_HZ, q: 0.7 },
      attack: LEVEL_NOTE_ATTACK,
      release: LEVEL_NOTE_RELEASE,
      duration: LEVEL_NOTE_SECONDS,
      gainDb: LEVEL_NOTE_DB,
      at,
    });
  return [
    noise({
      filter: { type: "lowpass", freq: LEVEL_KNOCK_HZ, q: 0.7 },
      attack: 0.002,
      release: 0.03,
      duration: LEVEL_KNOCK_SECONDS,
      gainDb: LEVEL_KNOCK_DB,
    }),
    note(LEVEL_NOTE1_HZ, LEVEL_NOTE1_AT),
    note(LEVEL_NOTE2_HZ, LEVEL_NOTE2_AT),
    osc("sine", LEVEL_UNDER_HZ, {
      attack: LEVEL_UNDER_ATTACK,
      release: LEVEL_UNDER_RELEASE,
      duration: LEVEL_UNDER_SECONDS,
      gainDb: LEVEL_UNDER_DB,
      at: LEVEL_NOTE2_AT,
    }),
  ];
}
