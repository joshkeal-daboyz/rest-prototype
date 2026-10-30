/** The stand-ins the harness plays against: a bus that records, a renderer that does nothing, a canvas that draws nowhere. */
import { EventBus } from "../../src/core";
import type { EventName, Events } from "../../src/core";
import type { MapRenderer } from "../../src/render";

export interface Recorded {
  name: EventName;
  payload: unknown;
}

/** An EventBus that keeps every emit (name and payload, in order) and then delivers it as usual. */
export class RecordingBus extends EventBus {
  readonly events: Recorded[] = [];

  override emit<K extends EventName>(name: K, payload: Events[K]): void {
    this.events.push({ name, payload });
    super.emit(name, payload);
  }
}

/** A MapRenderer whose every method is a no-op and whose hitTest finds nothing. The harness clicks by id, never by pixel. */
export function fakeRenderer(): MapRenderer {
  return {
    draw() {},
    hitTest() {
      return null;
    },
    resize() {},
    setInsets() {},
    notify() {},
  };
}

export interface FakeCanvas {
  canvas: HTMLCanvasElement;
  /** How many numeric arguments (or assigned numeric properties) that were not finite the drawing has passed so far. */
  nonFinite(): number;
  /** Method calls seen, by name; the smoke uses it to know a frame drew something. */
  calls(): number;
}

const GRADIENT_FACTORIES = new Set(["createLinearGradient", "createRadialGradient", "createConicGradient", "createPattern"]);

/**
 * A 1280 x 720 canvas whose 2D context is a Proxy: every method is a no-op, gradient and pattern factories return an object
 * with addColorStop, measureText returns a width of 7 per character, and the Proxy counts non-finite numeric arguments.
 */
export function fakeCanvas(width = 1280, height = 720): FakeCanvas {
  let bad = 0;
  let calls = 0;
  const seen = (v: unknown): void => {
    if (typeof v === "number" && !Number.isFinite(v)) bad++;
  };
  const values = new Map<string | symbol, unknown>();
  const gradient = { addColorStop: (_o: number, _c: string): void => void seen(_o) };
  const ctx = new Proxy(
    {},
    {
      get(_t, prop) {
        if (values.has(prop)) return values.get(prop);
        if (prop === "canvas") return canvas;
        if (prop === "measureText") return (text: string) => ({ width: 7 * String(text).length });
        if (prop === "getLineDash") return () => [];
        if (typeof prop === "string" && GRADIENT_FACTORIES.has(prop))
          return (...args: unknown[]) => {
            calls++;
            args.forEach(seen);
            return gradient;
          };
        return (...args: unknown[]) => {
          calls++;
          args.forEach(seen);
        };
      },
      set(_t, prop, value) {
        seen(value);
        values.set(prop, value);
        return true;
      },
    },
  );
  const canvas = {
    clientWidth: width,
    clientHeight: height,
    width,
    height,
    getContext: (kind: string) => (kind === "2d" ? ctx : null),
    getBoundingClientRect: () => ({ left: 0, top: 0, right: width, bottom: height, width, height, x: 0, y: 0 }),
    addEventListener() {},
    removeEventListener() {},
  } as unknown as HTMLCanvasElement;
  return { canvas, nonFinite: () => bad, calls: () => calls };
}
