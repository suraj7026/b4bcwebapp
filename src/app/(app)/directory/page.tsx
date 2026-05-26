"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import {
  fetchFavoriteIds,
  fetchIndustries,
  fetchMembers,
  fetchZones,
  toggleFavorite,
  type MemberListFilters,
} from "@/lib/supabase-queries";
import {
  FiltersPanel,
  type DirectoryFiltersState,
} from "@/components/directory/filters-panel";
import { BusinessCard } from "@/components/directory/business-card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { DirectoryMember, Industry } from "@/types/database";

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
  const sb = useMemo(() => createClient(), []);
  const qc = useQueryClient();
  const [filters, setFilters] = useState<DirectoryFiltersState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);
  const debounced = useDebounced(filters, 300);

  useEffect(() => {
    setPage(0);
  }, [debounced.q, debounced.industryId, debounced.zone, debounced.sort]);

  const userQ = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await sb.auth.getUser()).data.user,
  });
  const userId = userQ.data?.id ?? null;

  const industriesQ = useQuery({
    queryKey: ["industries"],
    queryFn: () => fetchIndustries(sb),
    staleTime: 5 * 60_000,
  });
  const zonesQ = useQuery({
    queryKey: ["zones"],
    queryFn: () => fetchZones(sb),
    staleTime: 5 * 60_000,
  });
  const favIdsQ = useQuery({
    queryKey: ["favorite-ids", userId],
    queryFn: () => (userId ? fetchFavoriteIds(sb, userId) : new Set<string>()),
    enabled: !!userId,
  });

  const filtersForQuery: MemberListFilters = {
    q: debounced.q.trim() || undefined,
    industryId: debounced.industryId
      ? parseInt(debounced.industryId, 10)
      : undefined,
    zoneId: debounced.zone ?? undefined,
    sort: debounced.sort,
    page,
  };

  const membersQ = useQuery({
    queryKey: ["members", filtersForQuery],
    queryFn: () => fetchMembers(sb, filtersForQuery),
    placeholderData: keepPreviousData,
  });

  const toggleFav = useMutation({
    mutationFn: async (m: DirectoryMember) => {
      if (!userId) throw new Error("Not signed in");
      const isFav = favIdsQ.data?.has(m.id) ?? false;
      await toggleFavorite(sb, userId, m.id, isFav);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["favorite-ids", userId] }),
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

  // FiltersPanel still keys industry by id-string (legacy from prefixed ids).
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

  const handleClear = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-10 md:flex-row">
      <FiltersPanel
        state={filters}
        industries={industriesForPanel}
        zones={zonesForPanel}
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
              Discover B4BC members —{" "}
              <span className="font-semibold">{total}</span> matching businesses
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
                    biz.industry_id
                      ? industriesById.get(biz.industry_id) ?? null
                      : null
                  }
                  isFavorite={favIdsQ.data?.has(biz.id) ?? false}
                  onToggleFavorite={() => toggleFav.mutate(biz)}
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
