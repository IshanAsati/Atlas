import { inflateSync, inflateRawSync, unzipSync } from "node:zlib";

/**
 * Minimal PDF text extraction, with no dependencies.
 *
 * pdf-parse wraps pdf.js, which resolves its worker through a dynamic import
 * that Vercel's file tracer can't follow — extraction died in production with
 * "Setting up fake worker failed" while working fine locally. Rather than
 * fight the bundler the night before a demo, this reads the content streams
 * directly: Node's zlib inflates them and the text operators are pulled out.
 *
 * It handles the ordinary case — a syllabus exported from Word, LaTeX or
 * Google Docs — which is what students actually upload. It does not handle
 * scanned images (no text to find) or exotic CID encodings, so the caller
 * falls back to pdf.js when this returns too little to be plausible.
 */

/** Inflate a stream, trying each of the ways PDFs wrap Flate data. */
function inflate(bytes: Buffer): Buffer | null {
  for (const fn of [inflateSync, unzipSync, inflateRawSync]) {
    try {
      return fn(bytes);
    } catch {
      /* try the next wrapper */
    }
  }
  return null;
}

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
      while (octal.length < 3 && raw[i + 1] >= "0" && raw[i + 1] <= "7") {
        octal += raw[++i];
      }
      out += String.fromCharCode(parseInt(octal, 8));
      continue;
    }
    const simple: Record<string, string> = {
      n: "\n",
      r: "\r",
      t: "\t",
      b: "\b",
      f: "\f",
      "(": "(",
      ")": ")",
      "\\": "\\",
    };
    if (next === "\n") continue; // line continuation
    out += simple[next] ?? next;
  }
  return out;
}

/** Pull readable text out of one decoded content stream. */
function textFromContent(content: string): string {
  let out = "";
  let i = 0;

  const readLiteral = (start: number): [string, number] => {
    let depth = 1;
    let j = start;
    let raw = "";
    while (j < content.length && depth > 0) {
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

  const readHex = (start: number): [string, number] => {
    const end = content.indexOf(">", start);
    if (end === -1) return ["", content.length];
    const hex = content.slice(start, end).replace(/[^0-9a-fA-F]/g, "");
    let text = "";
    for (let k = 0; k + 1 < hex.length; k += 2) {
      const code = parseInt(hex.slice(k, k + 2), 16);
      if (code >= 32 || code === 10) text += String.fromCharCode(code);
    }
    return [text, end + 1];
  };

  while (i < content.length) {
    const ch = content[i];

    if (ch === "(") {
      const [text, next] = readLiteral(i + 1);
      out += text;
      i = next;
      continue;
    }

    if (ch === "<" && content[i + 1] !== "<") {
      const [text, next] = readHex(i + 1);
      out += text;
      i = next;
      continue;
    }

    /* Line-positioning operators are where a syllabus's structure lives —
       every chapter heading is its own text-positioning move. */
    if (ch === "T") {
      const op = content.slice(i, i + 2);
      if (op === "Td" || op === "TD" || op === "T*") out += "\n";
      if (op === "Tj" || op === "TJ") out += " ";
      i += 2;
      continue;
    }

    i += 1;
  }

  return out;
}

/* Words that appear in essentially any English syllabus. */
const MARKERS = [
  "the", "and", "of", "to", "in", "for", "class", "chapter", "unit",
  "syllabus", "marks", "term", "science", "maths", "mathematics", "english",
];

/**
 * Does this look like readable English, or like mojibake?
 *
 * Subset fonts often use a custom encoding, so the raw character codes come
 * out shifted — "Version" arrives as "7FSTJPO". The text is the right shape
 * and the wrong alphabet, which is worse than no text at all: it would be
 * sent to the model as confident gibberish. Cheapest reliable test is
 * whether ordinary words actually appear.
 */
export function looksLikeProse(text: string): boolean {
  if (text.length < 200) return false;
  const lower = text.toLowerCase();
  const hits = MARKERS.filter((w) => new RegExp(`\\b${w}\\b`).test(lower)).length;
  if (hits < 3) return false;

  // Mojibake tends to be letter soup with very few spaces.
  const spaces = (text.match(/\s/g) ?? []).length;
  return spaces / text.length > 0.05;
}

/**
 * Extract text from a PDF buffer. Returns "" when there's nothing readable
 * (a scan, an encrypted file, or a format this doesn't understand).
 */
export function extractPdfText(buffer: Buffer): string {
  const raw = buffer.toString("latin1");
  const chunks: string[] = [];

  const streamRe = /stream\r?\n?/g;
  let match: RegExpExecArray | null;

  while ((match = streamRe.exec(raw)) !== null) {
    const start = match.index + match[0].length;
    const end = raw.indexOf("endstream", start);
    if (end === -1) continue;

    // The stream's dictionary sits just before the `stream` keyword.
    const dict = raw.slice(Math.max(0, match.index - 400), match.index);
    const body = buffer.subarray(start, end);

    let decoded: string | null = null;
    if (dict.includes("FlateDecode")) {
      const out = inflate(body);
      if (out) decoded = out.toString("latin1");
    } else if (!/\/(DCTDecode|JPXDecode|CCITTFaxDecode|JBIG2Decode|Image)/.test(dict)) {
      decoded = body.toString("latin1");
    }

    if (!decoded) continue;
    // Only content streams carry text operators; skip fonts, images, metadata.
    if (!/\bBT\b|\bTj\b|\bTJ\b/.test(decoded)) continue;

    chunks.push(textFromContent(decoded));
    streamRe.lastIndex = end;
  }

  return chunks
    .join("\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^[ \t]+/gm, "")
    .trim();
}
