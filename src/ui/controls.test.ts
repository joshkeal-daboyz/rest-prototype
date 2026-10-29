import { describe, expect, it } from "vitest";
import {
  ACTION_ICON_SVG,
  CONTROL_ACTIONS,
  CONTROL_ICON_VIEWBOX,
  escapeTarget,
  SPEAKER_ICON_SVG,
  soundPopover,
  speakerIcon,
  speakerLabel,
  splashCeiling,
} from "./controls";
import { promptPosition, type Rect } from "./logic";

describe("control icons", () => {
  it("has the speaker states and the three action icons, and nothing else", () => {
    expect(Object.keys(SPEAKER_ICON_SVG).sort()).toEqual(["high", "low", "muted", "silent"]);
    expect(Object.keys(ACTION_ICON_SVG).sort()).toEqual(["log", "reset", "undo"]);
  });

  it("uses a 24 by 24 viewBox", () => {
    expect(CONTROL_ICON_VIEWBOX).toBe("0 0 24 24");
  });

  const every = (): { name: string; markup: string; amberAllowed: boolean }[] => [
    ...Object.entries(SPEAKER_ICON_SVG).map(([name, markup]) => ({
      name: `speaker ${name}`,
      markup,
      amberAllowed: name === "low" || name === "high",
    })),
    ...Object.entries(ACTION_ICON_SVG).map(([name, markup]) => ({ name: `action ${name}`, markup, amberAllowed: false })),
  ];

  it("paints only with currentColor, none or the amber accent", () => {
    for (const { name, markup } of every()) {
      const paints = [...markup.matchAll(/(?:fill|stroke)="([^"]*)"/g)].map((m) => m[1]);
      expect(paints.length, name).toBeGreaterThan(0);
      for (const paint of paints) {
        expect(["currentColor", "none", "#f2b84b"], name).toContain(paint);
      }
    }
  });

  it("uses the amber accent only for the sound waves (low and high)", () => {
    for (const { name, markup, amberAllowed } of every()) {
      if (amberAllowed) continue;
      expect(markup.includes("#f2b84b"), name).toBe(false);
    }
    expect(SPEAKER_ICON_SVG.low).toContain("#f2b84b");
    expect(SPEAKER_ICON_SVG.high).toContain("#f2b84b");
  });

  it("has no script, no event attribute, no href and no url()", () => {
    for (const { name, markup } of every()) {
      expect(markup, name).not.toMatch(/<script/i);
      expect(markup, name).not.toMatch(/\son[a-z]+\s*=/i);
      expect(markup, name).not.toMatch(/href/i);
      expect(markup, name).not.toMatch(/url\(/i);
    }
  });

  it("draws the cross only when muted, and the waves by volume", () => {
    expect(SPEAKER_ICON_SVG.muted).toContain("M15.8 9.4L21 14.6");
    expect(SPEAKER_ICON_SVG.silent).not.toContain("<path d=\"M15.8");
    expect(SPEAKER_ICON_SVG.low).not.toContain("M17.9 6.8");
    expect(SPEAKER_ICON_SVG.high).toContain("M17.9 6.8");
  });
});

describe("CONTROL_ACTIONS", () => {
  it("lists Undo, Reset and Download log, in that order", () => {
    expect(CONTROL_ACTIONS).toEqual([
      { id: "undo", label: "Undo" },
      { id: "reset", label: "Reset" },
      { id: "log", label: "Download log" },
    ]);
  });
});

describe("speakerIcon", () => {
  it("is muted at any volume while muted", () => {
    expect(speakerIcon(true, 0)).toBe("muted");
    expect(speakerIcon(true, 0.7)).toBe("muted");
    expect(speakerIcon(true, 1)).toBe("muted");
  });

  it("is silent at volume 0 and one wave up to half volume", () => {
    expect(speakerIcon(false, 0)).toBe("silent");
    expect(speakerIcon(false, 0.01)).toBe("low");
    expect(speakerIcon(false, 0.5)).toBe("low");
  });

  it("is two waves above half volume", () => {
    expect(speakerIcon(false, 0.51)).toBe("high");
    expect(speakerIcon(false, 1)).toBe("high");
  });

  it("reads NaN and out-of-range volumes through clampVolume", () => {
    expect(speakerIcon(false, 2)).toBe("high");
    expect(speakerIcon(false, -1)).toBe("silent");
    expect(speakerIcon(false, Number.NaN)).toBe(speakerIcon(false, 0.5));
  });
});

describe("speakerLabel", () => {
  it("names the muted state", () => {
    expect(speakerLabel(true, 0.5)).toBe("Sound: muted");
  });

  it("gives the volume as a whole percent", () => {
    expect(speakerLabel(false, 0.5)).toBe("Sound: on, volume 50%");
    expect(speakerLabel(false, 0)).toBe("Sound: on, volume 0%");
    expect(speakerLabel(false, 0.456)).toBe("Sound: on, volume 46%");
  });
});

describe("soundPopover", () => {
  it("opens from closed on the toggle, with focus on the mute toggle", () => {
    expect(soundPopover(false, { type: "toggle" })).toEqual({ open: true, focus: "toggle" });
  });

  it("closes from open on the speaker, with focus back on the speaker", () => {
    expect(soundPopover(true, { type: "toggle" })).toEqual({ open: false, focus: "speaker" });
  });

  it("closes on Esc while open, and returns focus to the speaker", () => {
    expect(soundPopover(true, { type: "escape" })).toEqual({ open: false, focus: "speaker" });
  });

  it("ignores Esc while closed", () => {
    expect(soundPopover(false, { type: "escape" })).toEqual({ open: false, focus: null });
  });

  it("closes on a press outside, without moving focus", () => {
    expect(soundPopover(true, { type: "pointerdown", inside: false })).toEqual({ open: false, focus: null });
  });

  it("leaves the popover as it is on a press inside", () => {
    expect(soundPopover(true, { type: "pointerdown", inside: true })).toEqual({ open: true, focus: null });
    expect(soundPopover(false, { type: "pointerdown", inside: true })).toEqual({ open: false, focus: null });
  });

  it("closes when focus leaves the dock, without moving focus", () => {
    expect(soundPopover(true, { type: "focusout", inside: false })).toEqual({ open: false, focus: null });
  });

  it("leaves the popover as it is when focus moves within the dock", () => {
    expect(soundPopover(true, { type: "focusout", inside: true })).toEqual({ open: true, focus: null });
  });
});

describe("escapeTarget", () => {
  it("gives the popover first, then the splash", () => {
    expect(escapeTarget(true, true)).toBe("popover");
    expect(escapeTarget(false, true)).toBe("splash");
    expect(escapeTarget(true, false)).toBe("popover");
    expect(escapeTarget(false, false)).toBeNull();
  });
});

describe("promptPosition with a list of obstacles", () => {
  const bounds = { width: 400, height: 700 };
  const box = { width: 220, height: 40 };
  const inventory: Rect = { left: 14, top: 566, width: 76, height: 120 };
  const dock: Rect = { left: 346, top: 646, width: 40, height: 40 };

  const overlaps = (at: { left: number; top: number }, r: Rect): boolean =>
    at.left < r.left + r.width && at.left + box.width > r.left && at.top < r.top + r.height && at.top + box.height > r.top;

  it("never overlaps the inventory or the dock when a free spot exists", () => {
    for (let x = 0; x <= bounds.width; x += 20) {
      for (let y = 0; y <= bounds.height; y += 20) {
        const at = promptPosition({ x, y }, bounds, box, undefined, undefined, [inventory, dock]);
        expect(overlaps(at, inventory), `pointer ${x},${y}`).toBe(false);
        expect(overlaps(at, dock), `pointer ${x},${y}`).toBe(false);
      }
    }
  });

  it("keeps the prompt inside the bounds", () => {
    for (let x = 0; x <= bounds.width; x += 40) {
      for (let y = 0; y <= bounds.height; y += 40) {
        const at = promptPosition({ x, y }, bounds, box, undefined, undefined, [inventory, dock]);
        expect(at.left).toBeGreaterThanOrEqual(0);
        expect(at.top).toBeGreaterThanOrEqual(0);
        expect(at.left + box.width).toBeLessThanOrEqual(bounds.width);
        expect(at.top + box.height).toBeLessThanOrEqual(bounds.height);
      }
    }
  });

  it("keeps the below-right spot when no obstacle is in the way", () => {
    expect(promptPosition({ x: 100, y: 100 }, bounds, box, undefined, undefined, [])).toEqual({ left: 116, top: 116 });
  });

  it("finds a free spot when the box must dodge both corners and the beside spot is blocked", () => {
    // A wall across the middle of the room: below and above the pointer both hit it, and so does the spot beside it.
    const wall: Rect = { left: 0, top: 300, width: 400, height: 120 };
    const at = promptPosition({ x: 200, y: 330 }, bounds, box, undefined, undefined, [wall, inventory, dock]);
    expect(overlaps(at, wall)).toBe(false);
    expect(overlaps(at, inventory)).toBe(false);
    expect(overlaps(at, dock)).toBe(false);
  });
});

describe("splashCeiling", () => {
  const inventory: Rect = { left: 14, top: 566, width: 76, height: 120 };
  const dock: Rect = { left: 346, top: 646, width: 40, height: 40 };

  it("is the root height on a wide root, where the corners are not in the splash's columns", () => {
    const splash: Rect = { left: 780, top: 100, width: 360, height: 200 };
    expect(splashCeiling(1080, splash, [inventory, dock], 8)).toBe(1080);
  });

  it("ends above the taller corner panel on a narrow root", () => {
    const splash: Rect = { left: 16, top: 100, width: 368, height: 200 };
    expect(splashCeiling(800, splash, [inventory, dock], 8)).toBe(Math.min(inventory.top, dock.top) - 8);
    expect(splashCeiling(800, splash, [inventory, dock], 8)).toBe(558);
  });

  it("is the root height with no obstacles", () => {
    const splash: Rect = { left: 16, top: 100, width: 368, height: 200 };
    expect(splashCeiling(800, splash, [])).toBe(800);
  });
});
