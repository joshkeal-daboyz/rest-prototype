/**
 * Ticket 050 B, the data half of the stack gallery (dev only, `/?puzzle=...&view=3d&gallery=city-pack&stacks=1`). Pure: no three, no DOM, no fetch, and
 * nothing from gallery.ts (which draws it). Which stacks are shown, how each is captioned, and which of its fronts are still guesses.
 *
 * Every style is assembled on each lot type it serves, at its most floors, as a mid-row stack and, for a style with corner pieces, as a corner stack at
 * each end (corner -x, corner +x), so one screenshot per stack shows: no gap between storeys, the shopfront on the street side, a corner piece turned to
 * show its second street face, a roof on top. The caption says which fronts are guesses (no line in the fronts table or Josh's saved file yet), and for a
 * corner piece which `open` side came from the recipe's guess and not from the table.
 */

import { calibrationKey, type AssetEntry, type AssetManifest, type CalibrationKey } from "../core";
import { BUILDING_FRONTS, type FrontTable } from "./models";
import { STACK_STYLES, assembleStack, stackKeys, type Stack, type StackSide, type StackStyle } from "./stacks";
import { LOT_TYPES, LOT_TYPE_NAMES, type CornerSide, type LotType } from "./town";

/** The pack every stack recipe is made of. */
export const STACK_PACK = "city-pack";

export interface StackVariant {
  /** "mid row", or "corner -x" / "corner +x": the lot side that has a corner column. */
  label: string;
  sides: readonly StackSide[];
}

/** The three shapes each style is shown in (a style with no corner piece, an office, has only the first). */
export const STACK_VARIANTS: readonly StackVariant[] = [
  { label: "mid row", sides: [] },
  { label: "corner -x", sides: ["-x"] },
  { label: "corner +x", sides: ["+x"] },
];

/** What the page asks to show: a style id and/or a lot type narrows the row (`&style=apartment-01&type=large`). */
export interface StackGalleryFilter {
  style: string | null;
  type: LotType | null;
}

export interface ShownStack {
  style: StackStyle;
  type: LotType;
  variant: StackVariant;
  stack: Stack;
}

type Entries = ReadonlyMap<CalibrationKey, AssetEntry>;

/**
 * The City Pack entries by key, from the manifest. `hasRoot` (given once the GLB is in) drops a piece whose root node the GLB lacks, so a style that
 * needs it drops out here as it will in the town. Empty when the manifest or the pack is missing.
 */
export function stackPieceEntries(manifest: AssetManifest | null, hasRoot?: (name: string) => boolean): Map<CalibrationKey, AssetEntry> {
  const pack = manifest?.packs.find((p) => p.pack === STACK_PACK);
  const out = new Map<CalibrationKey, AssetEntry>();
  for (const e of pack?.assets ?? []) if (!hasRoot || hasRoot(e.name)) out.set(calibrationKey(STACK_PACK, e.name), e);
  return out;
}

/** Every key any recipe names, once each, in recipe order: the click line's models (roofs included). */
export function recipePieceKeys(styles: readonly StackStyle[] = STACK_STYLES): CalibrationKey[] {
  return [...new Set(styles.flatMap((s) => stackKeys(s)))];
}

const cornerSides = (sides: readonly StackSide[]): CornerSide[] => sides.map((side) => ({ side, road: "x" }));

/**
 * Every stack the gallery shows, in line order: by lot type (small to tall), then recipe, then variant. A (style, type, variant) the recipe cannot make
 * from `entries` (a missing piece, no fit under the cap) is left out. Each is at its most floors, so the tallest case shows. Deterministic.
 */
export function shownStacks(entries: Entries, fronts: FrontTable = BUILDING_FRONTS, filter: StackGalleryFilter = { style: null, type: null }, styles: readonly StackStyle[] = STACK_STYLES): ShownStack[] {
  const out: ShownStack[] = [];
  for (const type of LOT_TYPE_NAMES) {
    if (filter.type !== null && filter.type !== type) continue;
    for (const style of styles) {
      if (filter.style !== null && filter.style !== style.id) continue;
      const hasCorner = style.base.corner.length > 0;
      for (const variant of STACK_VARIANTS) {
        if (variant.sides.length > 0 && !hasCorner) continue;
        const stack = assembleStack(style, { type, key: `gallery:${style.id}:${type}:${variant.label}`, cornerSides: cornerSides(variant.sides) }, entries, fronts, { floors: "max" });
        if (stack) out.push({ style, type, variant, stack });
      }
    }
  }
  return out;
}

// ---- captions ----

/** True when no table line (code or saved file) names this key: its front is the "+z" guess. */
export function frontIsGuess(fronts: FrontTable, key: CalibrationKey): boolean {
  return !Object.prototype.hasOwnProperty.call(fronts, key);
}

/** A corner piece's second street face as the assembly reads it (the table's, else the recipe's, else "+x"), and whether it is still the recipe's guess. */
export function openOf(style: StackStyle, fronts: FrontTable, key: CalibrationKey): { side: StackSide; guess: boolean } {
  const bf = Object.prototype.hasOwnProperty.call(fronts, key) ? fronts[key] : undefined;
  if (bf?.open) return { side: bf.open, guess: false };
  return { side: style.open?.[key] ?? "+x", guess: true };
}

const isCornerKey = (style: StackStyle, key: CalibrationKey): boolean => style.base.corner.includes(key) || style.floor.corner.includes(key) || style.roof.corner.includes(key);

/** `SM_Bld_Shop_05` as `Shop_05`: the pack's prefix says nothing on a caption. */
export function shortName(key: CalibrationKey): string {
  const name = key.slice(key.indexOf(":") + 1);
  return name.replace(/^SM_Bld_/, "");
}

/** `text` cut into lines of at most `max` characters at spaces (a word longer than `max` is cut). */
export function wrapText(text: string, max: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (let word of text.split(" ")) {
    while (word.length > max) {
      if (cur) lines.push(cur);
      cur = "";
      lines.push(word.slice(0, max));
      word = word.slice(max);
    }
    if (cur && cur.length + 1 + word.length > max) {
      lines.push(cur);
      cur = word;
    } else cur = cur ? `${cur} ${word}` : word;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** A caption line is at most this many characters; a longer one wraps at a space. */
export const STACK_CAPTION_WRAP = 28;

const m1 = (v: number): string => (v >= 10 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));

/**
 * One piece's caption text: `Shop_05: +z guess` (its front, and `guess` when no table line names it), and for a corner piece `, open +x guess`
 * (the second street face, `guess` when it is the recipe's and not the table's).
 */
export function pieceCaption(style: StackStyle, fronts: FrontTable, key: CalibrationKey): string {
  const bf = Object.prototype.hasOwnProperty.call(fronts, key) ? fronts[key] : undefined;
  let text = `${shortName(key)}: ${bf?.front ?? "+z"}${frontIsGuess(fronts, key) ? " guess" : ""}`;
  if (isCornerKey(style, key)) {
    const o = openOf(style, fronts, key);
    text += `, open ${o.side}${o.guess ? " guess" : ""}`;
  }
  return text;
}

/**
 * A stack's caption: its style, lot type and shape, floors, height against the lot's cap, how it is placed in z, and every distinct piece key it uses
 * (in the order they appear: ground row, then floors, then roofs) with its front, `guess` wherever neither the code's table nor the saved file has it.
 */
export function stackCaption(s: ShownStack, fronts: FrontTable = BUILDING_FRONTS): string[] {
  const { style, type, variant, stack } = s;
  const spec = LOT_TYPES[type];
  const lines = [
    style.id,
    `${type}: ${variant.label}`,
    `${stack.floors} floors, ${stack.bays} bays`,
    `h ${m1(stack.height_m)} of ${spec.cap} m cap`,
    style.depth === "footprint" ? "z: centred (office)" : "z: back-aligned",
  ];
  const seen = new Set<CalibrationKey>();
  for (const p of stack.pieces) {
    if (seen.has(p.key)) continue;
    seen.add(p.key);
    lines.push(...wrapText(pieceCaption(style, fronts, p.key), STACK_CAPTION_WRAP));
  }
  return lines;
}

/** How many of the recipe pieces' fronts are still guesses, of how many: the title's summary. */
export function guessCount(keys: readonly CalibrationKey[], fronts: FrontTable): { guessed: number; total: number } {
  return { guessed: keys.filter((k) => frontIsGuess(fronts, k)).length, total: keys.length };
}

/** The lines over the row's start. `help` is the pack gallery's click line. */
export function stackGalleryTitle(shown: number, guesses: { guessed: number; total: number }, filter: StackGalleryFilter, help: string, notSaved: string | null = null): string[] {
  const only = [filter.style ? `style ${filter.style}` : null, filter.type ? `type ${filter.type}` : null].filter((x): x is string => x !== null);
  const lines = [`${STACK_PACK} stacks: ${shown} shown at their most floors${only.length > 0 ? ` (only ${only.join(", ")})` : ""}`];
  lines.push(`${guesses.guessed} of ${guesses.total} recipe pieces have no front yet (guess)`);
  if (notSaved !== null) lines.push(`not saved: ${notSaved.length <= 70 ? notSaved : `${notSaved.slice(0, 67)}...`}`);
  lines.push(
    "each style on each lot type: mid row, corner -x, corner +x (a corner stack stands only on a corner lot)",
    "guess = no line in the fronts table or your saved file; open +x guess = the corner side is the recipe's",
    "z: shops are back-aligned (deeper ones stick out toward the street); offices are centred",
    "after the stacks, End jumps to the click line of every recipe piece, roofs included",
    help,
    "drag or arrows to move, Home and End to jump",
  );
  return lines;
}

/** The lot types and styles a page may ask for, for `&style=` and `&type=`. */
export const STACK_STYLE_IDS: readonly string[] = STACK_STYLES.map((s) => s.id);
export const STACK_TYPE_IDS: readonly LotType[] = LOT_TYPE_NAMES;
