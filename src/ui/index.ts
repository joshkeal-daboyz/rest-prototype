/**
 * The HTML overlay over the map canvas. It renders the state it is given and forwards clicks on its
 * own buttons and picker. It computes no game rules: numbers and booleans come from the grid, the
 * prompt from the play layer.
 */

import type { AudioControl, FeedInfo } from "../core";
import type { Grid } from "../grid";
import type { MapPlay } from "../play";
import {
  batteryCountdown,
  bannerText,
  capacityRows,
  liveNotices,
  mapLabel,
  noticeOpacity,
  partCounts,
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
}

const PART_LABEL = { bulb: "Bulb", fuse: "Fuse", wire: "Wire" } as const;

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

/** Styles for the sound control (ticket 019 B). The muted state is a strikethrough as well as the dimmed colour. */
const AUDIO_STYLE_ID = "ui-audio-style";
const AUDIO_CSS = `
.sound-toggle.muted { color: var(--ink-dim); text-decoration: line-through; }
.volume { display: inline-flex; align-items: center; gap: 6px; background: var(--panel); border: 1px solid var(--edge); border-radius: 6px; padding: 6px 10px; }
.volume input { width: 84px; margin: 0; }
#ui input[type="range"]:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
`;

function ensureAudioStyle(): void {
  if (document.getElementById(AUDIO_STYLE_ID)) return;
  const style = el("style");
  style.id = AUDIO_STYLE_ID;
  style.textContent = AUDIO_CSS;
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

interface SoundControls {
  button: HTMLButtonElement;
  volume: HTMLLabelElement;
  render(): void;
}

/** The mute toggle and the volume slider. Both drive `audio` and save its prefs on each change. */
function mountSound(audio: AudioControl): SoundControls {
  ensureAudioStyle();
  const button = el("button", "sound-toggle");
  button.type = "button";

  const volume = el("label", "volume", "Volume ");
  const slider = el("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = "100";
  slider.step = "1";
  slider.setAttribute("aria-label", "Volume");
  volume.append(slider);

  const save = (): void => {
    writeAudioPrefs(browserStorage(), { muted: audio.muted, volume: audio.volume });
  };

  button.addEventListener("click", () => {
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

  /** Shows the engine's state: the label names it, aria-pressed is true while sound is on, and the slider follows the volume. */
  function render(): void {
    const label = soundToggleLabel(audio.muted);
    setText(button, label);
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", String(!audio.muted));
    button.classList.toggle("muted", audio.muted);
    const position = String(volumeToSlider(audio.volume));
    if (slider.value !== position) slider.value = position;
  }
  render();
  return { button, volume, render };
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

  hudLeft.append(pickerLabel, capacityEl, batteryEl, targetsHeading, targetsEl);

  // ---- top right: controls and parts ----
  const hudRight = el("div", "hud hud-right");

  const controls = el("div", "controls");
  const undoButton = el("button", undefined, "Undo");
  undoButton.type = "button";
  undoButton.addEventListener("click", () => deps.play.undo());
  const resetButton = el("button", undefined, "Reset");
  resetButton.type = "button";
  resetButton.addEventListener("click", () => deps.play.reset());
  const logButton = el("button", undefined, "Download log");
  logButton.type = "button";
  logButton.addEventListener("click", () => downloadLog());
  controls.append(undoButton, resetButton, logButton);
  const sound = deps.audio ? mountSound(deps.audio) : null;
  if (sound) controls.append(sound.button, sound.volume);

  const partsEl = el("div", "parts");
  partsEl.setAttribute("role", "group");
  hudRight.append(controls, partsEl);

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

  // ---- win splash (ticket 020 B): below the HUD, under the notices; appended last so it draws on top ----
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
    if (event.key === "Escape") hideWin();
  };

  replayButton.addEventListener("click", () => {
    deps.play.reset();
    hideWin();
  });
  nextButton.addEventListener("click", () => {
    if (win?.next) win.onNext();
  });

  root.append(hudLeft, hudRight, bannerEl, promptEl, noticesEl, splashEl);

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
    const spot = promptPosition(local, bounds, { width: promptEl.offsetWidth, height: promptEl.offsetHeight });
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
  let partsKey = "";
  let capacityKey = "";

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
    const room = rootBox.height - top - splashEl.offsetHeight;
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
      targetsEl.textContent = "";
      for (const row of rows) {
        const item = el("li", row.lit ? "target lit" : "target dark");
        item.append(el("span", "mark", row.lit ? "On" : "Off"), el("span", "target-text", row.text));
        targetsEl.append(item);
      }
    }

    sound?.render();

    const nextPartsKey = state.parts.join(",");
    if (nextPartsKey !== partsKey) {
      partsKey = nextPartsKey;
      partsEl.textContent = "";
      const counts = partCounts(state.parts);
      for (const kind of ["bulb", "fuse", "wire"] as const) {
        const chip = el("span", `part part-${kind}`);
        chip.append(el("span", `icon icon-${kind}`), el("span", "part-text", `${PART_LABEL[kind]} ${counts[kind]}`));
        partsEl.append(chip);
      }
    }
    partsEl.setAttribute("aria-label", partsSummary(state.parts));
  }

  return { update, notify, showWin, hideWin };
}
