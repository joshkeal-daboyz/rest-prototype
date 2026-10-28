import type { BufferLike } from "./types";

/** Seeded PRNG (mulberry32): the audio never uses the platform random. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A mono white-noise buffer, same samples for the same seed. */
export function makeNoiseBuffer(
  ctx: { sampleRate: number; createBuffer(channels: number, length: number, rate: number): BufferLike },
  seconds: number,
  seed: number,
): BufferLike {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buf.getChannelData(0);
  const rnd = mulberry32(seed);
  for (let i = 0; i < data.length; i++) data[i] = rnd() * 2 - 1;
  return buf;
}

/** Where in the 2 s noise buffer a voice starts, derived from its `at` (no randomness). */
export function noiseOffset(at: number, bufferSeconds = 2): number {
  const o = (Math.abs(at) * 7.31 + 0.13) % (bufferSeconds * 0.75);
  return Number.isFinite(o) ? o : 0;
}
