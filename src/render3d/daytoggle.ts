/**
 * The tile view's day and night switch (ticket 060, section B; dev only): the L key and a small "Day / Night" button each flip the light mode. The tile view makes it behind
 * `import.meta.env.DEV`, so a production build holds neither the listener nor the button. It reads no address and imports nothing from three: the host (the page's window and a
 * button maker) is passed in, so a test drives it with fakes. Neither the key nor the button is `src/play`'s or `src/ui`'s: they belong to this dev view and are removed with it.
 */

import type { LightModeId } from "./lighting";

/** The button's label. */
export const DAY_TOGGLE_LABEL = "Day / Night";

/** What a keydown listener reads. */
export interface KeyEventLike {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  repeat?: boolean;
  /** Where the key was pressed: a text field keeps its own keys. */
  target?: unknown;
}

export interface KeyTarget {
  addEventListener(type: "keydown", listener: (e: KeyEventLike) => void): void;
  removeEventListener(type: "keydown", listener: (e: KeyEventLike) => void): void;
}

/** The button the host makes: clicked, labelled, and taken out of the page. */
export interface ButtonLike {
  onClick(listener: () => void): void;
  setState(mode: LightModeId): void;
  remove(): void;
}

export interface DayToggleHost {
  keys: KeyTarget | null;
  /** Makes the button and puts it in the page, or null when there is no page. */
  makeButton: (() => ButtonLike) | null;
}

export interface DayToggle {
  /** Show the mode the view is in now (the button's state). */
  sync(mode: LightModeId): void;
  /** Take the key listener and the button away. */
  dispose(): void;
}

/** Is the key press one that flips the mode: a bare L, held down or not, from a place that is not a text field? */
export function isFlipKey(e: KeyEventLike): boolean {
  if (e.key !== "l" && e.key !== "L") return false;
  if (e.ctrlKey === true || e.metaKey === true || e.altKey === true || e.repeat === true) return false;
  const tag = (e.target as { tagName?: unknown } | null | undefined)?.tagName;
  return !(typeof tag === "string" && /^(INPUT|TEXTAREA|SELECT)$/i.test(tag));
}

/** The toggle over a host: `flip` is called for each press of the key or the button. */
export function createDayToggle(host: DayToggleHost, mode: LightModeId, flip: () => void): DayToggle {
  const onKey = (e: KeyEventLike): void => {
    if (isFlipKey(e)) flip();
  };
  host.keys?.addEventListener("keydown", onKey);
  const button = host.makeButton ? host.makeButton() : null;
  button?.onClick(flip);
  button?.setState(mode);
  return {
    sync: (m) => button?.setState(m),
    dispose() {
      host.keys?.removeEventListener("keydown", onKey);
      button?.remove();
    },
  };
}

/** The page's own host: the window's keys and a small button fixed to the bottom-left corner. Without a window or a document it holds neither. */
export function pageDayToggleHost(): DayToggleHost {
  const keys = typeof window !== "undefined" ? (window as unknown as KeyTarget) : null;
  if (typeof document === "undefined") return { keys, makeButton: null };
  return {
    keys,
    makeButton() {
      const el = document.createElement("button");
      el.type = "button";
      el.textContent = DAY_TOGGLE_LABEL;
      el.setAttribute("data-day-toggle", "");
      el.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:20;padding:4px 8px;font:12px sans-serif;opacity:0.85;cursor:pointer";
      document.body.appendChild(el);
      return {
        onClick: (fn) => el.addEventListener("click", fn),
        setState(m) {
          el.title = `Light: ${m} (click, or press L, for ${m === "day" ? "night" : "day"})`;
          el.setAttribute("aria-pressed", m === "day" ? "true" : "false");
        },
        remove: () => el.remove(),
      };
    },
  };
}
