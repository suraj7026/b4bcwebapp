import type { NextConfig } from "next";
import fs from "node:fs";

// =========================================================================
// WINDOWS / PLESK PATH-CASING FIX (read this whole thing)
//
// Plesk on Windows exposes the same physical project directory through TWO
// path casings:   C:\Inetpub\vhosts\…  and  C:\inetpub\vhosts\…
// Webpack walks the filesystem to resolve modules; depending on which call
// site (process.cwd, require.resolve, __dirname, fs.realpath…) it uses, it
// gets one casing or the other. Each unique string becomes a unique module
// identifier — so React, react-dom, next/dist/* all get loaded twice. When
// the synthetic Pages-Router /_error tries to render at prerender time, it
// uses React from one copy while the context was created on the other copy
// → useContext returns null → "Cannot read properties of null (reading
// 'useContext')" → build dies.
//
// Lowercasing alone is safe on Windows because NTFS is case-insensitive.
// We attack the problem at two layers so paths converge to ONE string no
// matter which Node API Webpack reaches for:
//
//   1. Patch fs.realpathSync / fs.realpath / fs.realpathSync.native to
//      return lowercase. Webpack's resolver uses these.
//   2. A custom Webpack plugin that lowercases every module identifier
//      (resource, request, context, loader paths) on `afterResolve`.
//
// Plus the prior workarounds: chdir to canonical cwd, single-thread build,
// standalone output, no symlink walking. Belt and suspenders and another belt.
// No-op on macOS / Linux.
// =========================================================================

if (process.platform === "win32") {
  const lc = (s: unknown) => (typeof s === "string" ? s.toLowerCase() : s);

  // --- Patch fs.realpathSync (sync) ---
  const origRealpathSync = fs.realpathSync;
  const origRealpathNative = fs.realpathSync.native;
  const patchedRealpathSync = (...args: unknown[]) =>
    lc((origRealpathSync as (...a: unknown[]) => unknown)(...args));
  const patchedRealpathNative = (...args: unknown[]) =>
    lc((origRealpathNative as (...a: unknown[]) => unknown)(...args));
  (patchedRealpathSync as { native?: typeof patchedRealpathNative }).native =
    patchedRealpathNative;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (fs as any).realpathSync = patchedRealpathSync;

  // --- Patch fs.realpath (async + promisified) ---
  const origRealpath = fs.realpath;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (fs as any).realpath = (
    p: unknown,
    options: unknown,
    callback?: (err: unknown, resolved: unknown) => void
  ) => {
    let cb = callback;
    let opts = options;
    if (typeof options === "function") {
      cb = options as typeof callback;
      opts = undefined;
    }
    (origRealpath as (...a: unknown[]) => void)(
      p,
      opts,
      (err: unknown, result: unknown) => {
        cb?.(err, lc(result));
      }
    );
  };

  // --- Now normalize process.cwd() once everything's wired up ---
  try {
    const real = (fs.realpathSync.native as (p: string) => string)(
      process.cwd()
    );
    if (real !== process.cwd()) process.chdir(real);
  } catch {
    /* best-effort */
  }
}

const nextConfig: NextConfig = {
  // Self-contained bundle; uses different build code paths than the default
  // and reduces what we ship to the server.
  output: "standalone",

  eslint: { ignoreDuringBuilds: true },

  // Single-process build keeps React contexts in one module instance.
  experimental: {
    workerThreads: false,
    cpus: 1,
  },

  webpack: (config) => {
    if (config.resolve) config.resolve.symlinks = false;

    if (process.platform === "win32") {
      // Webpack plugin: lowercase every module identifier on afterResolve.
      // This guarantees identical strings even if any code path slipped
      // past our fs patches with the wrong casing.
      config.plugins = config.plugins ?? [];
      config.plugins.push({
        apply(compiler: {
          hooks: {
            normalModuleFactory: {
              tap: (
                name: string,
                fn: (nmf: {
                  hooks: {
                    afterResolve: {
                      tap: (
                        name: string,
                        fn: (data: {
                          createData?: Record<string, unknown>;
                        }) => void
                      ) => void;
                    };
                  };
                }) => void
              ) => void;
            };
          };
        }) {
          compiler.hooks.normalModuleFactory.tap(
            "ForceLowercasePaths",
            (nmf) => {
              nmf.hooks.afterResolve.tap(
                "ForceLowercasePaths",
                (resolveData) => {
                  const cd = resolveData.createData;
                  if (!cd) return;
                  const lc = (s: unknown) =>
                    typeof s === "string" ? s.toLowerCase() : s;
                  if (cd.resource) cd.resource = lc(cd.resource);
                  if (cd.userRequest) cd.userRequest = lc(cd.userRequest);
                  if (cd.context) cd.context = lc(cd.context);
                  if (cd.rawRequest) cd.rawRequest = lc(cd.rawRequest);
                  if (Array.isArray(cd.loaders)) {
                    for (const l of cd.loaders as {
                      loader?: string;
                    }[]) {
                      if (l.loader && typeof l.loader === "string") {
                        l.loader = l.loader.toLowerCase();
                      }
                    }
                  }
                }
              );
            }
          );
        },
      });
    }

    return config;
  },
};

export default nextConfig;
