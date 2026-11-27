import { crc32, inflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { writeZip } from "./zip";

describe("the zip writer (083 C4)", () => {
  it("writes entries a reader finds by name, with the right CRC, and each one inflates to its input", () => {
    const inputs = [
      { path: "index.html", data: Buffer.from("<html></html>") },
      { path: "assets/private/out/game/a.bin", data: Buffer.alloc(5000, 7) },
      { path: "empty.txt", data: Buffer.alloc(0) },
    ];
    const chunks: Buffer[] = [];
    writeZip(inputs.map((i) => ({ path: i.path, read: () => i.data })), (c) => void chunks.push(c));
    const zip = Buffer.concat(chunks);

    const end = zip.length - 22;
    expect(zip.readUInt32LE(end)).toBe(0x06054b50);
    expect(zip.readUInt16LE(end + 10)).toBe(3);
    let at = zip.readUInt32LE(end + 16);
    for (const input of inputs) {
      expect(zip.readUInt32LE(at)).toBe(0x02014b50);
      const crc = zip.readUInt32LE(at + 16);
      const packedSize = zip.readUInt32LE(at + 20);
      const nameLen = zip.readUInt16LE(at + 28);
      const local = zip.readUInt32LE(at + 42);
      expect(zip.toString("utf8", at + 46, at + 46 + nameLen)).toBe(input.path);
      expect(crc).toBe(crc32(input.data));
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      expect(inflateRawSync(zip.subarray(start, start + packedSize)).equals(input.data)).toBe(true);
      at += 46 + nameLen;
    }
  });
});
