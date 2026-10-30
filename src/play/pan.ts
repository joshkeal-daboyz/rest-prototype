// Pointer and key input for the map view (tickets 022, 027 B): right-drag pans, the context menu is suppressed on the
// canvas, arrows pan, the wheel / touchpad pinch / + - zoom, F shows the whole map, Home and a double right-click
// return to the opening view. View-only: no grid call, no log, no bus event.
import type { MapPanView } from "../render";

/** Two still right presses within this many ms re-centre the view. */
export const RIGHT_DOUBLE_MS = 400;
/** A right press that moves less than this many px before release counts as a click, not a drag. */
export const DRAG_SLOP = 4;

/** Wheel deltas that make one zoom level: pixels (deltaMode 0) or lines (deltaMode 1). */
export const WHEEL_NOTCH_PX = 100;
export const WHEEL_NOTCH_LINES = 3;
/** Most zoom levels one wheel event may move. */
export const WHEEL_MAX_STEPS = 3;
/** Touchpad pinch (ctrl + wheel) deltaY that makes one zoom level. */
export const PINCH_STEP = 40;
/** Leftover wheel or pinch movement is forgotten after this many ms without an event. */
export const WHEEL_IDLE_MS = 250;

export interface PanInputOptions {
  /** Clock in ms for the double right-click; tests inject one. Default performance.now. */
  now?: () => number;
}

interface Hold {
  pointerId: number | undefined;
  startX: number;
  startY: number;
  startPanX: number;
  startPanY: number;
  pressedAt: number;
  moved: number;
}

/** Right-drag pans, contextmenu suppressed, Home / double right-click reset the view. Returns detach. */
export function attachPan(
  canvas: HTMLCanvasElement,
  view: MapPanView,
  doc: Pick<Document, "addEventListener" | "removeEventListener"> = canvas.ownerDocument,
  options: PanInputOptions = {},
): () => void {
  const now = options.now ?? ((): number => performance.now());
  let hold: Hold | null = null;
  /** Press time of the last right press that ended without a drag; null once used or after a drag. */
  let armedAt: number | null = null;

  const endHold = (counts: boolean): void => {
    if (!hold) return;
    armedAt = counts && hold.moved < DRAG_SLOP ? hold.pressedAt : null;
    hold = null;
    canvas.style.cursor = "";
  };

  const onDown = (e: PointerEvent): void => {
    if (e.button !== 2) return;
    const t = now();
    if (armedAt !== null && t - armedAt <= RIGHT_DOUBLE_MS) {
      armedAt = null;
      view.resetView();
      return;
    }
    armedAt = null;
    const pan = view.getPan();
    hold = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
      pressedAt: t,
      moved: 0,
    };
    if (typeof canvas.setPointerCapture === "function" && e.pointerId !== undefined) {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // A pointer that is already gone cannot be captured; the drag still works inside the canvas.
      }
    }
    canvas.style.cursor = "grabbing";
  };

  const onMove = (e: PointerEvent): void => {
    if (!hold) return;
    if (hold.pointerId !== undefined && e.pointerId !== undefined && e.pointerId !== hold.pointerId) return;
    const dx = e.clientX - hold.startX;
    const dy = e.clientY - hold.startY;
    hold.moved = Math.max(hold.moved, Math.hypot(dx, dy));
    view.setPan(hold.startPanX + dx, hold.startPanY + dy);
  };

  const onUp = (e: PointerEvent): void => {
    if (e.button !== 2) return;
    endHold(true);
  };
  const onCancel = (): void => endHold(false);

  const onContextMenu = (e: Event): void => {
    e.preventDefault();
  };

  /** Free-area size: the canvas size (the view does not expose its insets; see the ticket B report). */
  const areaSize = (): { w: number; h: number } => ({
    w: canvas.clientWidth || canvas.width || 0,
    h: canvas.clientHeight || canvas.height || 0,
  });

  const onKey = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const tag = (e.target as { tagName?: string } | null)?.tagName?.toLowerCase();
    if (tag === "select" || tag === "input" || tag === "textarea") return;
    switch (e.key) {
      case "Home":
        e.preventDefault();
        view.resetView();
        return;
      case "F":
      case "f":
        e.preventDefault();
        view.fitWhole();
        return;
      case "+":
      case "=":
        e.preventDefault();
        view.zoomStep(1);
        return;
      case "-":
        e.preventDefault();
        view.zoomStep(-1);
        return;
      case "ArrowLeft":
      case "ArrowRight":
      case "ArrowUp":
      case "ArrowDown": {
        e.preventDefault();
        const { w, h } = areaSize();
        const pan = view.getPan();
        // The view moves toward the arrow, so the map moves the other way.
        if (e.key === "ArrowRight") view.setPan(pan.x - w / 3, pan.y);
        else if (e.key === "ArrowLeft") view.setPan(pan.x + w / 3, pan.y);
        else if (e.key === "ArrowDown") view.setPan(pan.x, pan.y - h / 3);
        else view.setPan(pan.x, pan.y + h / 3);
        return;
      }
      default:
        return;
    }
  };

  // Wheel: a mouse notch is one level; small touchpad deltas pile up in `wheelAcc` (in notches) until they reach one.
  // Pinch (ctrl + wheel) piles up in `pinchAcc` (in px) and moves one level per PINCH_STEP. Wheel down zooms out.
  let wheelAcc = 0;
  let pinchAcc = 0;
  let lastWheelAt = -Infinity;
  const takeSteps = (acc: number): { steps: number; rest: number } => {
    const whole = Math.trunc(acc);
    const steps = Math.max(-WHEEL_MAX_STEPS, Math.min(WHEEL_MAX_STEPS, whole));
    // A clamped event drops its surplus rather than queueing more zoom for later.
    return { steps, rest: Math.abs(whole) > WHEEL_MAX_STEPS ? 0 : acc - whole };
  };
  const onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const t = now();
    if (t - lastWheelAt > WHEEL_IDLE_MS) {
      wheelAcc = 0;
      pinchAcc = 0;
    }
    lastWheelAt = t;
    let steps: number;
    if (e.ctrlKey) {
      if (pinchAcc !== 0 && Math.sign(pinchAcc) !== Math.sign(e.deltaY)) pinchAcc = 0;
      pinchAcc += e.deltaY;
      const r = takeSteps(pinchAcc / PINCH_STEP);
      pinchAcc = r.rest * PINCH_STEP;
      steps = r.steps;
    } else {
      const unit = e.deltaMode === 1 ? WHEEL_NOTCH_LINES : e.deltaMode === 2 ? 1 / WHEEL_MAX_STEPS : WHEEL_NOTCH_PX;
      const notches = e.deltaY / unit;
      // A change of direction drops the leftover, so a reversal responds at once.
      if (wheelAcc !== 0 && Math.sign(wheelAcc) !== Math.sign(notches)) wheelAcc = 0;
      wheelAcc += notches;
      const r = takeSteps(wheelAcc);
      wheelAcc = r.rest;
      steps = r.steps;
    }
    if (steps === 0) return;
    const rect = typeof canvas.getBoundingClientRect === "function" ? canvas.getBoundingClientRect() : null;
    const x = e.clientX - (rect?.left ?? 0);
    const y = e.clientY - (rect?.top ?? 0);
    const dir = steps < 0 ? 1 : -1; // deltaY < 0 (wheel up, pinch open) zooms in
    for (let i = 0; i < Math.abs(steps); i++) view.zoomStep(dir, x, y);
  };

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onCancel);
  canvas.addEventListener("lostpointercapture", onCancel);
  canvas.addEventListener("contextmenu", onContextMenu);
  canvas.addEventListener("wheel", onWheel as EventListener, { passive: false });
  doc.addEventListener("keydown", onKey as EventListener);

  return () => {
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onCancel);
    canvas.removeEventListener("lostpointercapture", onCancel);
    canvas.removeEventListener("contextmenu", onContextMenu);
    canvas.removeEventListener("wheel", onWheel as EventListener);
    doc.removeEventListener("keydown", onKey as EventListener);
    hold = null;
    canvas.style.cursor = "";
  };
}
