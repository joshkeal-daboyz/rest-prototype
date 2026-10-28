/**
 * Per-feed map captions (ticket 015 B). Built once per map; a feed's strings are rebuilt only when
 * that feed's load or capacity change, so the draw loop makes no strings. Pure: no canvas.
 */
import { puzzleFeeds, type Puzzle } from "../core";
import type { GridState } from "../grid";
import { feedAlarm, feedHeading, feedName, feedUsing } from "./labels";

export interface FeedCaptions {
  /** Node index of each feed in `puzzle.nodes`, file order. */
  readonly nodeIdx: Int32Array;
  /** Name line above the feed; "" on a one-feed map (nothing changes there). */
  readonly heading: string[];
  readonly name: string[];
  readonly using: string[];
  readonly alarm: string[];
  /** Whether feed k should show the alarm in the given state. */
  isOver(k: number, state: GridState): boolean;
  /** Refresh strings of any feed whose load/capacity changed. */
  update(state: GridState): void;
}

/** Alarm rule: a one-feed map alarms with the section brownout (as before); a multi-feed map only on the over feed. */
export function feedIsOver(multi: boolean, brownout: boolean, over: boolean | undefined): boolean {
  return multi ? over === true : brownout;
}

export function createFeedCaptions(puzzle: Puzzle): FeedCaptions {
  const infos = puzzleFeeds(puzzle);
  const n = infos.length;
  const multi = n >= 2;
  const nodeIdx = new Int32Array(n);
  for (let k = 0; k < n; k++) nodeIdx[k] = puzzle.nodes.findIndex((nd) => nd.id === infos[k]!.id);
  const heading = infos.map((f) => (multi ? feedHeading(f.name) : ""));
  const name: string[] = new Array<string>(n).fill("");
  const using: string[] = new Array<string>(n).fill("");
  const alarm: string[] = new Array<string>(n).fill("");
  const loads = new Float64Array(n).fill(NaN);
  const caps: (number | null)[] = new Array<number | null>(n).fill(-1);

  function readout(k: number, state: GridState): { load: number; capacity: number | null; over: boolean | undefined } {
    if (!multi) return { load: state.load, capacity: state.capacity, over: state.brownout };
    const r = state.feeds.get(infos[k]!.id);
    return r ? r : { load: 0, capacity: infos[k]!.capacity, over: false };
  }

  return {
    nodeIdx,
    heading,
    name,
    using,
    alarm,
    isOver(k, state) {
      return feedIsOver(multi, state.brownout, readout(k, state).over);
    },
    update(state) {
      for (let k = 0; k < n; k++) {
        const r = readout(k, state);
        if (loads[k] === r.load && caps[k] === r.capacity) continue;
        loads[k] = r.load;
        caps[k] = r.capacity;
        name[k] = feedName(r.capacity);
        using[k] = feedUsing(r.load, r.capacity);
        alarm[k] = feedAlarm(r.load, r.capacity);
      }
    },
  };
}
