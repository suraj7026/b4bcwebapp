"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { client } from "@/lib/api/client";
import {
  FiltersPanel,
  type DirectoryFiltersState,
} from "@/components/directory/filters-panel";
import { BusinessCard } from "@/components/directory/business-card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

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

export default function DirectoryPage() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<DirectoryFiltersState>(DEFAULT_FILTERS);
  const debounced = useDebounced(filters, 300);

  const industriesQ = useQuery({
    queryKey: ["industries"],
    queryFn: () => client.industries(),
    staleTime: 5 * 60_000,
  });
  const zonesQ = useQuery({
    queryKey: ["zones"],
    queryFn: () => client.zones(),
    staleTime: 5 * 60_000,
  });
  const favoritesQ = useQuery({
    queryKey: ["favorites"],
    queryFn: () => client.favorites(),
  });

  const membersQ = useInfiniteQuery({
    queryKey: ["members", debounced],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      client.members({
        q: debounced.q.trim() || undefined,
        industryId: debounced.industryId ?? undefined,
        zone: debounced.zone ?? undefined,
        sort: debounced.sort,
        cursor: pageParam,
        limit: 20,
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    // Keep the previous query's data on screen while a new filter fetches.
    // Without this, every keystroke briefly clears the grid → flashing skeleton.
    placeholderData: keepPreviousData,
  });

  const favoriteIds = useMemo(
    () => new Set(favoritesQ.data?.items.map((i) => i.id) ?? []),
    [favoritesQ.data]
  );

  const toggleFav = useMutation({
    mutationFn: async (id: string) => {
      if (favoriteIds.has(id)) await client.removeFavorite(id);
      else await client.addFavorite(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites"] }),
  });

  const allItems = useMemo(() => {
    const flat = membersQ.data?.pages.flatMap((p) => p.items) ?? [];
    const seen = new Set<string>();
    const out: typeof flat = [];
    for (const item of flat) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
    return out;
  }, [membersQ.data]);
  const total = membersQ.data?.pages[0]?.total;
  // True empty = we have a definite response AND it says 0. This overrules
  // any stale `allItems` carried over by `placeholderData: keepPreviousData`
  // during a filter refetch.
  const isDefinitelyEmpty =
    !membersQ.isPending && !membersQ.isPlaceholderData && total === 0;
  const itemsToShow = isDefinitelyEmpty ? [] : allItems;
  // Whether we're showing stale results while a new filter is loading.
  const showingStale =
    membersQ.isPlaceholderData || (membersQ.isFetching && !membersQ.isPending);

  const industriesById = useMemo(() => {
    const map = new Map<string, (typeof industries)[number]>();
    industriesQ.data?.items.forEach((i) => map.set(i.id, i));
    return map;
  }, [industriesQ.data]);

  const industries = industriesQ.data?.items ?? [];

  const handleClear = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-10 md:flex-row">
      <FiltersPanel
        state={filters}
        industries={industries}
        zones={zonesQ.data?.items ?? []}
        onChange={setFilters}
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
              Discover B4BC members{" "}
              {typeof total === "number" ? (
                <>
                  — <span className="font-semibold">{total}</span> matching
                  businesses
                </>
              ) : null}
            </p>
          </div>
          <Button variant="primary" size="md">
            <Icon name="add" className="text-base" />
            Add Business
          </Button>
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
        ) : itemsToShow.length === 0 ? (
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
          <div
            className={cn(
              "grid grid-cols-1 gap-6 md:grid-cols-2 transition-opacity",
              showingStale && "opacity-50"
            )}
            aria-busy={showingStale}
          >
            {itemsToShow.map((biz, idx) => (
              <BusinessCard
                key={biz.id}
                business={biz}
                featured={idx === 0}
                industry={
                  biz.industryId ? industriesById.get(biz.industryId) : null
                }
                isFavorite={favoriteIds.has(biz.id)}
                onToggleFavorite={(id) => toggleFav.mutate(id)}
              />
            ))}
          </div>
        )}

        {membersQ.hasNextPage ? (
          <div className="mt-8 flex justify-center">
            <Button
              variant="outline"
              size="md"
              onClick={() => membersQ.fetchNextPage()}
              loading={membersQ.isFetchingNextPage}
            >
              Load more
            </Button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
