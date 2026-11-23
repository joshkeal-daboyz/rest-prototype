/**
 * The asset gallery page (ticket 074, section C): the DOM half. It draws the header (a tab per pack, its store link, its failures, search, the use and flag filters, the paging),
 * one card per piece on the page, and the inspect panel with the large canvas. The page's state lives in the address (`history.replaceState`), built and read by
 * `assetgallerylogic.ts`. The renderer is handed in as `make(canvas)`: this module imports no three and no src/render3d/, so the page is plain DOM.
 *
 * Input: the page's own buttons, fields and links, card clicks (not on text, a link or a button), and Esc and the arrow keys while the inspect panel is open. Dev only: `main.ts`
 * reaches this module behind `import.meta.env.DEV`. Nothing from the packs is written anywhere: thumbnails are in-memory object URLs, Copy puts text on the clipboard, store links open in a new tab.
 */

import {
  ASSET_GALLERY_PAGE_SIZE,
  type AssetGallery,
  type AssetGalleryPack,
  type AssetGalleryPage,
  type AssetGalleryPiece,
  type AssetGalleryQuery,
  type CalibrationKey,
} from "../core";
import {
  FLAG_FILTERS,
  FLAG_LABELS,
  USE_FILTERS,
  USE_LABELS,
  assetGalleryRequested,
  assetGalleryUrl,
  copyText,
  failureLines,
  flagLabels,
  inspectKey,
  noteLines,
  noteSummary,
  packTabLabel,
  rangeText,
  sizeText,
  stepIndex,
  storeLinkText,
  trianglesText,
  useLabels,
  type AssetGalleryRequest,
} from "./assetgallerylogic";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls !== undefined) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function button(label: string, cls: string, onClick: () => void): HTMLButtonElement {
  const b = el("button", cls, label);
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}

function select(label: string, options: readonly (readonly [string, string])[]): HTMLSelectElement {
  const s = el("select", "assets-select");
  s.setAttribute("aria-label", label);
  for (const [value, text] of options) {
    const o = el("option", undefined, text);
    o.value = value;
    s.append(o);
  }
  return s;
}

function field(label: string, control: HTMLElement): HTMLLabelElement {
  const l = el("label", "assets-field");
  l.append(el("span", "assets-field-label", label), control);
  return l;
}

function listOf(items: readonly string[], cls: string): HTMLUListElement {
  const ul = el("ul", cls);
  ul.replaceChildren(...items.map((t) => el("li", undefined, t)));
  ul.hidden = items.length === 0;
  return ul;
}

function storeLink(pack: AssetGalleryPack): HTMLElement {
  if (pack.storeUrl === null) return el("span", "assets-store", storeLinkText(pack));
  const a = el("a", "assets-store", storeLinkText(pack));
  a.href = pack.storeUrl;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  return a;
}

const isField = (t: EventTarget | null): boolean => t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement;

function selectText(node: Node): void {
  const range = document.createRange();
  range.selectNodeContents(node);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * Mounts the page into `host` (a new element, appended to it). `make` gives the renderer on the page's canvas (`createAssetGallery`). `addressSearch` is the page's address
 * (`location.search`), read by `assetGalleryRequested`. Returns the cleanup, which disposes the gallery and removes the page; it also runs on `pagehide`.
 */
export function mountAssetGallery(host: HTMLElement, make: (canvas: HTMLCanvasElement) => AssetGallery, addressSearch: string): () => void {
  const root = el("div", "assets-page");
  host.append(root);
  const canvas = el("canvas", "assets-canvas");
  canvas.setAttribute("aria-label", "The piece, large. Drag to turn it, scroll to zoom.");
  const gallery = make(canvas);
  const req: AssetGalleryRequest = assetGalleryRequested(addressSearch) ?? { pack: "", text: "", use: "any", flag: "any", page: 1, piece: null };

  let packs: readonly AssetGalleryPack[] = [];
  let shown: AssetGalleryPage | null = null;
  let packGen = 0;
  let renderGen = 0;
  let opened: AssetGalleryPiece | null = null;
  let returnTo: HTMLElement | null = null;
  let picSlots = new Map<CalibrationKey, HTMLElement>();
  let disposed = false;

  const queryOf = (): AssetGalleryQuery => ({ pack: req.pack, text: req.text, use: req.use, flag: req.flag, page: req.page });

  // ---- the chrome (built once, shown only when the manifest has packs) ----
  const title = el("h1", "assets-title", "Asset gallery");
  const dev = el("p", "assets-dev", "Dev only. Reads the converted packs on this machine. Nothing is saved or sent.");
  const tabs = el("div", "assets-tabs");
  tabs.setAttribute("role", "group");
  tabs.setAttribute("aria-label", "Packs");
  const packLine = el("div", "assets-packline");
  const search = el("input", "assets-search");
  search.type = "search";
  search.placeholder = "Name, or words from it";
  search.setAttribute("aria-label", "Search by name");
  search.autocomplete = "off";
  search.spellcheck = false;
  const useSel = select("Use", USE_FILTERS.map((u) => [u, USE_LABELS[u]] as const));
  const flagSel = select("Flag", FLAG_FILTERS.map((f) => [f, FLAG_LABELS[f]] as const));
  const filters = el("div", "assets-filters");
  filters.append(field("Search", search), field("Use", useSel), field("Flag", flagSel));
  const status = el("p", "assets-status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const cards = el("ul", "assets-cards");
  const makePager = (): { box: HTMLElement; prev: HTMLButtonElement; next: HTMLButtonElement; range: HTMLElement } => {
    const box = el("div", "assets-pager");
    const prev = button("Previous", "", () => turn(-1));
    const next = button("Next", "", () => turn(1));
    const range = el("span", "assets-range");
    box.append(prev, range, next);
    return { box, prev, next, range };
  };
  const topPager = makePager();
  const footerPager = makePager();
  const pagers = [topPager, footerPager];
  const header = el("header", "assets-head");
  header.append(title, dev, tabs, packLine, filters, topPager.box);
  const footer = footerPager.box;

  // the inspect panel
  const panel = el("section", "assets-inspect");
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "The piece, large");
  const pos = el("span", "assets-pos");
  const prevPiece = button("Previous piece", "", () => stepPiece(-1));
  const nextPiece = button("Next piece", "", () => stepPiece(1));
  const closeBtn = button("Close", "assets-close", closePanel);
  const bar = el("div", "assets-inspect-bar");
  bar.append(prevPiece, pos, nextPiece, closeBtn);
  const pname = el("h2", "assets-inspect-name");
  pname.tabIndex = -1;
  const pcopy = button("Copy", "assets-copy", () => {
    if (opened !== null) void copyPiece(opened, pname);
  });
  const phead = el("div", "assets-card-head");
  phead.append(pname, pcopy);
  const pmeta = el("p", "assets-meta");
  const pflags = el("ul", "assets-flags");
  const puses = el("ul", "assets-uses");
  const pnotes = el("div", "assets-notes");
  const pstore = el("p");
  const pbody = el("div", "assets-inspect-body");
  pbody.append(phead, pmeta, pflags, puses, pnotes, pstore);
  panel.append(bar, canvas, pbody);

  // ---- the cards ----

  function cardFor(piece: AssetGalleryPiece): HTMLLIElement {
    const li = el("li", "assets-card");
    const pic = button("", "assets-pic", () => openPiece(piece));
    pic.setAttribute("aria-label", `Open ${piece.name} large`);
    pic.append(el("span", "assets-pic-wait", "Drawing"));
    picSlots.set(piece.key, pic);
    const name = el("p", "assets-name keep", piece.name);
    const copy = button("Copy", "assets-copy", () => void copyPiece(piece, name));
    copy.setAttribute("aria-label", `Copy ${copyText(piece)}`);
    copy.title = `Copies ${copyText(piece)}`;
    const head = el("div", "assets-card-head");
    head.append(name, copy);
    li.append(pic, head, el("p", "assets-meta", `${sizeText(piece.size_m)} · ${trianglesText(piece.triangles)}`));
    const flags = flagLabels(piece);
    if (flags.length > 0) li.append(listOf(flags, "assets-flags"));
    li.append(listOf(useLabels(piece.uses), "assets-uses"));
    const note = noteSummary(piece);
    if (note !== null) li.append(el("p", "assets-note keep", note));
    // A click anywhere on the card opens it, except on a button, a link, or text the reader is selecting.
    li.addEventListener("click", (e) => {
      const t = e.target instanceof Element ? e.target : null;
      if (t === null || t.closest("button, a, .keep")) return;
      if ((window.getSelection()?.toString() ?? "") !== "") return;
      openPiece(piece);
    });
    return li;
  }

  async function copyPiece(piece: AssetGalleryPiece, nameEl: HTMLElement): Promise<void> {
    try {
      await navigator.clipboard.writeText(copyText(piece));
      setStatus(`Copied ${copyText(piece)}.`);
    } catch {
      selectText(nameEl);
      setStatus(`The clipboard refused. ${piece.name} is selected: press Ctrl+C to copy it.`);
    }
  }

  // ---- the page ----

  function setStatus(text: string): void {
    status.textContent = text;
  }

  function replaceUrl(): void {
    history.replaceState(null, "", assetGalleryUrl(queryOf(), req.piece));
  }

  function turn(delta: number): void {
    if (shown === null) return;
    const n = req.page + delta;
    if (n < 1 || n > shown.pageCount) return;
    req.page = n;
    render();
    cards.scrollIntoView({ block: "start" });
  }

  /** Draws the cards for the query and asks for their thumbnails, in page order. The old page's thumbnails are cancelled first. */
  function render(): void {
    const gen = ++renderGen;
    gallery.cancelThumbnails();
    const pg = gallery.page(queryOf());
    shown = pg;
    req.page = pg.query.page;
    replaceUrl();
    for (const p of pagers) {
      p.range.textContent = rangeText(pg.query.page, ASSET_GALLERY_PAGE_SIZE, pg.total);
      p.prev.disabled = pg.query.page <= 1;
      p.next.disabled = pg.query.page >= pg.pageCount;
    }
    picSlots = new Map();
    cards.replaceChildren(...pg.pieces.map(cardFor));
    setStatus(pg.total === 0 ? "No piece matches these filters." : "");
    for (const piece of pg.pieces) {
      void gallery.thumbnail(piece.key).then((url) => {
        if (gen !== renderGen) return;
        const slot = picSlots.get(piece.key);
        if (slot === undefined) return;
        if (url === null) {
          slot.replaceChildren(el("span", "assets-pic-wait", "No picture"));
          return;
        }
        const img = el("img", "assets-img");
        img.src = url;
        img.alt = "";
        img.draggable = false;
        slot.replaceChildren(img);
      });
    }
  }

  function markTabs(): void {
    for (const b of tabs.querySelectorAll<HTMLButtonElement>("button")) b.setAttribute("aria-pressed", String(b.dataset.pack === req.pack));
  }

  /** Makes `pack` the page's pack: frees the last one (the gallery does that), then draws its first page. A later switch supersedes this one. */
  async function showPack(pack: string, keepPage: boolean): Promise<void> {
    const info = packs.find((p) => p.pack === pack);
    if (info === undefined) return;
    const gen = ++packGen;
    if (!panel.hidden) closePanel();
    req.pack = pack;
    if (!keepPage) req.page = 1;
    gallery.cancelThumbnails();
    cards.replaceChildren();
    shown = null;
    markTabs();
    packLine.replaceChildren(storeLink(info));
    if (info.failures.length > 0) {
      const d = el("details", "assets-failures");
      d.append(el("summary", undefined, `${info.failures.length} failed`), listOf(failureLines(info), "assets-failure-list"));
      packLine.append(d);
    }
    setStatus(`Loading ${info.title}. The large packs take a while.`);
    try {
      await gallery.loadPack(pack);
    } catch (e) {
      if (gen === packGen) setStatus(`Could not load ${info.title}: ${errText(e)}`);
      return;
    }
    if (gen !== packGen || disposed) return; // a later switch took over; its pack is the one drawn
    render();
  }

  // ---- the inspect panel ----

  function fillPanel(piece: AssetGalleryPiece): void {
    pname.textContent = piece.name;
    pcopy.setAttribute("aria-label", `Copy ${copyText(piece)}`);
    pmeta.textContent = `${sizeText(piece.size_m)} · ${trianglesText(piece.triangles)}`;
    const flags = flagLabels(piece);
    pflags.replaceChildren(...flags.map((t) => el("li", undefined, t)));
    pflags.hidden = flags.length === 0;
    puses.replaceChildren(...useLabels(piece.uses).map((t) => el("li", undefined, t)));
    if (piece.notes.length === 0) {
      pnotes.replaceChildren(el("p", "assets-meta", "No intended-use note for this piece."));
    } else {
      pnotes.replaceChildren(
        ...piece.notes.map((n) => {
          const l = noteLines(n);
          const s = el("section", "assets-fullnote");
          s.append(el("p", "assets-sure", l.sure), el("p", undefined, l.text), el("p", "assets-meta", `Images: ${l.images}`));
          if (l.departure !== null) s.append(el("p", "assets-departure", `Departure: ${l.departure}`));
          return s;
        }),
      );
    }
    const info = packs.find((p) => p.pack === piece.pack);
    pstore.replaceChildren(info === undefined ? "" : storeLink(info));
    const i = shown === null ? -1 : shown.pieces.findIndex((p) => p.key === piece.key);
    pos.textContent = i < 0 ? "" : `${i + 1} of ${shown?.pieces.length ?? 0} on this page`;
    prevPiece.disabled = i <= 0;
    nextPiece.disabled = shown === null || i < 0 || i >= shown.pieces.length - 1;
  }

  function openPiece(piece: AssetGalleryPiece): void {
    const active = document.activeElement;
    if (panel.hidden && active instanceof HTMLElement && !panel.contains(active)) returnTo = active;
    panel.hidden = false;
    if (!gallery.inspect(piece.key)) {
      panel.hidden = true;
      setStatus(`${piece.name} is not in the GLB.`);
      return;
    }
    opened = piece;
    req.piece = piece.name;
    fillPanel(piece);
    replaceUrl();
    pname.focus();
  }

  function closePanel(): void {
    if (panel.hidden) return;
    opened = null;
    req.piece = null;
    panel.hidden = true;
    gallery.closeInspect();
    replaceUrl();
    if (returnTo !== null && returnTo.isConnected) returnTo.focus();
    returnTo = null;
  }

  function stepPiece(delta: number): void {
    if (opened === null || shown === null) return;
    const i = shown.pieces.findIndex((p) => p.key === opened?.key);
    if (i < 0) return;
    const next = shown.pieces[stepIndex(i, shown.pieces.length, delta)];
    if (next !== undefined && next.key !== opened.key) openPiece(next);
  }

  /** Where a piece is: the page it sits on under the current filters (null when only an unfiltered search finds it), and the piece. */
  function locateIn(q: AssetGalleryQuery, name: string): { piece: AssetGalleryPiece; page: number } | null {
    const first = gallery.page({ ...q, page: 1 });
    for (let n = 1; n <= first.pageCount; n++) {
      const pg = n === 1 ? first : gallery.page({ ...q, page: n });
      const hit = pg.pieces.find((p) => p.name === name);
      if (hit !== undefined) return { piece: hit, page: n };
    }
    return null;
  }

  function openNamed(name: string): void {
    const filtered = locateIn(queryOf(), name);
    const hit = filtered ?? locateIn({ pack: req.pack, text: "", use: "any", flag: "any", page: 1 }, name);
    if (hit === null) {
      setStatus(`No piece named ${name} in this pack.`);
      return;
    }
    if (filtered === null) {
      // only the unfiltered list has it: show it with the filters cleared, so its card is on the page
      req.text = "";
      req.use = "any";
      req.flag = "any";
      search.value = "";
      useSel.value = "any";
      flagSel.value = "any";
    }
    if (hit.page !== req.page || filtered === null) {
      req.page = hit.page;
      render();
    }
    openPiece(hit.piece);
  }

  // ---- the pack tabs and the boot ----

  function buildTabs(): void {
    tabs.replaceChildren(
      ...packs.map((p) => {
        const b = button(packTabLabel(p), "assets-tab", () => {
          if (p.pack !== req.pack) void showPack(p.pack, false);
        });
        b.dataset.pack = p.pack;
        return b;
      }),
    );
  }

  const onKey = (e: KeyboardEvent): void => {
    if (panel.hidden) return;
    const k = inspectKey(e.key, isField(e.target));
    if (k === null) return;
    e.preventDefault();
    if (k === "close") closePanel();
    else stepPiece(k === "prev" ? -1 : 1);
  };
  const onResize = (): void => gallery.resize();

  function cleanup(): void {
    if (disposed) return;
    disposed = true;
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("pagehide", cleanup);
    gallery.dispose();
    root.remove();
  }

  async function boot(): Promise<void> {
    packs = await gallery.packs();
    if (disposed) return;
    if (packs.length === 0) {
      root.append(el("p", "assets-status", gallery.problem() ?? "The asset manifest has no packs."));
      return;
    }
    const first = packs[0];
    if (first === undefined) return;
    if (!packs.some((p) => p.pack === req.pack)) req.pack = first.pack;
    root.append(header, status, cards, footer, panel);
    buildTabs();
    search.value = req.text;
    useSel.value = req.use;
    flagSel.value = req.flag;
    search.addEventListener("input", () => {
      req.text = search.value;
      req.page = 1;
      render();
    });
    useSel.addEventListener("change", () => {
      req.use = useSel.value as AssetGalleryQuery["use"];
      req.page = 1;
      render();
    });
    flagSel.addEventListener("change", () => {
      req.flag = flagSel.value as AssetGalleryQuery["flag"];
      req.page = 1;
      render();
    });
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    window.addEventListener("pagehide", cleanup);
    const want = req.piece;
    req.piece = null;
    const pack = req.pack;
    await showPack(pack, true);
    if (want !== null && !disposed && req.pack === pack && shown !== null) openNamed(want);
    else replaceUrl();
  }

  void boot();
  return cleanup;
}
