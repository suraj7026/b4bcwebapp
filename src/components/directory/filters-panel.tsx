"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import type { Industry, Zone } from "@/lib/api/types";

export interface DirectoryFiltersState {
  q: string;
  industryId: string | null;
  zone: string | null;
  sort: "name" | "-name" | "recent";
}

export function FiltersPanel({
  state,
  industries,
  zones,
  onChange,
  onClear,
  count,
}: {
  state: DirectoryFiltersState;
  industries: Industry[];
  zones: Zone[];
  onChange: (next: DirectoryFiltersState) => void;
  onClear: () => void;
  count?: number;
}) {
  return (
    <aside className="w-full md:w-[280px] md:flex-shrink-0">
      <div className="sticky top-20 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Filters</h2>
          {typeof count === "number" ? (
            <span className="text-xs text-on-surface-variant">
              {count} results
            </span>
          ) : null}
        </div>

        <div className="space-y-5">
          <Input
            label="Keywords"
            placeholder="Search businesses…"
            leadingIcon="search"
            value={state.q}
            onChange={(e) => onChange({ ...state, q: e.target.value })}
          />

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
              Industry
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onChange({ ...state, industryId: null })}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  !state.industryId
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-high text-on-surface-variant hover:bg-outline-variant"
                )}
              >
                All
              </button>
              {industries.map((ind) => {
                const active = state.industryId === ind.id;
                return (
                  <button
                    key={ind.id}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...state,
                        industryId: active ? null : ind.id,
                      })
                    }
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      active
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container-high text-on-surface-variant hover:bg-outline-variant"
                    )}
                  >
                    {ind.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
              Zone
            </label>
            <div className="relative">
              <Icon
                name="location_on"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-outline"
              />
              <select
                value={state.zone ?? ""}
                onChange={(e) =>
                  onChange({
                    ...state,
                    zone: e.target.value || null,
                  })
                }
                className="w-full appearance-none rounded-lg border border-outline-variant bg-surface-container-lowest py-2.5 pl-9 pr-8 text-sm text-on-surface focus:border-primary focus:outline-none"
              >
                <option value="">Everywhere</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
              <Icon
                name="expand_more"
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-base text-outline"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
              Sort
            </label>
            <select
              value={state.sort}
              onChange={(e) =>
                onChange({
                  ...state,
                  sort: e.target.value as DirectoryFiltersState["sort"],
                })
              }
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2.5 px-3 text-sm focus:border-primary focus:outline-none"
            >
              <option value="name">Name (A–Z)</option>
              <option value="-name">Name (Z–A)</option>
              <option value="recent">Recently added</option>
            </select>
          </div>

          <Button variant="ghost" className="w-full" onClick={onClear}>
            Clear all filters
          </Button>
        </div>
      </div>
    </aside>
  );
}
