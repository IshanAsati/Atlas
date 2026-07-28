"use client";

/**
 * Optical character recognition for photographed or scanned syllabi.
 *
 * This runs in the browser on purpose. The extraction route deploys to a
 * serverless function with a 50s budget that is already spent on the model
 * call, and shipping the Tesseract WASM binary plus the English trained data
 * into that bundle would blow both the size and the time limit. So the
 * browser turns the picture into text and the route is handed plain text.
 *
 * tesseract.js is loaded with a dynamic import so neither the WASM loader nor
 * anything it drags with it lands in the initial page bundle — the cost is
 * only paid by a student who actually uploads a photo.
 */

import type { Worker as TesseractWorker } from "tesseract.js";

/** Anything smaller than this is a blank wall, not a syllabus. */
export const MIN_OCR_CHARS = 60;

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

/** True when this file should go through OCR rather than the PDF reader. */
export function isImageFile(file: File): boolean {
  return IMAGE_TYPES.includes(file.type.toLowerCase()) || /\.(png|jpe?g|webp)$/i.test(file.name);
}

/**
 * Read the text out of an image.
 *
 * `onProgress` is called with a whole percentage from 0 to 100, covering both
 * the one-off model download and the recognition pass, so the caller can show
 * a single number that only ever moves forwards.
 */
export async function ocrImage(file: File, onProgress?: (pct: number) => void): Promise<string> {
  let worker: TesseractWorker | null = null;
  let last = 0;

  /* Loading the language data is most of the wait on a first upload, so it
     gets the first slice of the bar rather than being reported as nothing. */
  const report = (pct: number) => {
    const clamped = Math.max(last, Math.min(100, Math.round(pct)));
    last = clamped;
    onProgress?.(clamped);
  };

  try {
    const { createWorker } = await import("tesseract.js");

    worker = await createWorker("eng", undefined, {
      logger: (message) => {
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
    /* Free the WASM instance either way — an abandoned worker keeps a few
       hundred megabytes of heap alive for the rest of the session. */
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        /* Already gone. */
      }
    }
  }
}
