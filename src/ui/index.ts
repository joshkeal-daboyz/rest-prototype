/**
 * The HTML overlay over the map canvas. It renders the state it is given and forwards clicks on its
 * own buttons and picker. It computes no game rules: numbers and booleans come from the grid, the
 * prompt from the play layer.
 */

import type { AudioControl, FeedInfo, Part } from "../core";
import type { Grid } from "../grid";
import type { MapPlay } from "../play";
import {
  ACTION_ICON_SVG,
  CONTROL_ACTIONS,
  CONTROL_ICON_VIEWBOX,
  escapeTarget,
  type PopoverEvent,
  SPEAKER_ICON_SVG,
  soundPopover,
  speakerIcon,
  speakerLabel,
  splashCeiling,
} from "./controls";
import {
  batteryCountdown,
  bannerText,
  capacityRows,
  inventoryRows,
  isHighlighted,
  liveNotices,
  mapLabel,
  noticeOpacity,
  PART_ICON_SIZE,
  PART_ICON_SVG,
  PART_ICON_VIEWBOX,
  partsSummary,
  promptPosition,
  promptToShow,
  readAudioPrefs,
  sliderToVolume,
  soundToggleLabel,
  targetRows,
  volumeToSlider,
  winLine,
  writeAudioPrefs,
  type Rect,
  type StorageLike,
} from "./logic";

export interface UIDeps {
  grid: Grid;
  play: MapPlay;
  puzzles: { id: string; name: string; locked: boolean }[];
  current: string;
  onPick(id: string): void;
  /** The map's feeds in file order (puzzleFeeds). One feed, or none: the single capacity row. Two or more: one row per feed. */
  feeds?: readonly FeedInfo[];
  /** The session's sound (src/audio's engine). Without it no sound control is drawn. */
  audio?: AudioControl;
  /**
   * A "Priests want lit" entry was hovered or focused (ticket 024 B): its lamp id, or null when it was left.
   * main.ts carries the highlight to the map and calls ui.highlight back.
   */
  onHighlight?(lampId: string | null): void;
}

/** What the win splash shows. All of it is plain data from the play layer and the picker. */
export interface WinSplash {
  /** The map's display name, e.g. "01 · First light". */
  name: string;
  /** view().elapsed at the win. */
  seconds: number;
  /** grid.state().actions at the win. */
  moves: number;
  /** The next map in picker order (same group), or null on the last one. */
  next: { id: string; name: string } | null;
  onNext(): void;
}

export interface UI {
  update(): void;
  /** Shows a short text notice at the top of the map. It fades after a few seconds. */
  notify(text: string): void;
  /** Shows the win splash below the HUD. Not modal: the HUD stays usable. */
  showWin(win: WinSplash): void;
  /** Hides the win splash. The lit map stays as it is. */
  hideWin(): void;
  /** Picks out the list entry for this lamp id (ticket 024 B), or none for null. The map's place is main.ts's job. */
  highlight(lampId: string | null): void;
}

/** Styles for the "Priests want lit" entries (ticket 024 B): focusable, and picked out with the focus colour. */
const TARGETS_STYLE_ID = "ui-targets-style";
const TARGETS_CSS = `
#ui .targets .target { pointer-events: auto; border-radius: 4px; }
#ui .targets .target:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
#ui .targets .target.highlight { outline: 1.5px solid var(--focus); outline-offset: 2px; }
`;

function ensureTargetsStyle(): void {
  if (document.getElementById(TARGETS_STYLE_ID)) return;
  const style = el("style");
  style.id = TARGETS_STYLE_ID;
  style.textContent = TARGETS_CSS;
  document.head.append(style);
}

/** Styles for the parts inventory (ticket 021): a small panel fixed bottom-left, one column of icon and count. */
const INVENTORY_STYLE_ID = "ui-inventory-style";
const INVENTORY_CSS = `
.inventory { position: absolute; left: 14px; bottom: 14px; box-sizing: border-box; display: grid; grid-template-columns: 26px 3ch; grid-auto-rows: 32px; column-gap: 4px; row-gap: 2px; align-items: center; color: var(--ink); background: #141b24; border: 0.5px solid #2a3644; border-radius: 10px; padding: 8px 10px; }
.inventory .row { display: grid; grid-column: 1 / -1; grid-template-columns: subgrid; align-items: center; height: 32px; }
.inventory .row.empty { opacity: 0.4; }
.inventory .icon { display: block; width: 26px; height: 26px; }
.inventory .count { text-align: right; font-variant-numeric: tabular-nums; }
`;

function ensureInventoryStyle(): void {
  if (document.getElementById(INVENTORY_STYLE_ID)) return;
  const style = el("style");
  style.id = INVENTORY_STYLE_ID;
  style.textContent = INVENTORY_CSS;
  document.head.append(style);
}

const SVG_NS = "http://www.w3.org/2000/svg";

/** A part's approved icon: a 24×24 inline SVG from fixed strings (PART_ICON_SVG), hidden from assistive tech. */
function partIcon(kind: Part): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", PART_ICON_VIEWBOX);
  svg.setAttribute("width", String(PART_ICON_SIZE));
  svg.setAttribute("height", String(PART_ICON_SIZE));
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("class", "icon");
  svg.innerHTML = PART_ICON_SVG[kind];
  return svg;
}

/** A control icon (ticket 030): a 24×24 inline SVG of fixed markup, hidden from assistive tech. */
function controlIcon(markup: string, className: string, size: number): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", CONTROL_ICON_VIEWBOX);
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("class", className);
  svg.innerHTML = markup;
  return svg;
}

/** Styles for the notice strip, added once to the document head (index.html holds the rest). */
const NOTICE_STYLE_ID = "ui-notice-style";
const NOTICE_CSS = `
.notices { position: absolute; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 6px; max-width: min(420px, calc(100% - 32px)); pointer-events: none; }
.notice { background: var(--panel); border: 1px solid var(--alarm); color: var(--ink); border-radius: 8px; padding: 6px 12px; text-align: center; }
`;

function ensureNoticeStyle(): void {
  if (document.getElementById(NOTICE_STYLE_ID)) return;
  const style = el("style");
  style.id = NOTICE_STYLE_ID;
  style.textContent = NOTICE_CSS;
  document.head.append(style);
}

/** Styles for the win splash (ticket 020 B). Only the splash takes the pointer; the overlay stays click-through. */
const SPLASH_STYLE_ID = "ui-splash-style";
const SPLASH_CSS = `
.splash { position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: min(360px, calc(100% - 32px)); box-sizing: border-box; background: var(--panel); border: 1px solid var(--lit); color: var(--ink); border-radius: 8px; padding: 14px 16px; text-align: center; pointer-events: auto; }
.splash h2 { margin: 0 0 6px; font-size: 17px; color: var(--lit); }
.splash p { margin: 0 0 12px; }
.splash-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.splash button.primary { border-color: var(--lit); font-weight: 600; }
.splash-sub { display: block; font-size: 12px; font-weight: 400; color: var(--ink-dim); }
`;

function ensureSplashStyle(): void {
  if (document.getElementById(SPLASH_STYLE_ID)) return;
  const style = el("style");
  style.id = SPLASH_STYLE_ID;
  style.textContent = SPLASH_CSS;
  document.head.append(style);
}

/** Esc listener for the splash, removed when it hides and when the map is switched. */
let removeSplashKey: (() => void) | null = null;

/**
 * Styles for the action buttons and the sound controls (tickets 019 B, 030). The speaker dock and the popover
 * take the inventory panel's look. The `#ui` prefix beats the global `#ui button` padding and border.
 * At 600 px and below the action buttons are 40 px squares, icon only; their labels stay for screen readers.
 */
const SOUND_STYLE_ID = "ui-sound-style";
const SOUND_CSS = `
#ui .action { position: relative; display: inline-flex; align-items: center; gap: 6px; }
#ui .action-icon { display: block; width: 18px; height: 18px; flex: none; }
#ui .action-log { margin-left: 12px; }
.sound-dock { position: absolute; right: 14px; bottom: 14px; box-sizing: border-box; width: 40px; height: 40px; color: var(--ink); background: #141b24; border: 0.5px solid #2a3644; border-radius: 10px; pointer-events: auto; }
#ui .sound-dock .speaker { display: flex; align-items: center; justify-content: center; box-sizing: border-box; width: 100%; height: 100%; margin: 0; padding: 0; border: 0; border-radius: 10px; background: transparent; color: var(--ink); }
#ui .sound-dock .speaker.muted { color: var(--ink-dim); }
.speaker .icon { display: block; width: 26px; height: 26px; }
.sound-popover { position: absolute; right: 0; bottom: 48px; box-sizing: border-box; width: 200px; display: flex; flex-direction: column; gap: 10px; padding: 10px 12px; color: var(--ink); background: #141b24; border: 0.5px solid #2a3644; border-radius: 10px; }
#ui .sound-popover[hidden] { display: none; }
#ui .sound-toggle { width: 100%; margin: 0; }
#ui .sound-toggle.muted { color: var(--ink-dim); text-decoration: line-through; }
.volume { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ink-dim); }
.volume input { flex: 1; min-width: 0; margin: 0; pointer-events: auto; }
#ui input[type="range"]:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
@media (max-width: 600px) {
  #ui .action { width: 40px; height: 40px; padding: 0; justify-content: center; gap: 0; }
  #ui .action-label { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
}
`;

function ensureSoundStyle(): void {
  if (document.getElementById(SOUND_STYLE_ID)) return;
  const style = el("style");
  style.id = SOUND_STYLE_ID;
  style.textContent = SOUND_CSS;
  document.head.append(style);
}

/** localStorage, or null where the browser refuses it (sandboxed frames, some private modes). */
function browserStorage(): StorageLike | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/**
 * Applies the saved mute and volume to `audio`. Called once at startup, not per map: the engine is
 * shared, so a map switch keeps whatever the player set. With no storage the defaults stand.
 */
export function restoreAudio(audio: AudioControl): void {
  const prefs = readAudioPrefs(browserStorage());
  audio.setMuted(prefs.muted);
  audio.setVolume(prefs.volume);
}

/** The popover's id, named by the speaker's aria-controls. */
const SOUND_POPOVER_ID = "sound-popover";

interface SoundControls {
  /** The speaker and, after it, the popover. Appended to #ui after the splash so the popover draws on top. */
  dock: HTMLElement;
  popover: HTMLElement;
  render(): void;
  /** True while the popover is open. */
  isOpen(): boolean;
}

/** Pointer and key listeners on the document for the sound popover, removed when the map is switched. */
let removeSoundListeners: (() => void) | null = null;

/**
 * The speaker (ticket 030): a button in the bottom-right corner whose icon shows the sound's state, and a popover
 * above it with the mute toggle and the volume slider. Both drive `audio` and save its prefs on each change.
 */
function mountSound(audio: AudioControl, splashOpen: () => boolean): SoundControls {
  ensureSoundStyle();
  const dock = el("div", "sound-dock");

  const speaker = el("button", "speaker");
  speaker.type = "button";
  speaker.setAttribute("aria-controls", SOUND_POPOVER_ID);
  speaker.setAttribute("aria-expanded", "false");
  const speakerSvg = controlIcon(SPEAKER_ICON_SVG.silent, "icon", 26);
  speaker.append(speakerSvg);

  const popover = el("div", "sound-popover");
  popover.id = SOUND_POPOVER_ID;
  popover.setAttribute("role", "group");
  popover.setAttribute("aria-label", "Sound");
  popover.hidden = true;

  const toggle = el("button", "sound-toggle");
  toggle.type = "button";

  const volume = el("label", "volume", "Volume ");
  const slider = el("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = "100";
  slider.step = "1";
  slider.setAttribute("aria-label", "Volume");
  volume.append(slider);

  popover.append(toggle, volume);
  dock.append(speaker, popover);

  const save = (): void => {
    writeAudioPrefs(browserStorage(), { muted: audio.muted, volume: audio.volume });
  };

  toggle.addEventListener("click", () => {
    audio.setMuted(!audio.muted);
    save();
    render();
  });
  slider.addEventListener("input", () => {
    const next = sliderToVolume(slider.value);
    if (next === null) return;
    audio.setVolume(next);
    save();
  });

  // ---- the popover's open state (ticket 030): the reducer decides, this applies it ----
  let open = false;
  // True while a press that began inside the dock is still down: focus that leaves with no target then came from the press.
  let pressInside = false;

  /** Applies soundPopover's result. Focus moves before the popover is hidden, so the hide does not drop it to the page. */
  function dispatch(event: PopoverEvent): void {
    const next = soundPopover(open, event);
    if (next.open === open && next.focus === null) return;
    open = next.open;
    if (open) popover.hidden = false;
    if (next.focus === "toggle") toggle.focus({ preventScroll: true });
    else if (next.focus === "speaker") speaker.focus({ preventScroll: true });
    if (!open) popover.hidden = true;
    speaker.setAttribute("aria-expanded", String(open));
  }

  speaker.addEventListener("click", () => dispatch({ type: "toggle" }));
  // Focus leaving the dock closes the popover. Focus that moves to another element says where it went; focus that
  // leaves with no target (a Tab out of the page, or a click on non-focusable space) counts as inside only mid-press.
  dock.addEventListener("focusout", (event: FocusEvent) => {
    const to = event.relatedTarget;
    dispatch({ type: "focusout", inside: to instanceof Node ? dock.contains(to) : pressInside });
  });

  const onPointerDown = (event: PointerEvent): void => {
    const inside = event.target instanceof Node && dock.contains(event.target);
    pressInside = inside;
    dispatch({ type: "pointerdown", inside });
  };
  const onPointerEnd = (): void => {
    pressInside = false;
  };
  // Capture, so an open popover takes Esc before the splash's own Esc listener sees it.
  const onEscape = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || escapeTarget(open, splashOpen()) !== "popover") return;
    event.stopPropagation();
    dispatch({ type: "escape" });
  };
  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("pointerup", onPointerEnd);
  document.addEventListener("pointercancel", onPointerEnd);
  document.addEventListener("keydown", onEscape, true);
  removeSoundListeners = () => {
    document.removeEventListener("pointerdown", onPointerDown);
    document.removeEventListener("pointerup", onPointerEnd);
    document.removeEventListener("pointercancel", onPointerEnd);
    document.removeEventListener("keydown", onEscape, true);
  };

  /** Shows the engine's state: the icon and label name it, the toggle's aria-pressed is true while sound is on, and the slider follows the volume. */
  let shownIcon: string | null = null;
  function render(): void {
    const icon = speakerIcon(audio.muted, audio.volume);
    if (icon !== shownIcon) {
      shownIcon = icon;
      speakerSvg.innerHTML = SPEAKER_ICON_SVG[icon];
    }
    const label = speakerLabel(audio.muted, audio.volume);
    if (speaker.getAttribute("aria-label") !== label) {
      speaker.setAttribute("aria-label", label);
      speaker.title = label;
    }
    speaker.classList.toggle("muted", audio.muted);

    const toggleLabel = soundToggleLabel(audio.muted);
    setText(toggle, toggleLabel);
    toggle.setAttribute("aria-label", toggleLabel);
    toggle.setAttribute("aria-pressed", String(!audio.muted));
    toggle.classList.toggle("muted", audio.muted);
    const position = String(volumeToSlider(audio.volume));
    if (slider.value !== position) slider.value = position;
  }
  render();
  return { dock, popover, render, isOpen: () => open };
}

interface Notice {
  born: number;
  node: HTMLElement;
  opacity: number;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Writes text only when it changed, so the overlay does not touch the DOM every frame. */
function setText(node: HTMLElement, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}

/** Pointer listeners from the previous mount, removed when the map is switched. */
let removePointerListeners: (() => void) | null = null;

export function mountUI(root: HTMLElement, deps: UIDeps): UI {
  removePointerListeners?.();
  removePointerListeners = null;
  removeSplashKey?.();
  removeSplashKey = null;
  removeSoundListeners?.();
  removeSoundListeners = null;
  root.textContent = "";
  root.classList.add("ui");

  // ---- top left: map picker, capacity, targets ----
  const hudLeft = el("div", "hud hud-left");

  const pickerLabel = el("label", "picker", "Map ");
  const picker = el("select");
  picker.id = "map-picker";
  for (const map of deps.puzzles) {
    const option = el("option", undefined, mapLabel(map));
    option.value = map.id;
    option.selected = map.id === deps.current;
    picker.append(option);
  }
  picker.addEventListener("change", () => deps.onPick(picker.value));
  pickerLabel.htmlFor = picker.id;
  pickerLabel.append(picker);

  // One readout box per feed on a multi-feed map; the one-feed map gets one box, as in 014.
  const capacityEl = el("div");
  capacityEl.style.display = "flex";
  capacityEl.style.flexDirection = "column";
  capacityEl.style.gap = "6px";
  const batteryEl = el("div", "readout battery");
  batteryEl.hidden = true;
  const targetsHeading = el("h2", "label", "Priests want lit");
  const targetsEl = el("ul", "targets");
  targetsEl.setAttribute("aria-labelledby", "targets-heading");
  targetsHeading.id = "targets-heading";
  ensureTargetsStyle();
  // The list-to-map link (ticket 024 B): which lamp's entry is picked out, and the entries as built.
  let highlighted: string | null = null;
  let targetItems: { id: string; node: HTMLLIElement }[] = [];

  hudLeft.append(pickerLabel, capacityEl, batteryEl, targetsHeading, targetsEl);

  // ---- top right: Undo, Reset and Download log, three separate buttons (ticket 030) ----
  const hudRight = el("div", "hud hud-right");

  const controls = el("div", "controls");
  const actionHandlers: Record<"undo" | "reset" | "log", () => void> = {
    undo: () => deps.play.undo(),
    reset: () => deps.play.reset(),
    log: () => downloadLog(),
  };
  for (const action of CONTROL_ACTIONS) {
    const button = el("button", `action action-${action.id}`);
    button.type = "button";
    button.title = action.label;
    button.append(controlIcon(ACTION_ICON_SVG[action.id], "action-icon", 18), el("span", "action-label", action.label));
    button.addEventListener("click", actionHandlers[action.id]);
    controls.append(button);
  }
  hudRight.append(controls);

  // ---- bottom left: parts on hand (ticket 021). Not a .hud column, so the top inset ignores it. ----
  ensureInventoryStyle();
  const inventoryEl = el("div", "inventory");
  inventoryEl.setAttribute("role", "group");
  const inventoryRowEls = (["bulb", "fuse", "wire"] as const).map((kind) => {
    const row = el("div", "row");
    row.setAttribute("role", "img");
    const count = el("span", "count", "0");
    row.append(partIcon(kind), count);
    inventoryEl.append(row);
    return { kind, row, count };
  });

  // ---- bottom right: the speaker and its popover (ticket 030), only when there is a sound engine ----
  const sound = deps.audio ? mountSound(deps.audio, () => !splashEl.hidden) : null;

  // ---- bottom: prompt; top centre: banner ----
  const promptEl = el("div", "prompt");
  promptEl.setAttribute("role", "status");
  promptEl.setAttribute("aria-live", "polite");
  promptEl.hidden = true;

  const bannerEl = el("div", "banner");
  bannerEl.setAttribute("role", "status");
  bannerEl.setAttribute("aria-live", "polite");
  bannerEl.hidden = true;

  // Notices sit top centre, under the HUD row. Text only, so keyboard and screen-reader users get them too.
  ensureNoticeStyle();
  const noticesEl = el("div", "notices");
  noticesEl.setAttribute("role", "status");
  noticesEl.setAttribute("aria-live", "polite");
  let notices: Notice[] = [];
  let noticesTop = -1;

  // ---- win splash (ticket 020 B): below the HUD, under the notices; appended after the inventory so it draws on top ----
  ensureSplashStyle();
  const splashEl = el("div", "splash");
  splashEl.setAttribute("role", "dialog");
  splashEl.setAttribute("aria-labelledby", "splash-heading");
  splashEl.hidden = true;
  const splashHeading = el("h2");
  splashHeading.id = "splash-heading";
  const splashLine = el("p", "splash-line");
  const splashActions = el("div", "splash-actions");
  const nextButton = el("button", "primary");
  nextButton.type = "button";
  const replayButton = el("button");
  replayButton.type = "button";
  replayButton.textContent = "Replay";
  const splashDone = el("p", "splash-done", "All levels done.");
  splashActions.append(nextButton, replayButton);
  splashEl.append(splashHeading, splashLine, splashActions, splashDone);

  let win: WinSplash | null = null;
  let splashTop = -1;

  const onSplashKey = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && escapeTarget(sound?.isOpen() ?? false, true) === "splash") hideWin();
  };

  replayButton.addEventListener("click", () => {
    deps.play.reset();
    hideWin();
  });
  nextButton.addEventListener("click", () => {
    if (win?.next) win.onNext();
  });

  root.append(hudLeft, hudRight, inventoryEl, bannerEl, promptEl, noticesEl, splashEl);
  // The speaker dock last: its popover draws over everything else.
  if (sound) root.append(sound.dock);

  // The prompt follows the pointer over the map. Pointer position is presentation only.
  let pointer: { x: number; y: number } | null = null;
  const container = root.parentElement;
  const onMove = (event: PointerEvent): void => {
    pointer = { x: event.clientX, y: event.clientY };
    placePrompt();
  };
  const onLeave = (): void => {
    pointer = null;
    promptEl.hidden = true;
  };
  if (container) {
    container.addEventListener("pointermove", onMove);
    container.addEventListener("pointerleave", onLeave);
    removePointerListeners = () => {
      container.removeEventListener("pointermove", onMove);
      container.removeEventListener("pointerleave", onLeave);
    };
  }

  function placePrompt(): void {
    if (!pointer || promptEl.hidden) return;
    const bounds = root.getBoundingClientRect();
    const local = { x: pointer.x - bounds.left, y: pointer.y - bounds.top };
    // The prompt keeps off the parts panel, the speaker and, while it is open, the popover (ticket 030).
    const avoid: Rect[] = [localRect(inventoryEl, bounds)];
    if (sound) avoid.push(localRect(sound.dock, bounds));
    if (sound?.isOpen()) avoid.push(localRect(sound.popover, bounds));
    const spot = promptPosition(
      local,
      bounds,
      { width: promptEl.offsetWidth, height: promptEl.offsetHeight },
      undefined,
      undefined,
      avoid,
    );
    promptEl.style.left = `${spot.left}px`;
    promptEl.style.top = `${spot.top}px`;
  }

  function downloadLog(): void {
    const blob = new Blob([deps.play.exportLog()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = el("a");
    link.href = url;
    link.download = `${deps.current.replace(/[\\/]/g, "-")}-log.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  let targetsKey = "";
  // null, not "": an empty parts list joins to "", and the rows still need their first write (ticket 021).
  let partsKey: string | null = null;
  let capacityKey = "";

  /** A node's box in `root`'s space (the same space as the pointer), so it can be compared with the prompt's box. */
  function localRect(node: HTMLElement, bounds: DOMRect): Rect {
    const box = node.getBoundingClientRect();
    return { left: box.left - bounds.left, top: box.top - bounds.top, width: box.width, height: box.height };
  }

  function notify(text: string): void {
    const node = el("div", "notice", text);
    notices.push({ born: performance.now(), node, opacity: 1 });
    noticesEl.append(node);
    noticesTick(performance.now());
  }

  /** Drops expired or overflowing notices and fades the rest. Runs every frame; touches the DOM only on change. */
  function noticesTick(now: number): void {
    const live = liveNotices(notices, now);
    if (live.length !== notices.length) {
      for (const gone of notices) if (!live.includes(gone)) gone.node.remove();
      notices = live;
    }
    for (const notice of notices) {
      const opacity = noticeOpacity(now - notice.born);
      if (opacity !== notice.opacity) {
        notice.opacity = opacity;
        notice.node.style.opacity = String(opacity);
      }
    }
    if (notices.length === 0) return;
    // Below the HUD row: the lower edge of the tallest HUD column, measured only while a notice shows.
    const rootTop = root.getBoundingClientRect().top;
    const hudBottom = Math.max(hudLeft.getBoundingClientRect().bottom, hudRight.getBoundingClientRect().bottom) - rootTop;
    const top = Math.round(hudBottom + 8);
    if (top !== noticesTop) {
      noticesTop = top;
      noticesEl.style.top = `${top}px`;
    }
  }

  /** Puts the splash under the HUD (and the win banner), centred in the room left below that when there is some. */
  function placeSplash(): void {
    if (splashEl.hidden) return;
    const rootBox = root.getBoundingClientRect();
    let floor = Math.max(hudLeft.getBoundingClientRect().bottom, hudRight.getBoundingClientRect().bottom);
    if (!bannerEl.hidden) floor = Math.max(floor, bannerEl.getBoundingClientRect().bottom);
    const top = Math.round(floor - rootBox.top + 8);
    // Ticket 021, extended by 030: the room ends 8 px above the highest bottom-corner panel that shares the splash's columns.
    const obstacles: Rect[] = [localRect(inventoryEl, rootBox)];
    if (sound) obstacles.push(localRect(sound.dock, rootBox));
    const ceiling = splashCeiling(rootBox.height, localRect(splashEl, rootBox), obstacles, 8);
    const room = ceiling - top - splashEl.offsetHeight;
    const place = room > 0 ? Math.round(top + room / 2) : top;
    if (place !== splashTop) {
      splashTop = place;
      splashEl.style.top = `${place}px`;
    }
  }

  function showWin(next: WinSplash): void {
    win = next;
    setText(splashHeading, next.name);
    setText(splashLine, winLine(next.seconds, next.moves));
    if (next.next) {
      nextButton.hidden = false;
      nextButton.replaceChildren(el("span", undefined, "Next level"), el("span", "splash-sub", next.next.name));
      nextButton.classList.add("primary");
      replayButton.classList.remove("primary");
    } else {
      nextButton.hidden = true;
      replayButton.classList.add("primary");
    }
    splashDone.hidden = next.next !== null;
    splashEl.hidden = false;
    if (!removeSplashKey) {
      document.addEventListener("keydown", onSplashKey);
      removeSplashKey = () => document.removeEventListener("keydown", onSplashKey);
    }
    (next.next ? nextButton : replayButton).focus({ preventScroll: true });
    placeSplash();
  }

  function hideWin(): void {
    win = null;
    splashEl.hidden = true;
    removeSplashKey?.();
    removeSplashKey = null;
  }

  function update(): void {
    const state = deps.grid.state();
    const view = deps.play.view();
    noticesTick(performance.now());
    // A Reset from the HUD takes the job back to incomplete: the splash goes with the win.
    if (win && !state.complete) hideWin();
    placeSplash();

    const prompt = promptToShow(view);
    promptEl.hidden = prompt === null || pointer === null;
    setText(promptEl, prompt ?? "");
    placePrompt();

    const banner = bannerText(state);
    bannerEl.hidden = banner === null;
    setText(bannerEl, banner ?? "");

    const capRows = capacityRows(state, deps.feeds ?? []);
    const nextCapacityKey = JSON.stringify(capRows);
    if (nextCapacityKey !== capacityKey) {
      capacityKey = nextCapacityKey;
      capacityEl.textContent = "";
      for (const row of capRows) {
        const node = el("div", "readout capacity", row.text);
        node.classList.toggle("brownout", row.alarm);
        capacityEl.append(node);
      }
    }

    const countdown = batteryCountdown(state);
    batteryEl.hidden = countdown === null;
    setText(batteryEl, countdown ?? "");

    const rows = targetRows(state.targets, state.lit, state.brownout);
    const nextTargetsKey = JSON.stringify(rows);
    if (nextTargetsKey !== targetsKey) {
      targetsKey = nextTargetsKey;
      // A rebuild must not drop the keyboard user's place in the list: refocus the same lamp's entry afterwards.
      const active = document.activeElement;
      const focusedId = targetItems.find((i) => i.node === active)?.id ?? null;
      targetsEl.textContent = "";
      targetItems = [];
      for (const row of rows) {
        const item = el("li", row.lit ? "target lit" : "target dark");
        item.tabIndex = 0;
        item.setAttribute("data-lamp", row.id);
        item.append(el("span", "mark", row.lit ? "On" : "Off"), el("span", "target-text", row.text));
        item.addEventListener("pointerenter", () => deps.onHighlight?.(row.id));
        item.addEventListener("pointerleave", () => deps.onHighlight?.(null));
        item.addEventListener("focus", () => deps.onHighlight?.(row.id));
        item.addEventListener("blur", () => deps.onHighlight?.(null));
        targetsEl.append(item);
        targetItems.push({ id: row.id, node: item });
      }
      applyHighlight();
      if (focusedId !== null) targetItems.find((i) => i.id === focusedId)?.node.focus({ preventScroll: true });
    }

    sound?.render();

    const nextPartsKey = state.parts.join(",");
    if (nextPartsKey !== partsKey) {
      partsKey = nextPartsKey;
      const rows = inventoryRows(state.parts);
      for (const node of inventoryRowEls) {
        const row = rows.find((r) => r.kind === node.kind);
        if (!row) continue;
        setText(node.count, String(row.count));
        node.row.setAttribute("aria-label", row.text);
        node.row.classList.toggle("empty", row.empty);
      }
    }
    inventoryEl.setAttribute("aria-label", partsSummary(state.parts));
  }

  /** Marks the entry for the highlighted lamp (class `highlight`, an outline; the text stays the same). */
  function applyHighlight(): void {
    for (const item of targetItems) item.node.classList.toggle("highlight", isHighlighted(item.id, highlighted));
  }

  function highlight(lampId: string | null): void {
    highlighted = lampId;
    applyHighlight();
  }

  return { update, notify, showWin, hideWin, highlight };
}
