import type { CityDigest } from "../../core";
import { stableHash } from "./hash";

/** Numbers are rounded to this step before they are hashed (R-4). */
const ROUND = 1e6;

function canon(v: unknown): string {
  if (v === null) return "null";
  switch (typeof v) {
    case "number": {
      if (!Number.isFinite(v)) return JSON.stringify(String(v));
      const r = Math.round(v * ROUND) / ROUND;
      return String(r === 0 ? 0 : r);
    }
    case "string":
    case "boolean":
      return JSON.stringify(v);
    case "object": {
      if (Array.isArray(v)) return `[${v.map((x) => (x === undefined ? "null" : canon(x))).join(",")}]`;
      const o = v as Record<string, unknown>;
      const keys = Object.keys(o)
        .filter((k) => o[k] !== undefined)
        .sort();
      return `{${keys.map((k) => `${JSON.stringify(k)}:${canon(o[k])}`).join(",")}}`;
    }
    default:
      return "null";
  }
}

/** The canonical JSON of a layer: keys sorted, numbers rounded to 1e-6. */
export const canonicalJson = (v: unknown): string => canon(v);

/** A layer's digest: FNV-1a over its canonical JSON, as 8 hex digits (R-4). */
export function digestOf(layer: unknown): CityDigest {
  return stableHash(canon(layer)).toString(16).padStart(8, "0");
}
