/**
 * The HTML overlay over the map canvas. It renders the state it is given and forwards clicks on its
 * own buttons and picker. It computes no game rules: numbers and booleans come from the grid, the
 * prompt from the play layer.
 */

import type { Grid } from "../grid";
import type { MapPlay } from "../play";
import { bannerText, capacityReadout, mapLabel, partCounts, partsSummary, promptPosition, promptToShow, targetRows } from "./logic";

export interface UIDeps {
  grid: Grid;
  play: MapPlay;
  puzzles: { id: string; name: string; locked: boolean }[];
  current: string;
  onPick(id: string): void;
}

export interface UI {
  update(): void;
}

const PART_LABEL = { bulb: "Bulb", fuse: "Fuse", wire: "Wire" } as const;

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

  const capacityEl = el("div", "readout capacity");
  const targetsHeading = el("h2", "label", "Priests want lit");
  const targetsEl = el("ul", "targets");
  targetsEl.setAttribute("aria-labelledby", "targets-heading");
  targetsHeading.id = "targets-heading";

  hudLeft.append(pickerLabel, capacityEl, targetsHeading, targetsEl);

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

  root.append(hudLeft, hudRight, bannerEl, promptEl);

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

  function update(): void {
    const state = deps.grid.state();
    const view = deps.play.view();

    const prompt = promptToShow(view);
    promptEl.hidden = prompt === null || pointer === null;
    setText(promptEl, prompt ?? "");
    placePrompt();

    const banner = bannerText(state);
    bannerEl.hidden = banner === null;
    setText(bannerEl, banner ?? "");

    setText(capacityEl, capacityReadout(state.load, state.capacity, state.brownout));
    capacityEl.classList.toggle("brownout", state.brownout);

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

  return { update };
}
