/** The stand-ins the harness plays against: a bus that records, a renderer that does nothing (081 R1: nothing is drawn). */
import { EventBus } from "../../src/core";
import type { EventName, Events } from "../../src/core";
import type { MapRenderer } from "../../src/render3d/maprender";

export interface Recorded {
  name: EventName;
  payload: unknown;
}

/** An EventBus that keeps every emit (name and payload, in order) and then delivers it as usual. */
export class RecordingBus extends EventBus {
  readonly events: Recorded[] = [];

  override emit<K extends EventName>(name: K, payload: Events[K]): void {
    this.events.push({ name, payload });
    super.emit(name, payload);
  }
}

/** A MapRenderer whose every method is a no-op and whose hitTest finds nothing. The harness clicks by id, never by pixel. */
export function fakeRenderer(): MapRenderer {
  return {
    draw() {},
    hitTest() {
      return null;
    },
    resize() {},
    setInsets() {},
    notify() {},
  };
}
