// Pointer input for the map view (ticket 022): right-drag pans, the context menu is suppressed on the canvas,
// Home and a double right-click put the view back in the centre. View-only: no grid call, no log, no bus event.
import type { MapPanView } from "../render";

/** Two still right presses within this many ms re-centre the view. */
export const RIGHT_DOUBLE_MS = 400;
/** A right press that moves less than this many px before release counts as a click, not a drag. */
export const DRAG_SLOP = 4;

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

  const onKey = (e: KeyboardEvent): void => {
    if (e.key !== "Home") return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const tag = (e.target as { tagName?: string } | null)?.tagName?.toLowerCase();
    if (tag === "select" || tag === "input" || tag === "textarea") return;
    e.preventDefault();
    view.resetView();
  };

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onCancel);
  canvas.addEventListener("lostpointercapture", onCancel);
  canvas.addEventListener("contextmenu", onContextMenu);
  doc.addEventListener("keydown", onKey as EventListener);

  return () => {
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onCancel);
    canvas.removeEventListener("lostpointercapture", onCancel);
    canvas.removeEventListener("contextmenu", onContextMenu);
    doc.removeEventListener("keydown", onKey as EventListener);
    hold = null;
    canvas.style.cursor = "";
  };
}
