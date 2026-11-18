import * as nodeFs from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CALIBRATION_ENDPOINT, emptyCalibration, validateCalibration } from "../../src/core";
import type { CalibrationFile } from "../../src/core";
import { calibrationPlugin, handleCalibrationRequest, MAX_BODY_BYTES } from "./plugin";
import type { CalibrationRequest } from "./plugin";
import { calibrationFilePath } from "./store";

const NOW = new Date("2026-11-18T10:00:00.000Z");
const JSON_HEADERS = { "content-type": "application/json" };
const GOOD_PATCH = { key: "city-pack:SM_Bld_Shop_01", entry: { front: "-x" } };

let root: string;
beforeEach(() => {
  root = nodeFs.mkdtempSync(join(tmpdir(), "rest-cal-"));
});
afterEach(() => {
  nodeFs.rmSync(root, { recursive: true, force: true });
});

function call(over: Partial<CalibrationRequest>, store?: Parameters<typeof handleCalibrationRequest>[1]["store"]) {
  const req: CalibrationRequest = { method: "GET", headers: {}, body: "", remoteAddress: "127.0.0.1", ...over };
  return handleCalibrationRequest(req, { root, now: () => NOW, ...(store ? { store } : {}) });
}
function post(body: unknown, over: Partial<CalibrationRequest> = {}) {
  return call({ method: "POST", headers: JSON_HEADERS, body: typeof body === "string" ? body : JSON.stringify(body), ...over });
}
function fileOnDisk(): string | null {
  const p = calibrationFilePath(root);
  return nodeFs.existsSync(p) ? nodeFs.readFileSync(p, "utf8") : null;
}

describe("calibration handler: GET", () => {
  it("with no file returns emptyCalibration", () => {
    const reply = call({});
    expect(reply.status).toBe(200);
    expect(JSON.parse(reply.body)).toEqual(emptyCalibration(NOW));
    expect(fileOnDisk()).toBeNull();
  });

  it("with a file returns that file", () => {
    expect(post(GOOD_PATCH).status).toBe(200);
    const reply = call({});
    expect(reply.status).toBe(200);
    const body = JSON.parse(reply.body) as CalibrationFile;
    expect(body.entries["city-pack:SM_Bld_Shop_01"]).toEqual({ front: "-x", at: NOW.toISOString() });
  });
});

describe("calibration handler: POST", () => {
  it("a valid patch returns 200 and the new file, and writes it", () => {
    const reply = post(GOOD_PATCH);
    expect(reply.status).toBe(200);
    const body = JSON.parse(reply.body) as unknown;
    expect(validateCalibration(body).ok).toBe(true);
    expect(body).toEqual(JSON.parse(fileOnDisk() ?? "null"));
  });

  it("accepts a content type with a charset parameter, and a body given as bytes", () => {
    const reply = post(JSON.stringify(GOOD_PATCH), {
      headers: { "content-type": "Application/JSON; charset=utf-8" },
      body: new TextEncoder().encode(JSON.stringify(GOOD_PATCH)),
    });
    expect(reply.status).toBe(200);
  });

  it("a malformed body returns 400 with errors, and the file is unchanged", () => {
    post(GOOD_PATCH);
    const before = fileOnDisk();
    for (const bad of ["{ not json", { key: "nope", entry: { front: "-x" } }, { key: GOOD_PATCH.key, entry: { front: "up" } }, { key: GOOD_PATCH.key }, []]) {
      const reply = post(bad);
      expect(reply.status).toBe(400);
      expect((JSON.parse(reply.body) as { errors: string[] }).errors.length).toBeGreaterThan(0);
    }
    expect(fileOnDisk()).toBe(before);
  });

  it("a 400 for a bad patch creates no file", () => {
    expect(post({ key: "nope", entry: null }).status).toBe(400);
    expect(fileOnDisk()).toBeNull();
  });

  it("a body over 64 KB returns 413 and writes nothing", () => {
    const reply = post("x".repeat(MAX_BODY_BYTES + 1));
    expect(reply.status).toBe(413);
    expect(fileOnDisk()).toBeNull();
  });

  it("a wrong or missing content type returns 415", () => {
    expect(post(GOOD_PATCH, { headers: { "content-type": "text/plain" } }).status).toBe(415);
    expect(post(GOOD_PATCH, { headers: {} }).status).toBe(415);
    expect(fileOnDisk()).toBeNull();
  });

  it("a store failure becomes a 500 with errors, not a throw", () => {
    const reply = call(
      { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(GOOD_PATCH) },
      {
        fs: {
          existsSync: () => false,
          readFileSync: () => "",
          writeFileSync: () => undefined,
          mkdirSync: () => undefined,
          rmSync: () => undefined,
          renameSync: () => {
            throw new Error("nope");
          },
        },
      },
    );
    expect(reply.status).toBe(500);
    expect((JSON.parse(reply.body) as { errors: string[] }).errors[0]).toContain("nope");
  });

  it("an unusable saved file is a 500 and is left alone", () => {
    const p = calibrationFilePath(root);
    nodeFs.mkdirSync(join(p, ".."), { recursive: true });
    nodeFs.writeFileSync(p, "garbage", "utf8");
    expect(post(GOOD_PATCH).status).toBe(500);
    expect(call({}).status).toBe(500);
    expect(fileOnDisk()).toBe("garbage");
  });
});

describe("calibration handler: other methods and callers", () => {
  it("PUT, DELETE and a missing method return 405", () => {
    for (const method of ["PUT", "DELETE", "PATCH", undefined]) {
      expect(call({ method, headers: JSON_HEADERS, body: JSON.stringify(GOOD_PATCH) }).status).toBe(405);
    }
    expect(fileOnDisk()).toBeNull();
  });

  it("a non-loopback remote address returns 403 and writes nothing; 127.0.0.1, ::1 and ::ffff:127.0.0.1 are loopback", () => {
    for (const remoteAddress of ["192.168.1.20", "10.0.0.5", "::ffff:192.168.1.20", "8.8.8.8", "", undefined]) {
      expect(post(GOOD_PATCH, { remoteAddress }).status).toBe(403);
      expect(call({ remoteAddress }).status).toBe(403);
    }
    expect(fileOnDisk()).toBeNull();
    for (const remoteAddress of ["127.0.0.1", "::1", "::ffff:127.0.0.1"]) {
      expect(post(GOOD_PATCH, { remoteAddress }).status).toBe(200);
    }
  });
});

describe("calibration plugin: dev only", () => {
  it("applies only when serving, and has configureServer and no hook that could reach a bundle", () => {
    const plugin = calibrationPlugin();
    expect(plugin.apply).toBe("serve");
    expect(typeof plugin.configureServer).toBe("function");
    for (const hook of ["configurePreviewServer", "transform", "load", "resolveId", "renderChunk", "generateBundle", "transformIndexHtml", "buildStart"]) {
      expect((plugin as unknown as Record<string, unknown>)[hook]).toBeUndefined();
    }
  });
});

/** Runs the plugin's middleware over a fake server and request, and returns what it wrote. */
async function viaMiddleware(url: string, method: string, body: string, remoteAddress = "127.0.0.1") {
  type Middleware = (req: unknown, res: unknown, next: () => void) => Promise<void>;
  let middleware: Middleware | undefined;
  const hook = calibrationPlugin({ root }).configureServer as unknown as (s: unknown) => void;
  hook({ config: { root: join(root, "unused") }, middlewares: { use: (fn: Middleware) => (middleware = fn) } });
  const req = Object.assign(Readable.from(body === "" ? [] : [Buffer.from(body)]), { url, method, headers: JSON_HEADERS, socket: { remoteAddress } });
  const sent = { statusCode: 0, headers: {} as Record<string, string>, body: undefined as string | undefined };
  const res = {
    set statusCode(v: number) {
      sent.statusCode = v;
    },
    setHeader: (k: string, v: string) => {
      sent.headers[k] = v;
    },
    end: (b: string) => {
      sent.body = b;
    },
  };
  let passed = false;
  await middleware?.(req, res, () => {
    passed = true;
  });
  return { sent, passed };
}

describe("calibration plugin: the middleware", () => {
  it("serves only the endpoint's path and passes everything else on", async () => {
    expect((await viaMiddleware("/other", "GET", "")).passed).toBe(true);
    expect((await viaMiddleware(`${CALIBRATION_ENDPOINT}/extra`, "GET", "")).passed).toBe(true);
    const hit = await viaMiddleware(`${CALIBRATION_ENDPOINT}?x=1`, "GET", "");
    expect(hit.passed).toBe(false);
    expect(hit.sent.statusCode).toBe(200);
    expect(hit.sent.headers["cache-control"]).toBe("no-store");
  });

  it("writes under the root it was given, and replies with the file", async () => {
    const { sent } = await viaMiddleware(CALIBRATION_ENDPOINT, "POST", JSON.stringify(GOOD_PATCH));
    expect(sent.statusCode).toBe(200);
    expect(JSON.parse(sent.body ?? "null")).toEqual(JSON.parse(fileOnDisk() ?? "null"));
  });

  it("answers 413 to a body over the limit", async () => {
    const { sent } = await viaMiddleware(CALIBRATION_ENDPOINT, "POST", "x".repeat(MAX_BODY_BYTES * 2));
    expect(sent.statusCode).toBe(413);
  });

  it("answers 403 to a remote caller", async () => {
    const { sent } = await viaMiddleware(CALIBRATION_ENDPOINT, "POST", JSON.stringify(GOOD_PATCH), "192.168.1.9");
    expect(sent.statusCode).toBe(403);
    expect(fileOnDisk()).toBeNull();
  });
});
