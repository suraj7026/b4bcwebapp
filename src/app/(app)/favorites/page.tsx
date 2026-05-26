"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import {
  fetchFavorites,
  fetchIndustries,
  toggleFavorite,
} from "@/lib/supabase-queries";
import { BusinessCard } from "@/components/directory/business-card";
import { Icon } from "@/components/ui/icon";
import type { Industry } from "@/types/database";

export default function FavoritesPage() {
  const sb = useMemo(() => createClient(), []);
  const qc = useQueryClient();

  const userQ = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await sb.auth.getUser()).data.user,
  });
  const userId = userQ.data?.id ?? null;

  const favoritesQ = useQuery({
    queryKey: ["favorites", userId],
    queryFn: () => (userId ? fetchFavorites(sb, userId) : []),
    enabled: !!userId,
  });
  const industriesQ = useQuery({
    queryKey: ["industries"],
    queryFn: () => fetchIndustries(sb),
    staleTime: 5 * 60_000,
  });

  const indById = useMemo(() => {
    const map = new Map<number, Industry>();
    industriesQ.data?.forEach((i) => map.set(i.id, i));
    return map;
  }, [industriesQ.data]);

  const remove = useMutation({
    mutationFn: async (memberId: string) => {
      if (!userId) return;
      await toggleFavorite(sb, userId, memberId, true);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorites", userId] });
      qc.invalidateQueries({ queryKey: ["favorite-ids", userId] });
    },
  });

  const items = favoritesQ.data ?? [];

  return (
    <main className="mx-auto max-w-[1200px] px-5 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold">Favorites</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Quick access to the members you've saved.
        </p>
      </header>

      {favoritesQ.isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-xl bg-surface-container-low"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center">
          <Icon name="bookmark" className="text-3xl text-outline" />
          <h3 className="mt-3 text-lg font-semibold">No favorites yet</h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Browse the directory and tap the bookmark to save a member.
          </p>
          <Link
            href="/directory"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Go to directory <Icon name="arrow_forward" className="text-base" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {items.map((biz) => (
            <BusinessCard
              key={biz.id}
              business={biz}
              industry={
                biz.industry_id ? indById.get(biz.industry_id) ?? null : null
              }
              isFavorite
              onToggleFavorite={(id) => remove.mutate(id)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
