import type { NextConfig } from "next";
import fs from "node:fs";

// --- Windows / Plesk cwd-casing fix --------------------------------------
//
// On Plesk Windows the project lives at C:\Inetpub\vhosts\... but the
// process inherits a cwd lowercased to C:\inetpub\... Webpack treats those
// as two different module paths and loads every Next.js + React module
// twice. That double-load is what crashes `next build` with
// "Cannot read properties of null (reading 'useContext')" during prerender.
//
// fs.realpathSync.native returns the canonical NTFS casing as stored on
// disk. Forcing process.cwd() to match that *before* Next.js initializes
// webpack makes every loader resolve modules under one consistent path.
//
// No-op on macOS / Linux.
if (process.platform === "win32") {
  try {
    const real = fs.realpathSync.native(process.cwd());
    if (real !== process.cwd()) {
      process.chdir(real);
    }
  } catch {
    // best-effort; don't fail the build if realpath blows up
  }
}
// -------------------------------------------------------------------------

const nextConfig: NextConfig = {
  // Plesk's lint config import paths can break on Windows; we rely on
  // `tsc --noEmit` for type safety so the build doesn't need lint.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
