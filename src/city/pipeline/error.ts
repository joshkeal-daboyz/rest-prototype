import type { CityCell } from "../../core";

/** What a stage throws when it cannot do its job (R-2): the rule or check that failed, and the cells it failed at. The runner turns it into a `CityStageFailure`. */
export class CityStageError extends Error {
  readonly reason: string;
  readonly cells: readonly CityCell[];
  constructor(reason: string, cells: readonly CityCell[] = []) {
    super(reason);
    this.name = "CityStageError";
    this.reason = reason;
    this.cells = cells;
  }
}

/** Thrown by `runCity` (not returned as a failure) when `until` names a stage that has not been built. */
export class CityRunError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CityRunError";
  }
}
