/** Turns pointer input on a map into grid calls. Never draws, never computes power. */
import type { EventBus, Puzzle } from "../core";
import type { Grid } from "../grid";
import type { MapRenderer } from "../render";
import { createSessionLog } from "./log";
import { intentFor, needsText, promptFor } from "./prompt";

export interface MapPlayView {
  hover: string | null;
  prompt: string | null;
  relightT: number | null;
}

export interface MapPlay {
  attach(canvas: HTMLCanvasElement): () => void;
  view(): MapPlayView;
  undo(): void;
  reset(): void;
  exportLog(): string;
  tick(dtSeconds: number): void;
  /** Same as a click on the element with this id (what attach's click handler calls). */
  click(id: string | null): void;
  /** Same as the pointer moving over the element with this id. */
  hoverAt(id: string | null): void;
}

export interface MapPlayOptions {
  /** Wall clock for the log; tests inject one. */
  now?: () => number;
}

/** How long a refused repair's shortfall stays in the prompt. */
export const NEEDS_FLASH_SECONDS = 1;

export function createMapPlay(
  puzzle: Puzzle,
  grid: Grid,
  renderer: MapRenderer,
  bus: EventBus,
  options: MapPlayOptions = {},
): MapPlay {
  const log = createSessionLog(options.now);
  let hover: string | null = null;
  let relightT: number | null = null;
  let flash: { text: string; left: number } | null = null;

  // The Relight starts at 0 when the job completes. Reset (the only way back) clears it.
  bus.on("job:completed", () => {
    relightT = 0;
  });

  const done = (): boolean => grid.state().complete;

  function click(id: string | null): void {
    if (done()) return;
    const intent = intentFor(puzzle, grid.state(), id);
    if (!intent) return;
    if (intent.kind === "breaker") {
      log.add({ kind: "throw-breaker", target: intent.id, ok: grid.throwBreaker(intent.id) });
    } else if (intent.kind === "switch") {
      log.add({ kind: "throw-switch", target: intent.id, ok: grid.throwSwitch(intent.id) });
    } else {
      const r = grid.repairAt(intent.id);
      if (r.ok) {
        log.add({ kind: "repair", target: intent.id, ok: true, fault: r.fault.id });
      } else {
        const entry = { kind: "repair-refused" as const, target: intent.id, ok: false, reason: r.reason };
        log.add(r.needs ? { ...entry, needs: r.needs } : entry);
        if (r.reason === "needs-parts" && r.needs) {
          flash = { text: needsText(r.needs.part, r.needs.count), left: NEEDS_FLASH_SECONDS };
        }
      }
    }
  }

  function undo(): void {
    if (done()) return; // the Relight can't be interrupted
    log.add({ kind: "undo", ok: grid.undo() });
  }

  function reset(): void {
    grid.reset();
    relightT = null;
    flash = null;
    log.add({ kind: "reset", ok: true });
  }

  return {
    attach(canvas) {
      const local = (e: MouseEvent): { x: number; y: number } => {
        const r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };
      const onMove = (e: PointerEvent): void => {
        const p = local(e);
        hover = renderer.hitTest(p.x, p.y);
      };
      const onLeave = (): void => {
        hover = null;
      };
      const onClick = (e: MouseEvent): void => {
        const p = local(e);
        hover = renderer.hitTest(p.x, p.y);
        click(hover);
      };
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerleave", onLeave);
      canvas.addEventListener("click", onClick);
      return () => {
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerleave", onLeave);
        canvas.removeEventListener("click", onClick);
      };
    },

    view() {
      const state = grid.state();
      return {
        hover,
        prompt: state.complete ? null : (flash?.text ?? promptFor(puzzle, state, hover)),
        relightT: state.complete ? (relightT ?? 0) : null,
      };
    },

    undo,
    reset,
    exportLog: () => log.toJSON(puzzle.id),

    tick(dt) {
      if (flash) {
        flash.left -= dt;
        if (flash.left <= 0) flash = null;
      }
      if (done()) relightT = (relightT ?? 0) + dt;
    },

    click,
    hoverAt(id) {
      hover = id;
    },
  };
}
