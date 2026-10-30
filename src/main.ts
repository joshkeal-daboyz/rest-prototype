// Entry point: loads the map files, builds grid -> renderer -> play -> ui for one map, and runs the frame loop.
// No game rules here: each layer owns its own. Picking another map rebuilds the stack.
import { EventBus, puzzleFeeds, type Puzzle } from "./core";
import { createGrid, type Grid, type GridState } from "./grid";
import { createMapRenderer, planRelight, type MapBlockers, type MapPanView, type MapPlaces, type MapRenderer } from "./render";
import { attachPan, createMapPlay, type MapPlay } from "./play";
import { createAudio } from "./audio";
import { mountUI, restoreAudio, type UI } from "./ui";
import { brownoutNotices, nextMap, noticeFor, placeHighlight, splashDue } from "./ui/logic";
import { measureBlockers } from "./ui/blockers";
import { collectMaps, type MapEntry } from "./ui/maps";

const files = import.meta.glob("../puzzles/**/*.json", { eager: true, import: "default" }) as Record<string, unknown>;
const { entries, problems } = collectMaps(files);
for (const problem of problems) console.warn(`[puzzles] skipped ${problem}`);

const canvas = document.getElementById("panel");
const uiRoot = document.getElementById("ui");
if (!(canvas instanceof HTMLCanvasElement) || !uiRoot) throw new Error("index.html must have #panel and #ui");

// One sound engine for the whole session (ticket 019). It starts silent until the first click; each map's
// open() attaches it to that map's bus, and the map's detach silences it again.
const audio = createAudio();
restoreAudio(audio);

/** The Relight's sound timing, from the same plan the renderer draws: each lit lamp's ignition time and the cascade's length. */
function relightCues(puzzle: Puzzle, state: GridState): { igniteAt: number[]; duration: number } {
  const plan = planRelight(puzzle, state);
  const nodeIndex = new Map(puzzle.nodes.map((n, i) => [n.id, i] as const));
  const igniteAt = plan.lampOrder.map((id) => plan.nodeArrive[nodeIndex.get(id) ?? 0] ?? 0);
  return { igniteAt, duration: plan.duration };
}

/** Top inset for the map fit: the lower edge of the tallest HUD column (both sit at the top), plus a margin. 0 before any HUD exists. */
function hudTopInset(): number {
  const huds = (uiRoot as HTMLElement).querySelectorAll<HTMLElement>(".hud");
  if (huds.length === 0) return 0;
  const canvasTop = (canvas as HTMLCanvasElement).getBoundingClientRect().top;
  let bottom = 0;
  huds.forEach((hud) => {
    bottom = Math.max(bottom, hud.getBoundingClientRect().bottom);
  });
  return Math.max(0, Math.ceil(bottom - canvasTop + 8));
}

/**
 * Bottom inset for the map fit (tickets 021, 030): the larger of the bottom-corner panels' reserves, the parts panel
 * (bottom left) and the sound dock (bottom right). Each reserves its distance from the canvas bottom to its top, plus 8 px. 0 before any exists.
 */
function bottomInset(): number {
  const canvasBottom = (canvas as HTMLCanvasElement).getBoundingClientRect().bottom;
  let reserve = 0;
  for (const selector of [".inventory", ".sound-dock"]) {
    const panel = (uiRoot as HTMLElement).querySelector<HTMLElement>(selector);
    if (panel) reserve = Math.max(reserve, canvasBottom - panel.getBoundingClientRect().top + 8);
  }
  return Math.max(0, Math.ceil(reserve));
}

if (entries.length === 0) {
  uiRoot.textContent = "No maps found in puzzles/.";
} else {
  const byKey = new Map<string, MapEntry>(entries.map((m) => [m.key, m]));
  const puzzles = entries.map((m) => ({ id: m.key, name: m.name, locked: m.locked }));

  interface Session {
    grid: Grid;
    renderer: MapRenderer & MapPanView & MapPlaces & MapBlockers;
    play: MapPlay;
    ui: UI;
    puzzle: Puzzle;
    /** The lamp whose place and list entry are picked out (ticket 024 B), or null. */
    highlight: () => string | null;
    /** The picker key (the id, or `locked/<id>`) and the display name, for the win splash. */
    key: string;
    name: string;
    /** True from the frame the Relight started until play reports it gone (a reset). */
    relightStarted: boolean;
    /** The Relight's duration in seconds, set when it starts (019's cues). The splash waits WIN_SPLASH_DELAY past it. */
    relightDuration: number;
    /** True once this win's splash has been shown; cleared when the Relight goes (a reset), so the next win shows it. */
    winShown: boolean;
    /** False until the first frame after ui.update() has filled the HUD; then the insets are measured and the view centred, once (ticket 022). */
    centred: boolean;
    detach: () => void;
  }
  let session: Session | null = null;

  const urlFor = (id: string): string => {
    const url = new URL(location.href);
    url.searchParams.set("puzzle", id);
    return url.pathname + url.search;
  };

  function open(id: string): void {
    session?.detach();
    const entry = byKey.get(id);
    if (!entry) return;

    const bus = new EventBus();
    const grid = createGrid(entry.puzzle, bus);
    const detachAudio = audio.attach(bus);
    const renderer = createMapRenderer(canvas as HTMLCanvasElement, entry.puzzle, {
      insets: { top: hudTopInset(), bottom: bottomInset() },
    });
    const play = createMapPlay(entry.puzzle, grid, renderer, bus);
    const detachPlay = play.attach(canvas as HTMLCanvasElement);
    const detachPan = attachPan(canvas as HTMLCanvasElement, renderer);
    const feeds = puzzleFeeds(entry.puzzle);
    // The open map's lamp node ids (ticket 026 B): a hit on one of these highlights that lamp, street lights included.
    const lampIds = new Set(entry.puzzle.nodes.filter((n) => n.type === "lamp").map((n) => n.id));

    // The list-to-map link (ticket 024 B, 026 B). A "Priests want lit" entry (hover or focus) and the pointer over a
    // lamp or its place both pick out one lamp; the last one to happen wins. Any other circuit element picks out none.
    let highlighted: string | null = null;
    const setHighlight = (lampId: string | null): void => {
      if (lampId === highlighted) return;
      highlighted = lampId;
      ui.highlight(lampId);
    };
    const onCanvasMove = (e: PointerEvent): void => {
      const r = (canvas as HTMLCanvasElement).getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      setHighlight(placeHighlight(renderer.hitTest(x, y), lampIds, renderer.placeAt(x, y)));
    };
    const onCanvasLeave = (): void => setHighlight(null);
    (canvas as HTMLCanvasElement).addEventListener("pointermove", onCanvasMove);
    (canvas as HTMLCanvasElement).addEventListener("pointerleave", onCanvasLeave);

    const ui = mountUI(uiRoot as HTMLElement, {
      grid,
      play,
      puzzles,
      current: id,
      feeds,
      audio,
      onHighlight: (lampId) => setHighlight(lampId),
      // A "Priests want lit" entry was clicked or Entered (ticket 027 C): bring that lamp to the centre.
      onShow: (lampId) => {
        renderer.centreOn(lampId);
      },
      onPick: (next) => {
        history.replaceState(null, "", urlFor(next));
        open(next);
      },
    });
    // The HUD and the parts panel exist only after mountUI, so measure again now that they are in place.
    renderer.setInsets({ top: hudTopInset(), bottom: bottomInset() });

    // Event notices: the bus says what broke; a refused relay throw has no event, so it is read from the
    // play log after each click (the play layer's own click listener, attached above, runs first).
    const relays = new Set(entry.puzzle.nodes.filter((n) => n.type === "switch" && n.relay).map((n) => n.id));
    const offs = [
      // Reset re-measures the HUD and re-centres the view (ticket 022). Undo does not.
      bus.on("play:click", (e) => {
        if (e.kind !== "reset") return;
        renderer.setInsets({ top: hudTopInset(), bottom: bottomInset() });
        renderer.resetView();
      }),
      bus.on("fuse:blown", (payload) => renderer.notify({ type: "fuse:blown", payload })),
      bus.on("fuse:blown", (e) => {
        const text = noticeFor({ kind: "fuse:blown", load: e.load, rating: e.rating });
        if (text) ui.notify(text);
      }),
      bus.on("grid:brownout", (e) => {
        if (e.over === undefined) {
          const text = noticeFor({ kind: "grid:brownout", brownout: e.brownout, load: e.load, capacity: e.capacity });
          if (text) ui.notify(text);
          return;
        }
        // Multi-feed map: one notice per over feed, named (ticket 015 D).
        for (const text of brownoutNotices(e.brownout, e.over, feeds, grid.state().feeds)) ui.notify(text);
      }),
      bus.on("battery:flat", (e) => {
        const text = noticeFor({ kind: "battery:flat", stopped: e.stopped });
        if (text) ui.notify(text);
      }),
    ];
    let seenStep = 0;
    const onPanelClick = (): void => {
      const last = play.lastEntry();
      if (!last || last.step <= seenStep) return;
      seenStep = last.step;
      const text = noticeFor({ kind: "relay-refused", entry: last, relays });
      if (text) ui.notify(text);
    };
    (canvas as HTMLCanvasElement).addEventListener("click", onPanelClick);

    const detach = (): void => {
      detachAudio();
      detachPlay();
      detachPan();
      (canvas as HTMLCanvasElement).removeEventListener("pointermove", onCanvasMove);
      (canvas as HTMLCanvasElement).removeEventListener("pointerleave", onCanvasLeave);
      (canvas as HTMLCanvasElement).removeEventListener("click", onPanelClick);
      for (const off of offs) off();
    };
    session = {
      grid,
      renderer,
      play,
      ui,
      puzzle: entry.puzzle,
      highlight: () => highlighted,
      key: id,
      name: entry.name,
      relightStarted: false,
      relightDuration: 0,
      winShown: false,
      centred: false,
      detach,
    };
    history.replaceState(null, "", urlFor(id));
  }

  /** The win splash for the session's map: its clock and moves, and Next on the picker's order (the same path as picking). */
  function showWin(s: Session, seconds: number, moves: number): void {
    const next = nextMap(puzzles, s.key);
    s.ui.showWin({
      name: s.name,
      seconds,
      moves,
      next: next ? { id: next.id, name: next.name } : null,
      onNext: () => {
        if (!next) return;
        history.replaceState(null, "", urlFor(next.id));
        open(next.id);
      },
    });
  }

  const requested = new URLSearchParams(location.search).get("puzzle");
  open(requested !== null && byKey.has(requested) ? requested : (entries[0] as MapEntry).key);

  window.addEventListener("resize", () => {
    if (!session) return;
    session.renderer.setInsets({ top: hudTopInset(), bottom: bottomInset() });
    session.renderer.resize();
    session.renderer.resetView();
  });

  let last = performance.now();
  function frame(now: number): void {
    const s = session;
    if (s) {
      const dt = Math.min(0.1, (now - last) / 1000);
      s.play.tick(dt);
      const view = s.play.view();
      const state = s.grid.state();
      // The Relight starts on the frame play first reports it (the job completing sets relightT to 0).
      if (view.relightT === null) {
        s.relightStarted = false;
        s.winShown = false;
      } else if (!s.relightStarted) {
        s.relightStarted = true;
        const cues = relightCues(s.puzzle, state);
        s.relightDuration = cues.duration;
        audio.relight(cues.igniteAt, cues.duration);
      }
      // The win splash, once per win, after the Relight has run its course (ticket 020 B).
      if (!s.winShown && splashDue(view.relightT, s.relightDuration)) {
        s.winShown = true;
        showWin(s, view.elapsed, state.actions);
      }
      audio.update(state, dt, now / 1000);
      const overlay: { hover?: string | null; relightT?: number; highlight?: string | null } = {
        hover: view.hover,
        highlight: s.highlight(),
      };
      if (view.relightT !== null) overlay.relightT = view.relightT;
      s.renderer.draw(state, overlay, now / 1000);
      s.ui.update();
      s.renderer.setBlockers(measureBlockers(uiRoot as HTMLElement, canvas as HTMLCanvasElement));
      // The HUD is filled by the first ui.update(), so measure the insets and centre the map once, now.
      if (!s.centred) {
        s.centred = true;
        s.renderer.setInsets({ top: hudTopInset(), bottom: bottomInset() });
        s.renderer.resetView();
      }
    }
    last = now;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
