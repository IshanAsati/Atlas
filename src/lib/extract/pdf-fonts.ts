import { dictValue, resolveRef, type PdfObject } from "./pdf-objects";
import { STANDARD_GLYPHS } from "./glyphs";

/**
 * Turning a font's byte codes back into letters.
 *
 * A subset font renumbers its glyphs, so the bytes in the content stream mean
 * nothing on their own — "Version" comes out as "7FSTJPO". The mapping back is
 * in the font's /ToUnicode CMap, or for simple fonts in the /Differences array
 * that names each glyph. Without reading one of those, extracted text is
 * confident nonsense.
 */

export interface FontMap {
  /** Code point → text. Empty means "the bytes are already Latin-1". */
  map: Map<number, string>;
  /** How many bytes make one character code. */
  bytes: 1 | 2;
}

const hexToString = (hex: string): string => {
  const clean = hex.replace(/[^0-9a-fA-F]/g, "");
  let out = "";
  for (let i = 0; i + 3 < clean.length + 1; i += 4) {
    const unit = clean.slice(i, i + 4);
    if (unit.length < 4) break;
    out += String.fromCharCode(parseInt(unit, 16));
  }
  // Single-byte destinations appear in some CMaps.
  if (!out && clean.length >= 2) out = String.fromCharCode(parseInt(clean.slice(0, 2), 16));
  return out;
};

/** Parse a /ToUnicode CMap: bfchar pairs and bfrange runs. */
function parseCMap(cmap: string): FontMap {
  const map = new Map<number, string>();

  // Codespace tells us whether codes are one byte or two.
  let bytes: 1 | 2 = 1;
  const codespace = /begincodespacerange([\s\S]*?)endcodespacerange/.exec(cmap);
  if (codespace) {
    const first = /<([0-9a-fA-F]+)>/.exec(codespace[1]);
    if (first && first[1].length >= 4) bytes = 2;
  }

  for (const block of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const pair of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
      if (pair[1].length >= 4) bytes = 2;
      map.set(parseInt(pair[1], 16), hexToString(pair[2]));
    }
  }

  for (const block of cmap.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    const body = block[1];

    // <lo> <hi> [<d0> <d1> …]
    for (const run of body.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*\[([\s\S]*?)\]/g)) {
      const lo = parseInt(run[1], 16);
      if (run[1].length >= 4) bytes = 2;
      let i = 0;
      for (const dst of run[3].matchAll(/<([0-9a-fA-F]+)>/g)) {
        map.set(lo + i, hexToString(dst[1]));
        i += 1;
      }
    }

    // <lo> <hi> <dstStart>
    for (const run of body.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
      const lo = parseInt(run[1], 16);
      const hi = parseInt(run[2], 16);
      const dst = parseInt(run[3], 16);
      if (run[1].length >= 4) bytes = 2;
      if (hi - lo > 65_535) continue;
      for (let c = lo; c <= hi; c += 1) {
        map.set(c, String.fromCharCode(dst + (c - lo)));
      }
    }
  }

  return { map, bytes };
}

/** Parse /Encoding /Differences — simple fonts name each glyph. */
function parseDifferences(differences: string): Map<number, string> {
  const map = new Map<number, string>();
  let code = 0;
  for (const token of differences.matchAll(/(\d+)|\/([^\s/\]]+)/g)) {
    if (token[1] !== undefined) {
      code = Number(token[1]);
      continue;
    }
    const glyph = token[2];
    const text = STANDARD_GLYPHS[glyph] ?? glyphFallback(glyph);
    if (text) map.set(code, text);
    code += 1;
  }
  return map;
}

/** uniXXXX and gNN style glyph names. */
function glyphFallback(name: string): string {
  const uni = /^uni([0-9a-fA-F]{4})$/.exec(name);
  if (uni) return String.fromCharCode(parseInt(uni[1], 16));
  if (name.length === 1) return name;
  return "";
}

/**
 * Build the decoder for one font object.
 * Returns null when the font needs no translation.
 */
export function buildFontMap(
  objects: Map<number, PdfObject>,
  fontObj: PdfObject | null,
): FontMap | null {
  if (!fontObj) return null;

  const toUnicodeRef = dictValue(fontObj.dict, "ToUnicode");
  const toUnicode = resolveRef(objects, toUnicodeRef);
  if (toUnicode?.stream) {
    const parsed = parseCMap(toUnicode.stream.toString("latin1"));
    if (parsed.map.size > 0) return parsed;
  }

  const encodingRef = dictValue(fontObj.dict, "Encoding");
  const encodingObj = resolveRef(objects, encodingRef);
  const encodingDict = encodingObj?.dict ?? encodingRef ?? "";
  const differences = dictValue(encodingDict, "Differences");
  if (differences) {
    const map = parseDifferences(differences);
    if (map.size > 0) return { map, bytes: 1 };
  }

  // Composite fonts without a ToUnicode still use two-byte codes.
  if (/\/Type0\b/.test(fontObj.dict)) return { map: new Map(), bytes: 2 };

  return null;
}

/** Resolve a page's /Resources /Font dictionary into decoders by name. */
export function fontsForResources(
  objects: Map<number, PdfObject>,
  resourcesDict: string,
): Map<string, FontMap | null> {
  const fonts = new Map<string, FontMap | null>();

  const fontEntry = dictValue(resourcesDict, "Font");
  if (!fontEntry) return fonts;

  const fontDict = fontEntry.startsWith("<<")
    ? fontEntry
    : (resolveRef(objects, fontEntry)?.dict ?? "");

  for (const entry of fontDict.matchAll(/\/([A-Za-z0-9_.+-]+)\s+(\d+\s+\d+\s+R)/g)) {
    fonts.set(entry[1], buildFontMap(objects, resolveRef(objects, entry[2])));
  }

  return fonts;
}
