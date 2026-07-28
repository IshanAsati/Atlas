"use client";

/**
 * Optical character recognition for photographed or scanned syllabi.
 *
 * tesseract.js is loaded dynamically at runtime via Function constructor
 * to avoid build-time module resolution errors (it's not installed in
 * node_modules during development, only at runtime on Vercel).
 */

/** Anything smaller than this is a blank wall, not a syllabus. */
export const MIN_OCR_CHARS = 60;

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

/** True when this file should go through OCR rather than the PDF reader. */
export function isImageFile(file: File): boolean {
  return IMAGE_TYPES.includes(file.type.toLowerCase()) || /\.(png|jpe?g|webp)$/i.test(file.name);
}

/**
 * Read the text out of an image.
 */
export async function ocrImage(file: File, onProgress?: (pct: number) => void): Promise<string> {
  let worker: any = null;
  let last = 0;

  const report = (pct: number) => {
    const clamped = Math.max(last, Math.min(100, Math.round(pct)));
    last = clamped;
    onProgress?.(clamped);
  };

  try {
    const createWorker: any = await new Function(
      'return import("tesseract.js").then(m => m.createWorker)',
    )();

    worker = await createWorker("eng", undefined, {
      logger: (message: { status?: string; progress?: number }) => {
        if (typeof message.progress !== "number") return;
        report(
          message.status === "recognizing text"
            ? 20 + message.progress * 80
            : message.progress * 20,
        );
      },
    });

    const { data } = await worker.recognize(file);
    report(100);
    return (data.text ?? "").trim();
  } catch (error) {
    console.error("[ocr]", error);
    throw new Error("Atlas couldn't read that image. Check your connection and try again.");
  } finally {
    if (worker) {
      try { await worker.terminate(); } catch { /* already gone */ }
    }
  }
}
