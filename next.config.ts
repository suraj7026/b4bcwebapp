import type { NextConfig } from "next";
import fs from "node:fs";

// --- Windows / Plesk cwd-casing fix --------------------------------------
// Force process.cwd() to match the canonical NTFS casing before Next.js
// initializes Webpack. See git history for full diagnosis.
if (process.platform === "win32") {
  try {
    const real = fs.realpathSync.native(process.cwd());
    if (real !== process.cwd()) process.chdir(real);
  } catch {}
}
// -------------------------------------------------------------------------

const nextConfig: NextConfig = {
  // Standalone output produces a self-contained .next/standalone/ tree that
  // sidesteps the Pages-Router synthetic /_error + /_app prerender that
  // double-loads React on Plesk Windows.
  output: "standalone",

  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },

  // Run the build single-threaded so the workStore + React contexts stay in
  // one process. Avoids "Cannot read properties of null (reading
  // 'useContext')" caused by double-loaded modules.
  experimental: {
    workerThreads: false,
    cpus: 1,
  },

  webpack: (config) => {
    // Tell Webpack not to walk symlinks — keeps module identifiers stable
    // when Plesk exposes the same directory through two cased paths.
    if (config.resolve) config.resolve.symlinks = false;
    return config;
  },
};

export default nextConfig;
