// Entry point: loads the map files, builds grid -> renderer -> play -> ui for one map, and runs the frame loop.
// No game rules here: each layer owns its own. Picking another map rebuilds the stack.
import { EventBus, puzzleFeeds, type CityPuzzleView, type LoadPreview, type Puzzle } from "./core";
import { createGrid, type Grid, type GridState } from "./grid";
import type { MapBlockers, MapCentre, MapPanView, MapPlaces, MapRenderer } from "./render3d/maprender";
import { planRelight } from "./render3d/relightplan";
import { attachPan, createMapPlay, type MapPlay } from "./play";
import { createAudio } from "./audio";
import { mountUI, restoreAudio, type UI } from "./ui";
import { brownoutNotices, nextMap, noticeFor, placeHighlight, splashDue, startScreen, type StorageLike } from "./ui/logic";
import { clearProgress, loadProgress, recordWin, saveProgress, stageList, stageNumber, type Progress } from "./ui/progress";
import { mountScreens, type Screens } from "./ui/screens";
import { measureBlockers } from "./ui/blockers";
import { collectCityMaps, type CityMapEntry } from "./ui/maps";
import { assetGalleryRequested } from "./ui/assetgallerylogic";
import { pageView } from "./ui/view3d";
import { relightCues } from "./ui/relightcues";
import { isLoadKey, previewFor, previewKey } from "./ui/preview";

/** This browser's localStorage, or null where the browser refuses it (ticket 081 T3). */
function browserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The local calendar date as `YYYY-MM-DD`, for the first win's date (ticket 081 T2). */
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// The puzzle page. It is a function so the dev-only asset gallery (at the end of this file) can take the page instead, with no puzzle, HUD or map renderer made.
function startPuzzle(): void {
const files = import.meta.glob("../puzzles/city/**/*.city.json", { eager: true, import: "default" }) as Record<string, unknown>;
const { entries, problems } = collectCityMaps(files);
for (const problem of problems) console.warn(`[puzzles] skipped ${problem}`);

const canvas = document.getElementById("panel");
const uiRoot = document.getElementById("ui");
const screensRoot = document.getElementById("screens");
if (!(canvas instanceof HTMLCanvasElement) || !uiRoot || !(screensRoot instanceof HTMLElement)) throw new Error("index.html must have #panel, #ui and #screens");

// The city view (ticket 081 E2, U2) is built by `src/render3d`, which only the dev server builds (Synty licence, 16 Nov 2026). A production build says so and stops here.
if (!import.meta.env.DEV) {
  uiRoot.textContent = "This prototype plays in `npm run dev`. The city view is not in this build.";
  return;
}

// One sound engine for the whole session (ticket 019). It starts silent until the first click; each map's
// open() attaches it to that map's bus, and the map's detach silences it again.
const audio = createAudio();
restoreAudio(audio);

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
  uiRoot.textContent = "No city puzzles found in puzzles/city/.";
} else {
  const byKey = new Map<string, CityMapEntry>(entries.map((m) => [m.key, m]));
  const puzzles = entries.map((m) => ({ id: m.key, name: m.name, locked: m.locked }));

  // Progress (ticket 081 T2, T-Q4): one record per puzzle id in this browser, read at load. Storage that is missing or refused reads as none.
  const storage = browserStorage();
  let progress: Progress = loadProgress(storage);
  // The splash, title and stage select (ticket 081 T3), up until a stage opens. Null once play has started.
  let screens: Screens | null = null;

  interface Session {
    grid: Grid;
    renderer: MapRenderer & MapPanView & MapPlaces & MapBlockers;
    play: MapPlay;
    ui: UI;
    puzzle: Puzzle;
    /** 081 U3: the converted puzzle's hidden ids (scenery lamps), which make no Relight sound. */
    hidden: readonly string[];
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
    /** 081 V4: computes the load preview for this state (once per state change) and hands it to the renderer. */
    refreshPreview: (state: GridState, relighting: boolean) => void;
    detach: () => void;
  }
  let session: Session | null = null;

  // Every puzzle is a city puzzle on the 3D city (ticket 081 U2, full 3D). A `city=tiles` or `city=plan` route is drawn with no city option.
  const shown = pageView(location.search);
  // The 3D module (ticket 037) loads once, at start. Nothing is mounted before it is here.
  let r3d: typeof import("./render3d") | null = null;

  const urlFor = (id: string): string => {
    const url = new URL(location.href);
    url.searchParams.set("puzzle", id);
    return url.pathname + url.search;
  };

  /** A message that stands in for the page (a city puzzle that does not open, or no city files): in the HUD's place and in the console. */
  function showProblem(message: string): void {
    console.error(`[puzzles] ${message}`);
    (uiRoot as HTMLElement).textContent = message;
  }

  function open(id: string): void {
    session?.detach();
    session = null;
    const entry = byKey.get(id);
    if (!entry || !r3d) return;

    // The city view (ticket 081 E2): the plan is built once per city, and the puzzle plays on its converted form.
    let view: CityPuzzleView;
    try {
      view = r3d.loadCityView(entry.city);
    } catch (err) {
      showProblem(err instanceof Error ? err.message : String(err));
      return;
    }
    const puzzle = view.converted.puzzle;
    const hidden = view.converted.hidden ?? [];
    const hiddenIds = new Set(hidden);

    const bus = new EventBus();
    const grid = createGrid(puzzle, bus);
    const detachAudio = audio.attach(bus);
    const rendererOpts = { insets: { top: hudTopInset(), bottom: bottomInset() } };
    const renderer: MapRenderer & MapPanView & MapPlaces & MapCentre & MapBlockers & { dispose?(): void; setLoadPreview?(p: LoadPreview | null): void } = r3d.createMapRenderer3d(
      canvas as HTMLCanvasElement,
      puzzle,
      shown === "play" ? { ...rendererOpts, city: view } : rendererOpts,
    );
    // 081 V4: the setter is optional in the renderer's type (V3). The city play view has it; a debug route (`city=plan`, `city=tiles`, the sheet) draws no puzzle and has none.
    // A play page without it stops here, loudly, rather than opening a puzzle with no numbers.
    const setNumbers = renderer.setLoadPreview;
    if (shown === "play" && typeof setNumbers !== "function") throw new Error("the city play renderer has no setLoadPreview (ticket 081 V3)");
    const play = createMapPlay(puzzle, grid, renderer, bus);
    const detachPlay = play.attach(canvas as HTMLCanvasElement);
    const detachPan = attachPan(canvas as HTMLCanvasElement, renderer);
    const feeds = puzzleFeeds(puzzle);
    // The open map's lamp node ids (ticket 026 B): a hit on one of these highlights that lamp, street lights included.
    const lampIds = new Set(puzzle.nodes.filter((n) => n.type === "lamp" && !hiddenIds.has(n.id)).map((n) => n.id));

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

    // The load preview (ticket 081 V4). `known` is the faults the player has read in this play: Reset clears it, Undo keeps it (V-Q6). The numbers are on when the map opens;
    // V hides and shows them for this open only (not saved). Hidden, the renderer gets null; the fuse and feed labels are the renderer's own and stay.
    let known: ReadonlySet<string> = new Set();
    let numbersOn = true;
    let current: LoadPreview | null = null;
    let shownFor: { state: GridState; relighting: boolean } | null = null;
    // The key of the state the numbers were computed for: a state that differs only by time (no flip, no move) keeps them (ticket 081 TB1b3).
    let shownKey: string | null = null;
    const drawNumbers = (): void => {
      setNumbers?.call(renderer, numbersOn ? current : null);
    };
    const refreshPreview = (state: GridState, relighting: boolean): void => {
      if (shownFor !== null && shownFor.state === state && shownFor.relighting === relighting) return;
      shownFor = { state, relighting };
      const key = previewKey(state, relighting);
      if (key === shownKey) return;
      shownKey = key;
      const step = previewFor(puzzle, state, known, relighting);
      known = step.known;
      current = step.preview;
      drawNumbers();
    };
    const onLoadKey = (e: KeyboardEvent): void => {
      const tagName = e.target instanceof Element ? e.target.tagName : undefined;
      if (!isLoadKey({ key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, altKey: e.altKey, repeat: e.repeat, tagName })) return;
      numbersOn = !numbersOn;
      drawNumbers();
      ui.showLoadNumbers(numbersOn);
    };
    document.addEventListener("keydown", onLoadKey);
    const offLoadReset = bus.on("play:click", (e) => {
      if (e.kind !== "reset") return;
      known = new Set();
      shownFor = null;
      shownKey = null;
    });
    refreshPreview(grid.state(), false);

    // Event notices: the bus says what broke; a refused relay throw has no event, so it is read from the
    // play log after each click (the play layer's own click listener, attached above, runs first).
    const relays = new Set(puzzle.nodes.filter((n) => n.type === "switch" && n.relay).map((n) => n.id));
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
      renderer.dispose?.();
      (canvas as HTMLCanvasElement).removeEventListener("pointermove", onCanvasMove);
      (canvas as HTMLCanvasElement).removeEventListener("pointerleave", onCanvasLeave);
      (canvas as HTMLCanvasElement).removeEventListener("click", onPanelClick);
      document.removeEventListener("keydown", onLoadKey);
      offLoadReset();
      for (const off of offs) off();
    };
    session = {
      grid,
      renderer,
      play,
      ui,
      puzzle,
      hidden,
      highlight: () => highlighted,
      key: id,
      name: entry.name,
      relightStarted: false,
      relightDuration: 0,
      winShown: false,
      centred: false,
      refreshPreview,
      detach,
    };
  }

  /**
   * The splash, the title and the stage select (ticket 081 T3), on the title backdrop of stage 01 (T1). Returns false when stage 01 is
   * not there or its view will not load, so the page opens its first puzzle as it did before.
   */
  function startScreens(m: typeof import("./render3d")): boolean {
    const stageOne = entries.find((e) => !e.locked && stageNumber(e.key) === 1);
    if (!stageOne) return false;
    let view: CityPuzzleView;
    try {
      view = m.loadCityView(stageOne.city);
    } catch (err) {
      console.error(`[puzzles] the title needs stage 01: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
    const backdrop = m.createTitleView(canvas as HTMLCanvasElement, view, { dpr: window.devicePixelRatio || 1, search: location.search });
    (uiRoot as HTMLElement).hidden = true;
    screens = mountScreens({
      root: screensRoot as HTMLElement,
      canvas: canvas as HTMLCanvasElement,
      backdrop,
      stages: () => stageList(puzzles, progress),
      onPlay: (id) => playStage(id),
      onClear: () => {
        clearProgress(storage);
        progress = new Map();
      },
    });
    return true;
  }

  /** Play a stage from the select (ticket 081 T3). The URL stays as it is, so a reload shows the splash again. */
  function playStage(id: string): void {
    screens?.close();
    screens = null;
    (uiRoot as HTMLElement).hidden = false;
    open(id);
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
  const first = requested !== null && byKey.has(requested) ? requested : (entries[0] as CityMapEntry).key;
  void import("./render3d").then((m) => {
    r3d = m;
    if (m.planHidesHud(location.search, import.meta.env.DEV)) uiRoot.hidden = true;
    // A plain address opens on the splash (ticket 081 T3); a dev address (`puzzle=`, `city=`, `title=`, `assets=`) plays straight away, as before.
    if (startScreen(location.search, import.meta.env.DEV) === "splash" && startScreens(m)) return;
    history.replaceState(null, "", urlFor(first));
    open(first);
  });

  window.addEventListener("resize", () => {
    if (!session) return;
    session.renderer.setInsets({ top: hudTopInset(), bottom: bottomInset() });
    session.renderer.resize();
    session.renderer.resetView();
  });

  let last = performance.now();
  function frame(now: number): void {
    screens?.frame(now);
    const s = session;
    if (s) {
      const dt = Math.min(0.1, (now - last) / 1000);
      s.play.tick(dt);
      const view = s.play.view();
      const state = s.grid.state();
      s.refreshPreview(state, view.relightT !== null);
      // The Relight starts on the frame play first reports it (the job completing sets relightT to 0).
      if (view.relightT === null) {
        s.relightStarted = false;
        s.winShown = false;
      } else if (!s.relightStarted) {
        s.relightStarted = true;
        // A numbered stage's win is kept when the job completes (ticket 081 T3), so leaving during the Relight loses nothing. Only a better run changes a best (T2).
        if (stageNumber(s.key) !== null) {
          progress = recordWin(progress, s.key, state.actions, view.elapsed, todayIso());
          saveProgress(storage, progress);
        }
        const cues = relightCues(planRelight(s.puzzle, state), s.puzzle.nodes.map((n) => n.id), s.hidden);
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
}

// Dev only (ticket 074, section C): the asset gallery page at `/?assets=<pack>`. The page is taken instead of a puzzle: `startPuzzle()` is not called, so no puzzle, HUD or map
// renderer is made. The gallery's own code loads only here. `npm run build` is built with import.meta.env.DEV false, so this branch and both its imports are dropped.
if (import.meta.env.DEV && assetGalleryRequested(location.search) !== null) {
  const app = document.getElementById("app");
  if (app) app.hidden = true;
  void Promise.all([import("./render3d"), import("./ui/assetgallery"), import("./render3d/componentmodels")]).then(([r, page, models]) => {
    page.mountAssetGallery(document.body, (c) => r.createAssetGallery(c), location.search, models.COMPONENT_MODELS);
  });
} else {
  startPuzzle();
}
