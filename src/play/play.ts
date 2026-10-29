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
  /** Play time in seconds: ticks since the map opened or was last reset, stopped when the job completed. */
  elapsed: number;
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
  let gameTime = 0;
  let elapsed = 0;
  let flash: { text: string; left: number } | null = null;

  // The Relight starts at 0 when the job completes. Reset (the only way back) clears it.
  bus.on("job:completed", () => {
    relightT = 0;
  });

  // A click-stop also emits battery:flat (stopped: true); the click already logged battery-stop.
  bus.on("battery:flat", (e) => {
    if (e.stopped) return;
    log.add({ kind: "battery-flat", target: e.nodeId, ok: true, stopped: false, gameTime });
  });

  const done = (): boolean => grid.state().complete;

  function click(id: string | null): void {
    if (done()) return;
    const intent = intentFor(puzzle, grid.state(), id);
    if (!intent) return;
    const refused = (): void => bus.emit("play:click", { kind: "refused", target: intent.id });
    if (intent.kind === "breaker") {
      const ok = grid.throwBreaker(intent.id);
      log.add({ kind: "throw-breaker", target: intent.id, ok });
      if (!ok) refused();
    } else if (intent.kind === "switch") {
      const ok = grid.throwSwitch(intent.id);
      log.add({ kind: "throw-switch", target: intent.id, ok });
      if (!ok) refused();
    } else if (intent.kind === "battery") {
      const wasReleased = grid.state().batteries.get(intent.id)?.released ?? false;
      const ok = grid.release(intent.id);
      log.add({ kind: wasReleased ? "battery-stop" : "battery-release", target: intent.id, ok, gameTime });
      if (!ok) refused();
    } else {
      const r = grid.repairAt(intent.id);
      if (r.ok) {
        log.add({ kind: "repair", target: intent.id, ok: true, fault: r.fault.id });
      } else {
        const entry = { kind: "repair-refused" as const, target: intent.id, ok: false, reason: r.reason };
        log.add(r.needs ? { ...entry, needs: r.needs } : entry);
        refused();
        if (r.reason === "needs-parts" && r.needs) {
          flash = { text: needsText(r.needs.part, r.needs.count), left: NEEDS_FLASH_SECONDS };
        }
      }
    }
  }

  function undo(): void {
    if (done()) return; // the Relight can't be interrupted
    log.add({ kind: "undo", ok: grid.undo() });
    bus.emit("play:click", { kind: "undo" });
  }

  function reset(): void {
    grid.reset();
    relightT = null;
    elapsed = 0;
    flash = null;
    log.add({ kind: "reset", ok: true });
    bus.emit("play:click", { kind: "reset" });
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
        elapsed,
      };
    },

    undo,
    reset,
    exportLog: () => log.toJSON(puzzle.id),

    tick(dt) {
      if (dt > 0 && !done()) {
        gameTime += dt;
        elapsed += dt; // counted before advance: a win on this tick keeps its dt
        grid.advance(dt);
      }
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
