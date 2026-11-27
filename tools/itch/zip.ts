/**
 * A small zip writer (ticket 083 C; Josh, 26 Nov 2026: "Own zip writer (Recommended)"), on Node's built-in zlib. Deflate entries,
 * forward-slash names, classic format (no ZIP64). It streams: each entry is read, deflated and handed to `sink`, so a 500 MB package
 * is never held in memory whole. Dates are fixed, so the same files give the same bytes.
 */

import { crc32, deflateRawSync } from "node:zlib";

export interface ZipSource {
  /** The path inside the zip: forward slashes, relative. */
  path: string;
  /** The file's bytes; called once. */
  read: () => Buffer;
}

export const ZIP_MAX_ENTRIES = 65535;
export const ZIP_MAX_BYTES = 0xffffffff;

/** 1 Jan 2026 00:00 in DOS date/time. */
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;
const DOS_TIME = 0;

/** Write the zip to `sink` in order; returns the total bytes written. Throws past the classic format's limits. */
export function writeZip(entries: readonly ZipSource[], sink: (chunk: Buffer) => void): number {
  if (entries.length > ZIP_MAX_ENTRIES) throw new Error(`too many zip entries (${entries.length}); the limit is ${ZIP_MAX_ENTRIES}`);
  let offset = 0;
  const emit = (b: Buffer): void => {
    sink(b);
    offset += b.length;
    if (offset > ZIP_MAX_BYTES) throw new Error("the zip is past 4 GB; this writer has no ZIP64");
  };
  const central: Buffer[] = [];
  for (const e of entries) {
    const name = Buffer.from(e.path, "utf8");
    const data = e.read();
    const packed = deflateRawSync(data);
    const crc = crc32(data);
    const at = offset;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // flags: UTF-8 names
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    emit(local);
    emit(name);
    emit(packed);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4); // made by
    c.writeUInt16LE(20, 6); // needed
    c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(8, 10);
    c.writeUInt16LE(DOS_TIME, 12);
    c.writeUInt16LE(DOS_DATE, 14);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(packed.length, 20);
    c.writeUInt32LE(data.length, 24);
    c.writeUInt16LE(name.length, 28);
    c.writeUInt32LE(at, 42);
    central.push(c, name);
  }
  const cdStart = offset;
  for (const b of central) emit(b);
  const cdSize = offset - cdStart;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cdSize, 12);
  end.writeUInt32LE(cdStart, 16);
  emit(end);
  return offset;
}
