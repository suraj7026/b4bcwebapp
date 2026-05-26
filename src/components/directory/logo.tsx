"use client";

import { initialsFromName } from "@/lib/utils";

/**
 * Renders a flat, branded placeholder for a member listing.
 *
 * We deliberately do NOT render <img> here — the legacy media host (b4bc.org)
 * has many 404s and stale paths. Showing the company initials on the industry
 * accent color is cleaner and avoids broken image icons while we sort out a
 * proper media pipeline.
 */
export function Logo({
  label,
  size = 56,
  accent,
}: {
  /** Kept for API parity; ignored on purpose. */
  src?: string | null | undefined;
  label?: string | null;
  size?: number;
  accent?: string;
}) {
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-lg text-on-primary"
      style={{
        width: size,
        height: size,
        backgroundColor: accent ?? "#0052ff",
        fontSize: Math.max(12, Math.floor(size / 3)),
        fontWeight: 600,
        letterSpacing: "0.04em",
      }}
    >
      <span>{initialsFromName(label)}</span>
    </div>
  );
}
