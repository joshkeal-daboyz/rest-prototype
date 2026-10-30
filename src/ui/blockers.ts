/**
 * The overlay panels that block map clicks (ticket 035 B). Each frame main.ts measures the real rects of the HUD
 * columns, the priests' list (inside .hud), the parts panel, the sound dock and its open popover, and hands them to
 * the renderer, which will not pick a node under any of them. Pure: it reads only what it is given, so it
 * can be tested with stub elements.
 */

/** Canvas CSS px, the same shape as the renderer's Rect (structural, so no import from src/render). */
export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** The elements whose whole rects block clicks. A closed popover is display:none and measures 0x0, so it drops out. */
export const BLOCKER_SELECTORS: readonly string[] = [".hud", ".inventory", ".sound-dock", ".sound-popover"];

interface Measurable {
  getBoundingClientRect(): Rect;
}

/** Anything with querySelectorAll (an HTMLElement, or a stub). Typed as ArrayLike so a NodeList fits without a copy. */
export interface BlockerRoot {
  querySelectorAll(selector: string): ArrayLike<Measurable>;
}

/**
 * Each matched element's rect, relative to the canvas and clipped to it. Zero-area rects (after clipping, so
 * rects wholly off the canvas too) are dropped. The elements' whole rects count, pointer-capturing or not.
 * It reads the canvas once and each matched element once.
 */
export function measureBlockers(root: BlockerRoot, canvas: Measurable): Rect[] {
  const frame = canvas.getBoundingClientRect();
  const width = frame.right - frame.left;
  const height = frame.bottom - frame.top;
  const out: Rect[] = [];
  for (const selector of BLOCKER_SELECTORS) {
    const items = root.querySelectorAll(selector);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) continue;
      const r = item.getBoundingClientRect();
      const left = Math.max(0, r.left - frame.left);
      const top = Math.max(0, r.top - frame.top);
      const right = Math.min(width, r.right - frame.left);
      const bottom = Math.min(height, r.bottom - frame.top);
      if (right <= left || bottom <= top) continue;
      out.push({ left, top, right, bottom });
    }
  }
  return out;
}
