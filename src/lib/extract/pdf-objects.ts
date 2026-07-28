import { inflateRawSync, inflateSync, unzipSync } from "node:zlib";

/**
 * Just enough of the PDF object model to find fonts and their character maps.
 *
 * Not a general parser — it reads indirect objects, expands the compressed
 * object streams PDF 1.5+ uses, and resolves references. That's the minimum
 * needed to turn a subset font's byte codes back into readable letters.
 */

export interface PdfObject {
  num: number;
  dict: string;
  stream: Buffer | null;
}

export function inflateMaybe(bytes: Buffer): Buffer | null {
  for (const fn of [inflateSync, unzipSync, inflateRawSync]) {
    try {
      return fn(bytes);
    } catch {
      /* try the next wrapper */
    }
  }
  return null;
}

/** Read every `N 0 obj … endobj` in the file. */
function parseTopLevel(buffer: Buffer): Map<number, PdfObject> {
  const raw = buffer.toString("latin1");
  const objects = new Map<number, PdfObject>();
  const re = /(\d+)\s+\d+\s+obj\b/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(raw)) !== null) {
    const num = Number(match[1]);
    const bodyStart = match.index + match[0].length;
    const endObj = raw.indexOf("endobj", bodyStart);
    const limit = endObj === -1 ? raw.length : endObj;

    const streamKeyword = raw.indexOf("stream", bodyStart);
    let dict: string;
    let stream: Buffer | null = null;

    if (streamKeyword !== -1 && streamKeyword < limit) {
      dict = raw.slice(bodyStart, streamKeyword);
      let dataStart = streamKeyword + "stream".length;
      if (raw[dataStart] === "\r") dataStart += 1;
      if (raw[dataStart] === "\n") dataStart += 1;
      const endStream = raw.indexOf("endstream", dataStart);
      if (endStream !== -1) {
        const body = buffer.subarray(dataStart, endStream);
        stream = dict.includes("FlateDecode") ? inflateMaybe(body) : body;
      }
    } else {
      dict = raw.slice(bodyStart, limit);
    }

    objects.set(num, { num, dict, stream });
  }

  return objects;
}

/**
 * PDF 1.5+ packs objects into compressed /ObjStm streams, so fonts are often
 * invisible to a top-level scan. Unpack them.
 */
function expandObjectStreams(objects: Map<number, PdfObject>) {
  for (const obj of [...objects.values()]) {
    if (!obj.stream || !/\/Type\s*\/ObjStm/.test(obj.dict)) continue;

    const n = Number(/\/N\s+(\d+)/.exec(obj.dict)?.[1] ?? 0);
    const first = Number(/\/First\s+(\d+)/.exec(obj.dict)?.[1] ?? 0);
    if (!n || !first) continue;

    const text = obj.stream.toString("latin1");
    const header = text.slice(0, first).trim().split(/\s+/).map(Number);

    for (let i = 0; i < n; i += 1) {
      const num = header[i * 2];
      const offset = header[i * 2 + 1];
      if (!Number.isFinite(num) || !Number.isFinite(offset)) continue;
      const nextOffset = i + 1 < n ? header[(i + 1) * 2 + 1] : text.length - first;
      const dict = text.slice(first + offset, first + nextOffset);
      if (!objects.has(num)) objects.set(num, { num, dict, stream: null });
    }
  }
}

export function parsePdfObjects(buffer: Buffer): Map<number, PdfObject> {
  const objects = parseTopLevel(buffer);
  expandObjectStreams(objects);
  return objects;
}

/** Follow `12 0 R` to the object it names. */
export function resolveRef(
  objects: Map<number, PdfObject>,
  ref: string | undefined,
): PdfObject | null {
  if (!ref) return null;
  const num = Number(/(\d+)\s+\d+\s+R/.exec(ref)?.[1]);
  return Number.isFinite(num) ? (objects.get(num) ?? null) : null;
}

/**
 * Read one dictionary entry's raw value, balancing nested `<< >>` and `[ ]`
 * so `/Font << /F1 5 0 R >>` comes back whole.
 */
export function dictValue(dict: string, key: string): string | undefined {
  const at = dict.indexOf(`/${key}`);
  if (at === -1) return undefined;

  let i = at + key.length + 1;
  while (i < dict.length && /\s/.test(dict[i])) i += 1;

  if (dict.startsWith("<<", i)) {
    let depth = 0;
    const start = i;
    while (i < dict.length) {
      if (dict.startsWith("<<", i)) {
        depth += 1;
        i += 2;
        continue;
      }
      if (dict.startsWith(">>", i)) {
        depth -= 1;
        i += 2;
        if (depth === 0) return dict.slice(start, i);
        continue;
      }
      i += 1;
    }
    return dict.slice(start);
  }

  if (dict[i] === "[") {
    let depth = 0;
    const start = i;
    while (i < dict.length) {
      if (dict[i] === "[") depth += 1;
      if (dict[i] === "]") {
        depth -= 1;
        i += 1;
        if (depth === 0) return dict.slice(start, i);
        continue;
      }
      i += 1;
    }
    return dict.slice(start);
  }

  const rest = dict.slice(i);
  const ref = /^(\d+\s+\d+\s+R)/.exec(rest);
  if (ref) return ref[1];
  return /^([^\s/<>[\]]+)/.exec(rest)?.[1];
}
