import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";

// =========================================================================
// WINDOWS / PLESK PATH-CASING — surgical fix
//
// Plesk on Windows exposes the same physical project directory through two
// path casings (C:\Inetpub vs C:\inetpub). Webpack resolves React via one
// casing and the Pages-Router /_error bundle via the other, ends up with
// TWO copies of React, and prerender of /500 crashes because useContext
// returns null on the wrong copy.
//
// Earlier attempts patched fs.realpathSync globally — that broke Next.js's
// internal tracing state ("traceChild of undefined"). This config takes a
// narrower approach:
//
//   1. Normalize process.cwd() once at startup to the canonical NTFS
//      casing. Harmless and helps reduce some warnings.
//   2. Webpack alias react / react-dom / react/jsx-runtime to absolute
//      paths derived from a single canonical project root. This forces
//      every import path — regardless of original casing — to land on the
//      same resolved module. Single React instance → context survives.
//
// No-op on macOS / Linux.
// =========================================================================

let projectRoot = __dirname;

if (process.platform === "win32") {
  try {
    const real = fs.realpathSync.native(process.cwd());
    if (real !== process.cwd()) process.chdir(real);
    projectRoot = real;
  } catch {
    /* best-effort */
  }
}

const nextConfig: NextConfig = {
  output: "standalone",

  eslint: { ignoreDuringBuilds: true },

  serverExternalPackages: ["jose"],

  experimental: {
    workerThreads: false,
    cpus: 1,
  },

  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.symlinks = false;

    if (process.platform === "win32") {
      // Force React + ReactDOM to resolve to ONE absolute path so the
      // doubly-cased import paths Webpack might discover all converge on
      // the same module instance. Prevents the "two React copies →
      // useContext returns null" failure during prerender.
      const reactPath = path.join(projectRoot, "node_modules", "react");
      const reactDomPath = path.join(
        projectRoot,
        "node_modules",
        "react-dom"
      );
      const reactJsxRuntime = path.join(reactPath, "jsx-runtime.js");
      const reactJsxDevRuntime = path.join(reactPath, "jsx-dev-runtime.js");

      config.resolve.alias = {
        ...(config.resolve.alias as Record<string, string> | undefined),
        react: reactPath,
        "react-dom": reactDomPath,
        "react/jsx-runtime": reactJsxRuntime,
        "react/jsx-dev-runtime": reactJsxDevRuntime,
      };
    }

    return config;
  },
};

export default nextConfig;
