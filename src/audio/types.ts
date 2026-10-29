/** Plain data the pure core hands the Web Audio shell, and the slice of AudioContext the shell uses. */

export interface VoiceFilter {
  type: BiquadFilterType;
  freq: number;
  freqTo?: number;
  /** Seconds the filter takes to reach `freqTo`; defaults to the voice's duration. */
  glideTime?: number;
  q: number;
}

/** One oscillator or noise source through an optional filter and an envelope. Times are seconds. */
export interface Voice {
  kind: "osc" | "noise";
  wave?: OscillatorType;
  freq: number;
  freqTo?: number;
  glide?: "linear" | "exp";
  /** Seconds the pitch glide takes; defaults to `duration`. */
  glideTime?: number;
  filter?: VoiceFilter;
  attack: number;
  decay: number;
  /** 0..1 of the peak, held after the decay. */
  sustain: number;
  /** The last `release` seconds of `duration` fade to silence. */
  release: number;
  /** Peak level in dBFS before the master. */
  gainDb: number;
  /** When set, the held level glides from `gainDb` to this by the start of the release. */
  gainDbTo?: number;
  /** Seconds after the cue start. */
  at: number;
  /** Total length from `at`, release included. */
  duration: number;
  /** Tremolo: amplitude wobble. */
  lfo?: { freq: number; depth: number };
}

export type CuePart = "run" | "glow" | "spark" | "pop";

/** A named sound: voices to start at `at` seconds from now. */
export interface Cue {
  name: string;
  at: number;
  voices: Voice[];
  /** Drops the hum and the charge whine while it sounds. */
  ducks?: boolean;
  /** Blow, Relight and level cues are never dropped for budget or merged away by the rate limit. */
  group?: "blow" | "relight" | "level";
  part?: CuePart;
  /** Spark cue only: how many lamps the burst stands for. */
  lamps?: number;
  /** Start a voice that holds until a `stop` with the same key. */
  hold?: { key: string; voice: Voice };
  /** End the held voice with this key: fade to silence over `fade` seconds, optionally sagging in pitch. */
  stop?: { key: string; fade: number; freqTo?: number };
}

export interface ParamLike {
  value: number;
  setValueAtTime(v: number, t: number): unknown;
  linearRampToValueAtTime(v: number, t: number): unknown;
  exponentialRampToValueAtTime(v: number, t: number): unknown;
  setTargetAtTime(v: number, t: number, timeConstant: number): unknown;
  cancelScheduledValues(t: number): unknown;
}
export interface NodeLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connect(dest: any): any;
  disconnect(): void;
}
export interface GainNodeLike extends NodeLike {
  gain: ParamLike;
}
export interface SourceLike extends NodeLike {
  start(when?: number, offset?: number): void;
  stop(when?: number): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onended: any;
}
export interface OscLike extends SourceLike {
  type: OscillatorType;
  frequency: ParamLike;
}
export interface BufferSourceLike extends SourceLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buffer: any;
  loop: boolean;
}
export interface BiquadLike extends NodeLike {
  type: BiquadFilterType;
  frequency: ParamLike;
  Q: ParamLike;
}
export interface CompressorLike extends NodeLike {
  threshold: ParamLike;
  knee: ParamLike;
  ratio: ParamLike;
  attack: ParamLike;
  release: ParamLike;
}
export interface BufferLike {
  getChannelData(channel: number): Float32Array;
}
/** Only what the shell calls on an AudioContext. */
export interface AudioContextLike {
  readonly currentTime: number;
  readonly sampleRate: number;
  readonly state: string;
  resume(): Promise<void>;
  readonly destination: NodeLike;
  createOscillator(): OscLike;
  createGain(): GainNodeLike;
  createBiquadFilter(): BiquadLike;
  createBufferSource(): BufferSourceLike;
  createBuffer(channels: number, length: number, sampleRate: number): BufferLike;
  createDynamicsCompressor(): CompressorLike;
}
