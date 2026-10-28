/**
 * The HTML overlay over the map canvas. It renders the state it is given and forwards clicks on its
 * own buttons and picker. It computes no game rules: numbers and booleans come from the grid, the
 * prompt from the play layer.
 */

import type { FeedInfo } from "../core";
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
  targetRows,
} from "./logic";

export interface UIDeps {
  grid: Grid;
  play: MapPlay;
  puzzles: { id: string; name: string; locked: boolean }[];
  current: string;
  onPick(id: string): void;
  /** The map's feeds in file order (puzzleFeeds). One feed, or none: the single capacity row. Two or more: one row per feed. */
  feeds?: readonly FeedInfo[];
}

export interface UI {
  update(): void;
  /** Shows a short text notice at the top of the map. It fades after a few seconds. */
  notify(text: string): void;
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

  root.append(hudLeft, hudRight, bannerEl, promptEl, noticesEl);

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

  function update(): void {
    const state = deps.grid.state();
    const view = deps.play.view();
    noticesTick(performance.now());

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

  return { update, notify };
}
