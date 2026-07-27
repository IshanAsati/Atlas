import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray lockfile in the home directory otherwise wins the root inference.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;
