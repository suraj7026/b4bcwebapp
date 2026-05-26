"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Chip } from "@/components/ui/card";
import { Logo } from "@/components/directory/logo";
import { cn } from "@/lib/utils";
import type { DirectoryMember, Industry } from "@/types/database";

export function BusinessCard({
  business,
  featured,
  industry,
  isFavorite,
  onToggleFavorite,
}: {
  business: DirectoryMember;
  featured?: boolean;
  industry?: Industry | null;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}) {
  const title = business.company_name || business.contact_name || "Untitled";
  const subtitle =
    industry?.name ?? business.industry_name ?? "B4BC Member";
  const accent = industry?.accent_color ?? business.industry_accent_color ?? undefined;
  const location =
    business.zone_name || business.city || business.state || "—";

  return (
    <article
      className={cn(
        "transition-card shadow-card hover:-translate-y-1 hover:shadow-card flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6",
        featured && "md:col-span-2 md:flex-row md:gap-6"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-4",
          featured && "md:w-1/3 md:flex-col md:items-start md:gap-3"
        )}
      >
        <Logo
          src={business.logo_url}
          label={title}
          size={56}
          accent={accent}
        />
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-on-surface">
            {title}
          </h3>
          <p className="text-xs text-on-surface-variant">{subtitle}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4">
        {business.description ? (
          <p className="text-sm text-on-surface-variant line-clamp-2">
            {business.description}
          </p>
        ) : null}

        {business.services.length ? (
          <div className="flex flex-wrap gap-1.5">
            {business.services.slice(0, 4).map((s) => (
              <Chip key={s}>{s}</Chip>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between border-t border-outline-variant pt-4">
          <span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            <Icon name="location_on" className="text-sm" />
            {location}
          </span>
          <div className="flex items-center gap-2">
            {onToggleFavorite ? (
              <button
                type="button"
                aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
                onClick={(e) => {
                  e.preventDefault();
                  onToggleFavorite(business.id);
                }}
                className={cn(
                  "rounded-full p-2 transition-colors",
                  isFavorite
                    ? "text-primary hover:bg-primary/10"
                    : "text-outline hover:bg-surface-container-low"
                )}
              >
                <Icon name="bookmark" filled={isFavorite} />
              </button>
            ) : null}
            <Link
              href={`/directory/${business.id}`}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View
              <Icon name="arrow_forward" className="text-base" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
