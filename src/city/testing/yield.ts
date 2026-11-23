/**
 * Ticket 078 A: a pause for the test worker. Vitest's runner awaits only microtasks between tests, so a file of synchronous tests never lets the worker read the main process's reply to `onTaskUpdate`
 * (a 60 s rpc timeout). One macrotask lets the event loop turn. Test support only.
 */

/** Resolves after one macrotask (setTimeout 0), so the worker reads vitest's replies. */
export function yieldToWorker(): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}
