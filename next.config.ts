import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Plesk on Windows surfaces inconsistent path casing (C:\Inetpub vs
  // C:\inetpub), which makes ESLint and Webpack misbehave during `next build`.
  // We rely on `npx tsc --noEmit` for type safety; let `next build` skip the
  // lint pass entirely.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
