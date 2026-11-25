/**
 * Play one script on a converted city puzzle through the real createGrid -> createMapPlay chain and write its trace.
 * Clicks go through play.click(id), the path a player's click takes; time is one play.tick per click or wait.
 */
import { CHECK_CLICK_SECONDS, parseCheckMove } from "../../src/core";
import type { Puzzle } from "../../src/core";
import { createGrid } from "../../src/grid";
import type { GridState } from "../../src/grid";
import { createMapPlay } from "../../src/play";
import type { MapRenderer } from "../../src/render3d/maprender";
import { StepCues, at3, relightCueList, relightTiming } from "./cues";
import { RecordingBus, fakeRenderer } from "./fakes";

export interface ReplayOptions {
  /** Node and line ids the conversion added (the puzzle's `hidden`, 081 S1): left out of the trace so scenery does not churn it. */
  hidden?: ReadonlySet<string>;
  /** Names the trace's header. Defaults to the puzzle's id. */
  label?: string;
}

export interface Failure {
  /** 1-based step of the move that went wrong. */
  step: number;
  move: string;
  message: string;
}

export interface ReplayResult {
  trace: string;
  complete: boolean;
  /** Moves that aren't `wait:` (a release counts). */
  clicks: number;
  /** Set when a move was invalid, was refused or did nothing, and the replay stopped there. */
  failure: Failure | null;
  /** Moves left unplayed because the job was already complete. */
  unplayed: number;
  locked: { ok: boolean; clicks: number; problems: string[] } | null;
}

const join = (xs: readonly string[], none = "-"): string => (xs.length ? xs.join(", ") : none);

export function clickCount(moves: readonly string[]): number {
  return moves.filter((m) => !m.startsWith("wait:")).length;
}

function stateLine(puzzle: Puzzle, s: GridState, prompt: string | null, cues: readonly string[], hidden: ReadonlySet<string>): string {
  const feeds = [...s.feeds].map(([id, f]) => `${id} ${f.load}/${f.capacity ?? "-"}${f.over ? " over" : ""}`);
  const blown = s.faults.filter((f) => f.kind === "blown-fuse" && !hidden.has(f.at)).map((f) => f.at).sort();
  const parts: string[] = [
    `lit: ${join([...s.lit].filter((id) => !hidden.has(id)).sort())}`,
    `feeds: ${join(feeds)}`,
    `blown: ${join(blown)}`,
    `faults: ${join([...s.readableFaults].filter((id) => !hidden.has(id)).sort())}`,
    `parts: ${join([...s.parts].sort())}`,
  ];
  if (puzzle.nodes.some((n) => n.type === "battery")) {
    const b = [...s.batteries]
      .sort(([a], [c]) => a.localeCompare(c))
      .map(([id, v]) => `${id} ${v.charge.toFixed(2)}/${v.capacity} ${v.released ? "released" : v.charging ? "charging" : "idle"}`);
    parts.push(`batteries: ${join(b)}`);
  }
  parts.push(`prompt: ${prompt ?? "-"}`);
  parts.push(`cues: ${join(cues)}`);
  return parts.join(" | ");
}

/** A comparable picture of what a stray click could change. */
function signature(s: GridState): string {
  const m = (x: ReadonlyMap<string, unknown>): string =>
    [...x]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${String(v)}`)
      .join(",");
  return [
    [...s.lit].sort().join(","),
    m(s.breakers),
    m(s.switches),
    [...s.parts].sort().join(","),
    s.faults.map((f) => f.id).sort().join(","),
    [...s.readableFaults].sort().join(","),
    s.complete,
  ].join("|");
}

export function replay(puzzle: Puzzle, moves: readonly string[], options: ReplayOptions = {}): ReplayResult {
  // A fresh bus, grid, play, tracker and clock for every call: two runs in one process must not share anything.
  const bus = new RecordingBus();
  const grid = createGrid(puzzle, bus);
  const hidden = options.hidden ?? new Set<string>();
  const renderer: MapRenderer = fakeRenderer();
  let clock = 0;
  const play = createMapPlay(puzzle, grid, renderer, bus, { now: () => (clock += 1000) });
  const cues = new StepCues();
  const ids = new Set([...puzzle.nodes.map((n) => n.id), ...puzzle.lines.map((l) => l.id)]);

  let seen = 0;
  /** The events recorded since the last call, as cue names and times. */
  const stepCues = (): string[] => {
    const fresh = bus.events.slice(seen);
    seen = bus.events.length;
    return cues.forEvents(fresh);
  };

  const lines: string[] = [];
  lines.push(`# ${options.label ?? puzzle.id} | script ${clickCount(moves)} clicks`);
  lines.push(`start | ${stateLine(puzzle, grid.state(), play.view().prompt, stepCues(), hidden)}`);

  let failure: Failure | null = null;
  let unplayed = 0;
  for (const [i, move] of moves.entries()) {
    const step = i + 1;
    if (grid.state().complete) {
      unplayed = moves.length - i;
      lines.push(`(the job was complete; ${unplayed} more move${unplayed === 1 ? "" : "s"} in the script not played)`);
      break;
    }
    const stop = (message: string): void => {
      failure = { step, move, message };
      lines.push(`${step} ${move} | STOPPED: ${message}`);
    };
    const p = parseCheckMove(move);
    if (!p) {
      stop("not a move (parseCheckMove returned null)");
      break;
    }
    if (p.kind === "undo") {
      // Undo adds no time (puzzles/SCHEMA.md, "Design checks").
      play.undo();
      if (play.lastEntry()?.ok === false) {
        stop("nothing to undo (or the job is already complete)");
        break;
      }
    } else if (p.kind === "wait") {
      play.tick(p.seconds);
    } else {
      if (!ids.has(p.id)) {
        stop(`no node, line or fault called "${p.id}" on this map`);
        break;
      }
      const before = play.lastEntry()?.step ?? 0;
      play.hoverAt(p.id);
      play.click(p.id);
      const entry = play.lastEntry();
      if (!entry || entry.step === before) {
        stop(`the click on ${p.id} did nothing (nothing there to click, or no current reaches the fault)`);
        break;
      }
      if (!entry.ok) {
        stop(`${p.id} was refused (${entry.reason ?? entry.kind})`);
        break;
      }
      play.tick(CHECK_CLICK_SECONDS);
    }
    lines.push(`${step} ${move} | ${stateLine(puzzle, grid.state(), play.view().prompt, stepCues(), hidden)}`);
  }

  const state = grid.state();
  let locked: ReplayResult["locked"] = null;
  lines.push(`complete: ${state.complete}`);
  if (state.complete) {
    const view = play.view();
    lines.push(`actions: ${state.actions}, elapsed: ${at3(view.elapsed)} s`);
    const { plan, igniteAt, duration } = relightTiming(puzzle, state);
    const shown = plan.lampOrder.map((id, k) => [id, igniteAt[k] ?? NaN] as const).filter(([id]) => !hidden.has(id));
    lines.push(`relight lamps: ${join(shown.map(([id, t]) => `${id}@${at3(t)}`))}`);
    lines.push(`relight duration: ${at3(duration)}`);
    lines.push(`relight cues: ${join(relightCueList(shown.map(([, t]) => t), duration))}`);

    // The Relight can't be interrupted (a Decided rule): every control and undo are ignored once the job is complete.
    const mark = bus.events.length;
    const before = signature(state);
    const targets = [
      ...puzzle.nodes.filter((n) => n.type === "breaker" || n.type === "switch" || n.type === "battery").map((n) => n.id),
      ...new Set(puzzle.faults.map((f) => f.at)),
    ].filter((id) => !hidden.has(id));
    for (const id of targets) play.click(id);
    play.undo();
    const problems: string[] = [];
    if (bus.events.length !== mark) problems.push(`${bus.events.length - mark} event(s) emitted: ${bus.events.slice(mark).map((e) => e.name).join(", ")}`);
    if (signature(grid.state()) !== before) problems.push("the grid state changed");
    locked = { ok: problems.length === 0, clicks: targets.length, problems };
    lines.push(
      problems.length === 0
        ? `locked: ignored ${targets.length} clicks and undo; no events; lit, breakers, switches, parts and faults unchanged`
        : `locked: BROKEN (${problems.join("; ")})`,
    );
  }

  return {
    trace: lines.join("\n") + "\n",
    complete: state.complete,
    clicks: clickCount(moves),
    failure,
    unplayed,
    locked,
  };
}
