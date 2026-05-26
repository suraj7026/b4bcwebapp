"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  DirectoryMember,
  Industry,
  Member,
  Zone,
} from "@/types/database";

type SB = SupabaseClient<Database>;

export interface MemberListFilters {
  q?: string;
  industryId?: number | null;
  zoneId?: string | null;
  sort?: "name" | "-name" | "recent";
  page?: number;
  pageSize?: number;
}

export interface MemberListResult {
  items: DirectoryMember[];
  total: number;
  pageSize: number;
  page: number;
}

const PAGE_SIZE = 20;

export async function fetchMembers(
  sb: SB,
  filters: MemberListFilters = {}
): Promise<MemberListResult> {
  const pageSize = filters.pageSize ?? PAGE_SIZE;
  const page = filters.page ?? 0;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let q = sb
    .from("directory_members")
    .select("*", { count: "exact" })
    .range(from, to);

  const term = (filters.q ?? "").trim();
  if (term) {
    // ilike with % wildcards on both ends matches the legacy `icontains` semantics.
    const like = `%${term.replace(/[%_]/g, "\\$&")}%`;
    q = q.or(
      [
        `company_name.ilike.${like}`,
        `contact_name.ilike.${like}`,
        `description.ilike.${like}`,
      ].join(",")
    );
  }
  if (filters.industryId != null) q = q.eq("industry_id", filters.industryId);
  if (filters.zoneId) q = q.eq("zone_id", filters.zoneId);

  const sort = filters.sort ?? "name";
  if (sort === "name") q = q.order("company_name", { ascending: true });
  else if (sort === "-name") q = q.order("company_name", { ascending: false });
  else q = q.order("created_at", { ascending: false });

  const { data, count, error } = await q;
  if (error) throw error;
  return {
    items: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function fetchMember(
  sb: SB,
  id: string
): Promise<DirectoryMember | null> {
  const { data, error } = await sb
    .from("directory_members")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchOwnMember(
  sb: SB,
  userId: string
): Promise<Member | null> {
  const { data, error } = await sb
    .from("members")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchIndustries(sb: SB): Promise<Industry[]> {
  const { data, error } = await sb
    .from("industries")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchZones(sb: SB): Promise<Zone[]> {
  const { data, error } = await sb
    .from("zones")
    .select("*")
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchFavoriteIds(sb: SB, userId: string) {
  const { data, error } = await sb
    .from("favorites")
    .select("member_id")
    .eq("user_id", userId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.member_id));
}

export async function fetchFavorites(
  sb: SB,
  userId: string
): Promise<DirectoryMember[]> {
  const { data: ids, error } = await sb
    .from("favorites")
    .select("member_id")
    .eq("user_id", userId);
  if (error) throw error;
  const memberIds = (ids ?? []).map((r) => r.member_id);
  if (memberIds.length === 0) return [];
  const { data, error: e2 } = await sb
    .from("directory_members")
    .select("*")
    .in("id", memberIds);
  if (e2) throw e2;
  return data ?? [];
}

export async function toggleFavorite(
  sb: SB,
  userId: string,
  memberId: string,
  currentlyFav: boolean
) {
  if (currentlyFav) {
    const { error } = await sb
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("member_id", memberId);
    if (error) throw error;
  } else {
    const { error } = await sb
      .from("favorites")
      .insert({ user_id: userId, member_id: memberId });
    if (error) throw error;
  }
}

export async function submitReport(
  sb: SB,
  memberId: string,
  reporterId: string,
  reason: string,
  note?: string
) {
  const { error } = await sb.from("reports").insert({
    member_id: memberId,
    reporter_id: reporterId,
    reason,
    note: note ?? null,
  });
  if (error) throw error;
}
