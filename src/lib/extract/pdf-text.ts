import { dictValue, inflateMaybe, parsePdfObjects, resolveRef, type PdfObject } from "./pdf-objects";
import { fontsForResources, type FontMap } from "./pdf-fonts";

/**
 * PDF text extraction with no runtime dependencies.
 *
 * pdf.js (via pdf-parse) reaches its worker through a dynamic import that
 * Vercel's file tracer can't follow, so extraction worked locally and failed
 * in production. This reads the file directly instead: node:zlib inflates the
 * content streams, and the text operators are walked with the page's own
 * fonts so subset encodings decode correctly rather than coming back as
 * "7FSTJPO" where "Version" should be.
 *
 * Scanned pages have no text to find; those still need OCR.
 */

/** Resolve the escapes PDF allows inside a literal string. */
function unescapePdfString(raw: string): string {
  let out = "";
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    const next = raw[++i];
    if (next === undefined) break;
    if (next >= "0" && next <= "7") {
      let octal = next;
      while (octal.length < 3 && raw[i + 1] >= "0" && raw[i + 1] <= "7") octal += raw[++i];
      out += String.fromCharCode(parseInt(octal, 8));
      continue;
    }
    if (next === "\n") continue; // line continuation
    const simple: Record<string, string> = {
      n: "\n", r: "\r", t: "\t", b: "\b", f: "\f",
      "(": "(", ")": ")", "\\": "\\",
    };
    out += simple[next] ?? next;
  }
  return out;
}

/** Apply the active font's map to raw character codes. */
function decode(raw: string, font: FontMap | null | undefined): string {
  if (!font || font.map.size === 0) {
    // No translation available — the bytes are already Latin-1 text.
    return font?.bytes === 2 ? raw.replace(/\0/g, "") : raw;
  }

  let out = "";
  const step = font.bytes;
  for (let i = 0; i + step <= raw.length; i += step) {
    const code =
      step === 2
        ? (raw.charCodeAt(i) << 8) | raw.charCodeAt(i + 1)
        : raw.charCodeAt(i);
    out += font.map.get(code) ?? "";
  }
  return out;
}

/** Pull text out of one decoded content stream, tracking the current font. */
function textFromContent(content: string, fonts: Map<string, FontMap | null>): string {
  let out = "";
  let font: FontMap | null | undefined = undefined;
  let i = 0;

  const readLiteral = (start: number): [string, number] => {
    let depth = 1;
    let j = start;
    let raw = "";
    while (j < content.length) {
      const c = content[j];
      if (c === "\\") {
        raw += c + (content[j + 1] ?? "");
        j += 2;
        continue;
      }
      if (c === "(") depth += 1;
      if (c === ")") {
        depth -= 1;
        if (depth === 0) break;
      }
      raw += c;
      j += 1;
    }
    return [unescapePdfString(raw), j + 1];
  };

  while (i < content.length) {
    const ch = content[i];

    if (ch === "(") {
      const [raw, next] = readLiteral(i + 1);
      out += decode(raw, font);
      i = next;
      continue;
    }

    if (ch === "<" && content[i + 1] !== "<") {
      const end = content.indexOf(">", i);
      if (end === -1) break;
      const hex = content.slice(i + 1, end).replace(/[^0-9a-fA-F]/g, "");
      let raw = "";
      for (let k = 0; k + 1 < hex.length; k += 2) {
        raw += String.fromCharCode(parseInt(hex.slice(k, k + 2), 16));
      }
      out += decode(raw, font);
      i = end + 1;
      continue;
    }

    // /F1 12 Tf — switch the active font
    if (ch === "/") {
      const name = /^\/([A-Za-z0-9_.+-]+)/.exec(content.slice(i));
      if (name) {
        const after = content.slice(i + name[0].length, i + name[0].length + 24);
        if (/^\s+[\d.]+\s+Tf\b/.test(after)) font = fonts.get(name[1]);
        i += name[0].length;
        continue;
      }
    }

    /* Positioning operators are where a syllabus's structure lives — every
       chapter heading is its own line move. */
    if (ch === "T") {
      const op = content.slice(i, i + 2);
      if (op === "Td" || op === "TD" || op === "T*") out += "\n";
      else if (op === "Tj" || op === "TJ") out += " ";
      i += 2;
      continue;
    }

    i += 1;
  }

  return out;
}

/** Content streams for a page, concatenated and inflated. */
function contentsFor(objects: Map<number, PdfObject>, page: PdfObject): string {
  const entry = dictValue(page.dict, "Contents");
  if (!entry) return "";

  const refs = entry.startsWith("[")
    ? [...entry.matchAll(/(\d+\s+\d+\s+R)/g)].map((m) => m[1])
    : [entry];

  return refs
    .map((ref) => {
      const obj = resolveRef(objects, ref);
      if (!obj?.stream) return "";
      return obj.stream.toString("latin1");
    })
    .join("\n");
}

/** Words that appear in essentially any English syllabus. */
const MARKERS = [
  "the", "and", "of", "to", "in", "for", "class", "chapter", "unit",
  "syllabus", "marks", "term", "science", "maths", "mathematics", "english",
];

/**
 * Does this look like readable English, or like mojibake?
 *
 * A font whose map we couldn't read yields text of the right shape in the
 * wrong alphabet, which is worse than nothing — it would reach the model as
 * confident gibberish. Cheapest reliable test is whether ordinary words
 * actually appear.
 */
export function looksLikeProse(text: string): boolean {
  if (text.length < 120) return false;
  const lower = text.toLowerCase();
  const hits = MARKERS.filter((w) => new RegExp(`\\b${w}\\b`).test(lower)).length;
  if (hits < 3) return false;
  const spaces = (text.match(/\s/g) ?? []).length;
  return spaces / text.length > 0.05;
}

/**
 * Extract text from a PDF buffer. Returns "" when there's nothing readable —
 * a scan, an encrypted file, or a format this doesn't understand.
 */
export function extractPdfText(buffer: Buffer): string {
  const objects = parsePdfObjects(buffer);
  const chunks: string[] = [];

  for (const obj of objects.values()) {
    if (!/\/Type\s*\/Page\b/.test(obj.dict)) continue;

    const resourcesEntry = dictValue(obj.dict, "Resources") ?? "";
    const resources = resourcesEntry.startsWith("<<")
      ? resourcesEntry
      : (resolveRef(objects, resourcesEntry)?.dict ?? "");

    const fonts = fontsForResources(objects, resources);
    const content = contentsFor(objects, obj);
    if (content) chunks.push(textFromContent(content, fonts));
  }

  const viaPages = tidy(chunks.join("\n"));
  if (looksLikeProse(viaPages)) return viaPages;

  /* Some generators produce page trees this doesn't follow. Fall back to
     sweeping every stream that carries text operators. */
  const swept = tidy(sweepAllStreams(buffer));
  return swept.length > viaPages.length ? swept : viaPages;
}

function tidy(text: string): string {
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^[ \t]+/gm, "")
    .trim();
}

/** Last resort: decode every content-bearing stream with no font context. */
function sweepAllStreams(buffer: Buffer): string {
  const raw = buffer.toString("latin1");
  const out: string[] = [];
  const re = /stream\r?\n?/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(raw)) !== null) {
    const start = match.index + match[0].length;
    const end = raw.indexOf("endstream", start);
    if (end === -1) continue;

    const dict = raw.slice(Math.max(0, match.index - 400), match.index);
    const body = buffer.subarray(start, end);

    let decoded: string | null = null;
    if (dict.includes("FlateDecode")) {
      const inflated = inflateMaybe(body);
      if (inflated) decoded = inflated.toString("latin1");
    } else if (!/\/(DCTDecode|JPXDecode|CCITTFaxDecode|JBIG2Decode|Image)/.test(dict)) {
      decoded = body.toString("latin1");
    }

    if (decoded && /\bBT\b|\bTj\b|\bTJ\b/.test(decoded)) {
      out.push(textFromContent(decoded, new Map()));
    }
    re.lastIndex = end;
  }

  return out.join("\n");
}
