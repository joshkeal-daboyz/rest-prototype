/**
 * Pure logic for the asset gallery page (ticket 074, section C): the address that carries the page's state, and the text on each card and in the inspect panel.
 * No DOM, no three: every value arrives from the core types or from the gallery's `page()` (src/render3d/assetviewer.ts, section B). Nothing here decides what a piece is.
 */

import {
  ASSET_GALLERY_USES,
  type AssetGalleryNote,
  type AssetGalleryNoteSureness,
  type AssetGalleryPack,
  type AssetGalleryPiece,
  type AssetGalleryPieceUse,
  type AssetGalleryQuery,
} from "../core";

/** The page's whole state: the query, and the piece open in the inspect panel (its name), or null. */
export interface AssetGalleryRequest extends AssetGalleryQuery {
  piece: string | null;
}

export const USE_FILTERS: readonly AssetGalleryQuery["use"][] = ["any", ...ASSET_GALLERY_USES, "unused"];
export const FLAG_FILTERS: readonly AssetGalleryQuery["flag"][] = ["any", "untextured", "warnings"];

/** The filter menus' labels. The use labels name the pass or stage that uses the piece. */
export const USE_LABELS: Readonly<Record<AssetGalleryQuery["use"], string>> = {
  any: "Any pass",
  edge: "Edge (tile city)",
  buildings: "Buildings",
  circuit: "Circuit (poles and lines)",
  facades: "Facades",
  ground: "Ground",
  traffic: "Traffic",
  tech: "Tech pass",
  holdout: "Hold-out pass",
  ruin: "Ruin pass",
  unused: "Unused",
};

export const FLAG_LABELS: Readonly<Record<AssetGalleryQuery["flag"], string>> = {
  any: "Any flag",
  untextured: "Untextured",
  warnings: "Any warning",
};

/** A note's sureness, in words (the confidence words of `docs/design/073-pack-intended-use.md`). */
export const SURE_WORDS: Readonly<Record<AssetGalleryNoteSureness, string>> = {
  seen: "Seen clearly",
  inferred: "Inferred",
  "not-shown": "Not shown",
};

/** The first note's text on a card is cut to this many characters; the inspect panel shows it whole. */
export const NOTE_SUMMARY_MAX = 120;

// ---- the address ----

const nonEmpty = (v: string | null): string | null => (v === null || v === "" ? null : v);

function useOf(raw: string | null): AssetGalleryQuery["use"] {
  return (USE_FILTERS as readonly string[]).includes(raw ?? "") ? (raw as AssetGalleryQuery["use"]) : "any";
}

function flagOf(raw: string | null): AssetGalleryQuery["flag"] {
  return (FLAG_FILTERS as readonly string[]).includes(raw ?? "") ? (raw as AssetGalleryQuery["flag"]) : "any";
}

function pageOf(raw: string | null): number {
  const n = Number(raw);
  return raw !== null && Number.isInteger(n) && n >= 1 ? n : 1;
}

/**
 * Reads the page's address. Null unless `assets` is present (the gallery is not asked for). A bare `assets` gives pack "" (the page opens the first pack);
 * an unknown value for `use`, `flag` or `page` falls back to its default: "" / any / any / 1 / no piece.
 */
export function assetGalleryRequested(search: string): AssetGalleryRequest | null {
  const p = new URLSearchParams(search);
  const pack = p.get("assets");
  if (pack === null) return null;
  return {
    pack,
    text: p.get("q") ?? "",
    use: useOf(p.get("use")),
    flag: flagOf(p.get("flag")),
    page: pageOf(p.get("page")),
    piece: nonEmpty(p.get("piece")),
  };
}

/** The address for a page state. Defaults are left out, so the address stays short. Round-trips through `assetGalleryRequested`. */
export function assetGalleryUrl(q: AssetGalleryQuery, piece: string | null): string {
  const p = new URLSearchParams();
  p.set("assets", q.pack);
  if (q.text !== "") p.set("q", q.text);
  if (q.use !== "any") p.set("use", q.use);
  if (q.flag !== "any") p.set("flag", q.flag);
  if (q.page !== 1) p.set("page", String(q.page));
  if (nonEmpty(piece) !== null) p.set("piece", piece as string);
  return `?${p.toString()}`;
}

// ---- the card and the inspect panel ----

/** `w × h × d m`, two decimals, from the piece's metres. */
export function sizeText(size: readonly [number, number, number]): string {
  const [w, h, d] = size.map((m) => m.toFixed(2));
  return `${w} × ${h} × ${d} m`;
}

/** Digits in threes with commas: 1234567 gives "1,234,567". */
export function groupDigits(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function trianglesText(n: number): string {
  return `${groupDigits(n)} ${n === 1 ? "triangle" : "triangles"}`;
}

/** One label per flag, in a fixed order. Flags are words, never colour alone. */
export function flagLabels(piece: AssetGalleryPiece): string[] {
  const out: string[] = [];
  if (!piece.textured) out.push("untextured");
  if (piece.missingTextures.length > 0) out.push(`missing texture: ${piece.missingTextures.join(", ")}`);
  else if (piece.warnings.includes("missing-texture")) out.push("missing texture");
  if (piece.warnings.includes("scale-suspect")) out.push("scale-suspect");
  if (piece.warnings.includes("texture-guessed")) out.push("texture-guessed");
  if (piece.warnings.includes("no-uv")) out.push("no-uv");
  if (piece.neverUsed) out.push("never used");
  return out;
}

/** One label per use, with "(typed, not placed)" where the table types the piece but its stage never places it. No uses gives "unused". */
export function useLabels(uses: readonly AssetGalleryPieceUse[]): string[] {
  if (uses.length === 0) return ["unused"];
  return uses.map((u) => (u.placed ? u.use : `${u.use} (typed, not placed)`));
}

/** The text cut to `max` characters, with an ellipsis when it was cut. Never longer than `max`. */
export function cutText(text: string, max: number = NOTE_SUMMARY_MAX): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

/** A card's note line: the first note's sureness word, then its text cut to `NOTE_SUMMARY_MAX`. Null when the piece has no note. */
export function noteSummary(piece: AssetGalleryPiece): string | null {
  const first = piece.notes[0];
  if (first === undefined) return null;
  return `${SURE_WORDS[first.sure]}: ${cutText(first.text)}`;
}

/** What Copy puts on the clipboard: the key, `pack:name`. */
export function copyText(piece: AssetGalleryPiece): string {
  return piece.key;
}

/** The inspect panel's line for one note: the sureness word, the note in full, its images and its departure, if any. */
export function noteLines(note: AssetGalleryNote): { sure: string; text: string; images: string; departure: string | null } {
  return { sure: SURE_WORDS[note.sure], text: note.text, images: note.images, departure: note.departure };
}

// ---- the header ----

/** "a to b of N" for the page, or "0 pieces" when nothing matches. */
export function rangeText(page: number, pageSize: number, total: number): string {
  if (total === 0) return "0 pieces";
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return `${from} to ${to} of ${total}`;
}

/** A pack's tab: its title, piece count and failure count. */
export function packTabLabel(pack: AssetGalleryPack): string {
  return `${pack.title} · ${pack.pieceCount} pieces · ${pack.failures.length} failed`;
}

/** The failures list under a pack's header: one line per FBX the converter could not convert. */
export function failureLines(pack: AssetGalleryPack): string[] {
  return pack.failures.map((f) => `${f.source}: ${f.error}`);
}

export function storeLinkText(pack: AssetGalleryPack): string {
  return pack.storeUrl === null ? "No store page on file" : `Store page for ${pack.title}`;
}

// ---- the keys and the steps ----

/**
 * What a key does while the inspect panel is open: Esc closes; the left and right arrows step to the neighbouring piece on the page. Arrows in a text field
 * (the search box, a menu) do nothing, so typing never moves the piece.
 */
export function inspectKey(key: string, inField: boolean): "close" | "prev" | "next" | null {
  if (key === "Escape") return "close";
  if (inField) return null;
  if (key === "ArrowLeft") return "prev";
  if (key === "ArrowRight") return "next";
  return null;
}

/** The index one step from `index`, clamped to the list: a step past either end stays put. */
export function stepIndex(index: number, length: number, delta: number): number {
  const i = index + delta;
  return i < 0 || i >= length ? index : i;
}
