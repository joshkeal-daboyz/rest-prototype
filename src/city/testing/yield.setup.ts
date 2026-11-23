/**
 * Ticket 078 A: vitest `setupFiles` entry, run for every test file. Registers one `afterEach` that yields to the event loop, and starts the stretch log when REST_STRETCH_LOG names a file.
 */
import { afterAll, afterEach, expect } from "vitest";
import { startStretchLog } from "./stretch";
import { yieldToWorker } from "./yield";

afterEach(() => yieldToWorker());

const log = startStretchLog(expect.getState().testPath ?? "(unknown file)", () => expect.getState().currentTestName);
afterAll(() => log.stop());
