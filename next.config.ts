import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray lockfile in the home directory otherwise wins the root inference.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
  /* pdf-parse loads pdf.js, which resolves its worker by a path relative to
     its own package. Bundling it moves the code into .next/server/chunks and
     the worker lookup fails there, so syllabus extraction dies with
     "Setting up fake worker failed". Leave it in node_modules. */
  serverExternalPackages: ["pdf-parse"],
  /* ...and the worker is reached through a dynamic import that Vercel's file
     tracer can't follow, so it never gets deployed. Name it explicitly. */
  outputFileTracingIncludes: {
    "/api/extract": [
      "./node_modules/pdf-parse/dist/**/*",
      "./node_modules/pdfjs-dist/legacy/build/*.mjs",
    ],
  },
};

export default nextConfig;
