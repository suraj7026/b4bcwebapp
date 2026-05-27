"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  fetchIndustriesAction,
  fetchMembersAction,
  fetchZonesAction,
  type MemberListFilters,
} from "@/app/actions/queries";
import {
  FiltersPanel,
  type DirectoryFiltersState,
} from "@/components/directory/filters-panel";
import { BusinessCard } from "@/components/directory/business-card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { Industry } from "@/types/database";

const DEFAULT_FILTERS: DirectoryFiltersState = {
  q: "",
  industryId: null,
  zone: null,
  sort: "name",
};

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function parseFiltersFromUrl(
  sp: URLSearchParams
): DirectoryFiltersState {
  const sortParam = sp.get("sort");
  const validSorts: DirectoryFiltersState["sort"][] = ["name", "-name", "recent"];
  const sort = validSorts.includes(sortParam as DirectoryFiltersState["sort"])
    ? (sortParam as DirectoryFiltersState["sort"])
    : "name";
  return {
    q: sp.get("q") ?? "",
    industryId: sp.get("industry"),
    zone: sp.get("zone"),
    sort,
  };
}

function filtersToSearchString(f: DirectoryFiltersState): string {
  const params = new URLSearchParams();
  if (f.q.trim()) params.set("q", f.q.trim());
  if (f.industryId != null) params.set("industry", f.industryId);
  if (f.zone) params.set("zone", f.zone);
  if (f.sort && f.sort !== "name") params.set("sort", f.sort);
  return params.toString();
}

function DirectoryView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Seed initial state from the URL so dashboard tile clicks
  // (e.g. /directory?industry=6) preselect the right filter.
  const [filters, setFilters] = useState<DirectoryFiltersState>(() =>
    parseFiltersFromUrl(new URLSearchParams(searchParams.toString()))
  );
  const [page, setPage] = useState(0);
  const debounced = useDebounced(filters, 300);

  // Mirror filter state back to the URL so the page is shareable
  // and browser back/forward work intuitively.
  useEffect(() => {
    const next = filtersToSearchString(debounced);
    const current = searchParams.toString();
    if (next !== current) {
      router.replace(next ? `/directory?${next}` : "/directory", {
        scroll: false,
      });
    }
  }, [debounced, router, searchParams]);

  const updateFilters = useCallback((next: DirectoryFiltersState) => {
    setFilters(next);
    setPage(0);
  }, []);

  const industriesQ = useQuery({
    queryKey: ["industries"],
    queryFn: () => fetchIndustriesAction(),
    staleTime: 5 * 60_000,
  });
  const zonesQ = useQuery({
    queryKey: ["zones"],
    queryFn: () => fetchZonesAction(),
    staleTime: 5 * 60_000,
  });

  const filtersForQuery: MemberListFilters = {
    q: debounced.q.trim() || undefined,
    industryId:
      debounced.industryId != null
        ? parseInt(debounced.industryId, 10)
        : undefined,
    zoneId: debounced.zone ?? undefined,
    sort: debounced.sort,
    page,
  };

  const membersQ = useQuery({
    queryKey: ["members", filtersForQuery],
    queryFn: () => fetchMembersAction(filtersForQuery),
    placeholderData: keepPreviousData,
  });

  const total = membersQ.data?.total ?? 0;
  const items = membersQ.data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil(total / 20));
  const showingStale = membersQ.isPlaceholderData && membersQ.isFetching;
  const isEmpty = !membersQ.isPending && items.length === 0;

  const industriesById = useMemo(() => {
    const map = new Map<number, Industry>();
    industriesQ.data?.forEach((i) => map.set(i.id, i));
    return map;
  }, [industriesQ.data]);

  const industriesForPanel = useMemo(
    () =>
      (industriesQ.data ?? []).map((i) => ({
        id: String(i.id),
        name: i.name,
        description: i.description,
        accentColor: i.accent_color,
        memberCount: 0,
      })),
    [industriesQ.data]
  );
  const zonesForPanel = useMemo(
    () => (zonesQ.data ?? []).map((z) => ({ id: z.id, name: z.name })),
    [zonesQ.data]
  );

  const handleClear = useCallback(
    () => updateFilters(DEFAULT_FILTERS),
    [updateFilters]
  );

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-10 md:flex-row">
      <FiltersPanel
        state={filters}
        industries={industriesForPanel}
        zones={zonesForPanel}
        onChange={updateFilters}
        onClear={handleClear}
        count={total}
      />

      <section className="flex-1">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-on-surface">
              Business Directory
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Discover B4BC members —{" "}
              <span className="font-semibold">{total}</span> matching businesses
            </p>
          </div>
        </div>

        {membersQ.isPending ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-xl border border-outline-variant bg-surface-container-low"
              />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center">
            <Icon name="search_off" className="text-3xl text-outline" />
            <h3 className="mt-3 text-lg font-semibold">No businesses found</h3>
            <p className="mt-1 text-sm text-on-surface-variant">
              {debounced.q || debounced.industryId || debounced.zone
                ? "No matches for your current filters."
                : "There are no members to show."}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={handleClear}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <>
            <div
              className={cn(
                "grid grid-cols-1 gap-6 md:grid-cols-2 transition-opacity",
                showingStale && "opacity-50"
              )}
              aria-busy={showingStale}
            >
              {items.map((biz, idx) => (
                <BusinessCard
                  key={biz.id}
                  business={biz}
                  featured={idx === 0 && page === 0}
                  industry={
                    biz.industry_id != null
                      ? industriesById.get(biz.industry_id) ?? null
                      : null
                  }
                />
              ))}
            </div>

            {totalPages > 1 ? (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <Icon name="chevron_left" /> Previous
                </Button>
                <span className="px-3 text-sm text-on-surface-variant">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page + 1 >= totalPages}
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                >
                  Next <Icon name="chevron_right" />
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}

export default function DirectoryPage() {
  return (
    <Suspense fallback={null}>
      <DirectoryView />
    </Suspense>
  );
}
