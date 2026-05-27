import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16.2.6 has a regression where the build worker fails to
  // initialize the RSC workStore when prerendering its auto-generated
  // /_global-error page. Disable worker threads so the prerender runs
  // in the main process where workStore is initialized correctly.
  // See: https://github.com/vercel/next.js/issues (look for "Expected
  // workStore to be initialized" reports).
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;
