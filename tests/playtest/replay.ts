/**
 * Play one map's script through the real loadPuzzle -> createGrid -> createMapPlay chain and write its trace.
 * Clicks go through play.click(id), the path a player's click takes; time is one play.tick per click or wait.
 */
import { CHECK_CLICK_SECONDS, parseCheckMove } from "../../src/core";
import type { Puzzle } from "../../src/core";
import { createGrid } from "../../src/grid";
import type { GridState } from "../../src/grid";
import { createMapPlay } from "../../src/play";
import { createMapRenderer } from "../../src/render";
import type { MapRenderer } from "../../src/render";
import { StepCues, at3, relightCueList, relightTiming } from "./cues";
import { RecordingBus, fakeCanvas, fakeRenderer } from "./fakes";

export interface ReplayOptions {
  /** Use the real createMapRenderer on a fake 1280 x 720 canvas and draw frames (the draw smoke). */
  draw?: boolean;
  /** The README's Min clicks for this map, for the trace header. */
  min?: number | undefined;
  minFromNote?: boolean;
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
  draw: { frames: number; nonFinite: number; calls: number } | null;
}

const join = (xs: readonly string[], none = "-"): string => (xs.length ? xs.join(", ") : none);

export function clickCount(moves: readonly string[]): number {
  return moves.filter((m) => !m.startsWith("wait:")).length;
}

function stateLine(puzzle: Puzzle, s: GridState, prompt: string | null, cues: readonly string[]): string {
  const feeds = [...s.feeds].map(([id, f]) => `${id} ${f.load}/${f.capacity ?? "-"}${f.over ? " over" : ""}`);
  const blown = s.faults.filter((f) => f.kind === "blown-fuse").map((f) => f.at).sort();
  const parts: string[] = [
    `lit: ${join([...s.lit].sort())}`,
    `feeds: ${join(feeds)}`,
    `blown: ${join(blown)}`,
    `faults: ${join([...s.readableFaults].sort())}`,
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
  const fake = options.draw ? fakeCanvas() : null;
  const renderer: MapRenderer = fake ? createMapRenderer(fake.canvas, puzzle, { insets: { top: 220, bottom: 140 } }) : fakeRenderer();
  if (fake) bus.on("fuse:blown", (payload) => renderer.notify({ type: "fuse:blown", payload }));
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

  let gameTime = 0;
  let frames = 0;
  const frame = (relightT?: number): void => {
    if (!fake) return;
    const v = play.view();
    const overlay: { hover?: string | null; relightT?: number } = { hover: v.hover };
    const t = relightT ?? v.relightT;
    if (t !== null && t !== undefined) overlay.relightT = t;
    renderer.draw(grid.state(), overlay, gameTime);
    frames++;
  };

  const lines: string[] = [];
  lines.push(`# ${puzzle.id} | script ${clickCount(moves)} clicks | README min ${options.min ?? "?"}${options.minFromNote ? " (note)" : ""}`);
  lines.push(`start | ${stateLine(puzzle, grid.state(), play.view().prompt, stepCues())}`);
  frame();

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
      stop("scripts have no undo");
      break;
    }
    if (p.kind === "wait") {
      play.tick(p.seconds);
      gameTime += p.seconds;
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
      gameTime += CHECK_CLICK_SECONDS;
    }
    lines.push(`${step} ${move} | ${stateLine(puzzle, grid.state(), play.view().prompt, stepCues())}`);
    frame();
  }

  const state = grid.state();
  let locked: ReplayResult["locked"] = null;
  lines.push(`complete: ${state.complete}`);
  if (state.complete) {
    const view = play.view();
    lines.push(`actions: ${state.actions}, elapsed: ${at3(view.elapsed)} s`);
    const { plan, igniteAt, duration } = relightTiming(puzzle, state);
    lines.push(`relight lamps: ${join(plan.lampOrder.map((id, k) => `${id}@${at3(igniteAt[k] ?? NaN)}`))}`);
    lines.push(`relight duration: ${at3(duration)}`);
    lines.push(`relight cues: ${join(relightCueList(igniteAt, duration))}`);
    if (fake) for (const t of [0, duration / 2, duration + 0.5]) frame(t);

    // The Relight can't be interrupted (a Decided rule): every control and undo are ignored once the job is complete.
    const mark = bus.events.length;
    const before = signature(state);
    const targets = [
      ...puzzle.nodes.filter((n) => n.type === "breaker" || n.type === "switch" || n.type === "battery").map((n) => n.id),
      ...new Set(puzzle.faults.map((f) => f.at)),
    ];
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
    draw: fake ? { frames, nonFinite: fake.nonFinite(), calls: fake.calls() } : null,
  };
}
