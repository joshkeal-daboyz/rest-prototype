// Entry point: loads the map files, builds grid -> renderer -> play -> ui for one map, and runs the frame loop.
// No game rules here: each layer owns its own. Picking another map rebuilds the stack.
import { EventBus } from "./core";
import { createGrid, type Grid } from "./grid";
import { createMapRenderer, type MapRenderer } from "./render";
import { createMapPlay, type LogEntry, type MapPlay } from "./play";
import { mountUI, type UI } from "./ui";
import { noticeFor } from "./ui/logic";
import { collectMaps, type MapEntry } from "./ui/maps";

const files = import.meta.glob("../puzzles/**/*.json", { eager: true, import: "default" }) as Record<string, unknown>;
const { entries, problems } = collectMaps(files);
for (const problem of problems) console.warn(`[puzzles] skipped ${problem}`);

const canvas = document.getElementById("panel");
const uiRoot = document.getElementById("ui");
if (!(canvas instanceof HTMLCanvasElement) || !uiRoot) throw new Error("index.html must have #panel and #ui");

if (entries.length === 0) {
  uiRoot.textContent = "No maps found in puzzles/.";
} else {
  const byKey = new Map<string, MapEntry>(entries.map((m) => [m.key, m]));
  const puzzles = entries.map((m) => ({ id: m.key, name: m.name, locked: m.locked }));

  interface Session {
    grid: Grid;
    renderer: MapRenderer;
    play: MapPlay;
    ui: UI;
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
    const renderer = createMapRenderer(canvas as HTMLCanvasElement, entry.puzzle);
    const play = createMapPlay(entry.puzzle, grid, renderer, bus);
    const detachPlay = play.attach(canvas as HTMLCanvasElement);
    const ui = mountUI(uiRoot as HTMLElement, {
      grid,
      play,
      puzzles,
      current: id,
      onPick: (next) => {
        history.replaceState(null, "", urlFor(next));
        open(next);
      },
    });

    // Event notices: the bus says what broke; a refused relay throw has no event, so it is read from the
    // play log after each click (the play layer's own click listener, attached above, runs first).
    const relays = new Set(entry.puzzle.nodes.filter((n) => n.type === "switch" && n.relay).map((n) => n.id));
    const offs = [
      bus.on("fuse:blown", (e) => {
        const text = noticeFor({ kind: "fuse:blown", load: e.load, rating: e.rating });
        if (text) ui.notify(text);
      }),
      bus.on("grid:brownout", (e) => {
        const text = noticeFor({ kind: "grid:brownout", brownout: e.brownout, load: e.load, capacity: e.capacity });
        if (text) ui.notify(text);
      }),
      bus.on("battery:flat", (e) => {
        const text = noticeFor({ kind: "battery:flat", stopped: e.stopped });
        if (text) ui.notify(text);
      }),
    ];
    let seenStep = 0;
    const onPanelClick = (): void => {
      const { entries } = JSON.parse(play.exportLog()) as { entries: LogEntry[] };
      const last = entries[entries.length - 1];
      if (!last || last.step <= seenStep) return;
      seenStep = last.step;
      const text = noticeFor({ kind: "relay-refused", entry: last, relays });
      if (text) ui.notify(text);
    };
    (canvas as HTMLCanvasElement).addEventListener("click", onPanelClick);

    const detach = (): void => {
      detachPlay();
      (canvas as HTMLCanvasElement).removeEventListener("click", onPanelClick);
      for (const off of offs) off();
    };
    session = { grid, renderer, play, ui, detach };
    history.replaceState(null, "", urlFor(id));
  }

  const requested = new URLSearchParams(location.search).get("puzzle");
  open(requested !== null && byKey.has(requested) ? requested : (entries[0] as MapEntry).key);

  window.addEventListener("resize", () => session?.renderer.resize());

  let last = performance.now();
  function frame(now: number): void {
    const s = session;
    if (s) {
      const dt = Math.min(0.1, (now - last) / 1000);
      s.play.tick(dt);
      const view = s.play.view();
      const overlay: { hover?: string | null; relightT?: number } = { hover: view.hover };
      if (view.relightT !== null) overlay.relightT = view.relightT;
      s.renderer.draw(s.grid.state(), overlay, now / 1000);
      s.ui.update();
    }
    last = now;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
