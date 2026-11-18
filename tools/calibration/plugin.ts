/**
 * The dev-only Vite plugin behind the calibration gallery (ticket 045 B). It serves CALIBRATION_ENDPOINT:
 *   GET   the calibration file, or an empty one;
 *   POST  one CalibrationPatch as JSON; replies with the whole file after the write.
 * It exists only under `npm run dev` (`apply: "serve"`); it has a `configureServer` hook and nothing else, so
 * `vite build` and `vite preview` do not have it and no part of it can reach a bundle.
 *
 * The handler is a plain function over (method, headers, body, remoteAddress), tested without a server.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { CALIBRATION_ENDPOINT, emptyCalibration, validateCalibrationPatch } from "../../src/core";
import { calibrationFilePath, CalibrationFileError, patchCalibration, readCalibration } from "./store";
import type { StoreDeps } from "./store";

/** A POST body larger than this is refused with 413. */
export const MAX_BODY_BYTES = 64 * 1024;

export interface CalibrationRequest {
  method: string | undefined;
  /** Node's `req.headers` (lower-case names). */
  headers: Readonly<Record<string, string | string[] | undefined>>;
  /** The body read so far (the plugin stops reading just past MAX_BODY_BYTES). Empty for a GET. */
  body: string | Uint8Array;
  remoteAddress: string | undefined;
}

export interface CalibrationReply {
  status: number;
  body: string;
}

export interface HandlerOptions {
  /** The Vite root; the file is `CALIBRATION_FILE` under it. */
  root: string;
  now?: () => Date;
  store?: StoreDeps;
}

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

function json(status: number, value: unknown): CalibrationReply {
  return { status, body: JSON.stringify(value) };
}

function errorsReply(status: number, errors: readonly string[]): CalibrationReply {
  return json(status, { errors });
}

function headerValue(headers: CalibrationRequest["headers"], name: string): string {
  const v = headers[name];
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function byteLength(body: string | Uint8Array): number {
  return typeof body === "string" ? Buffer.byteLength(body, "utf8") : body.byteLength;
}

/** Never throws: any failure becomes a status and an `{ errors }` body. */
export function handleCalibrationRequest(req: CalibrationRequest, opts: HandlerOptions): CalibrationReply {
  if (!req.remoteAddress || !LOOPBACK.has(req.remoteAddress)) {
    return errorsReply(403, ["calibration: only requests from this machine are accepted"]);
  }
  const file = calibrationFilePath(opts.root);
  const now = opts.now ?? (() => new Date());
  try {
    if (req.method === "GET") {
      return json(200, readCalibration(file, opts.store) ?? emptyCalibration(now()));
    }
    if (req.method !== "POST") return errorsReply(405, [`calibration: ${req.method ?? "this method"} is not allowed; use GET or POST`]);

    const type = headerValue(req.headers, "content-type").split(";")[0]?.trim().toLowerCase();
    if (type !== "application/json") return errorsReply(415, ["calibration: content-type must be application/json"]);
    if (byteLength(req.body) > MAX_BODY_BYTES) return errorsReply(413, [`calibration: the body is over ${MAX_BODY_BYTES} bytes`]);

    let parsed: unknown;
    try {
      parsed = JSON.parse(typeof req.body === "string" ? req.body : Buffer.from(req.body).toString("utf8"));
    } catch (e) {
      return errorsReply(400, [`calibration: the body is not valid JSON (${(e as Error).message})`]);
    }
    const checked = validateCalibrationPatch(parsed);
    if (!checked.ok) return errorsReply(400, checked.errors);
    return json(200, patchCalibration(file, checked.patch, now(), opts.store));
  } catch (e) {
    if (e instanceof CalibrationFileError) return errorsReply(500, [`calibration: the saved file is unusable and was left alone: ${e.message}`]);
    return errorsReply(500, [`calibration: could not save: ${(e as Error).message}`]);
  }
}

/** Reads the body, keeping at most MAX_BODY_BYTES + 1 bytes: enough to know it is too big, no more. */
function readBody(req: IncomingMessage): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let done = false;
    const finish = (): void => {
      if (done) return;
      done = true;
      resolve(Buffer.concat(chunks).subarray(0, MAX_BODY_BYTES + 1));
    };
    req.on("data", (chunk: Buffer) => {
      if (done) return;
      chunks.push(chunk);
      size += chunk.length;
      if (size > MAX_BODY_BYTES) finish();
    });
    req.on("end", finish);
    req.on("error", (e) => {
      if (!done) {
        done = true;
        reject(e);
      }
    });
  });
}

function send(res: ServerResponse, reply: CalibrationReply): void {
  res.statusCode = reply.status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(reply.body);
}

export function calibrationPlugin(opts: { root?: string } = {}): Plugin {
  return {
    name: "rest-calibration",
    apply: "serve",
    configureServer(server) {
      const root = opts.root ?? server.config.root;
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url ?? "").split("?")[0];
        if (path !== CALIBRATION_ENDPOINT) {
          next();
          return;
        }
        try {
          const body = req.method === "POST" ? await readBody(req) : "";
          send(res, handleCalibrationRequest({ method: req.method, headers: req.headers, body, remoteAddress: req.socket.remoteAddress }, { root }));
        } catch (e) {
          send(res, errorsReply(500, [`calibration: ${(e as Error).message}`]));
        }
      });
    },
  };
}
