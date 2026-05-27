"use server";

import {
  DERIVED_INDUSTRY_SQL,
  GENERAL_SEGMENT,
  query,
  queryOne,
  type QueryParam,
} from "@/lib/mysql";
import { readSession } from "@/lib/session";
import type {
  DashboardStats,
  DirectoryMember,
  Industry,
  Zone,
} from "@/types/database";

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

const DEFAULT_PAGE_SIZE = 20;
const MEDIA_BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "").replace(
  /\/$/,
  ""
);

// Hostinger seeds these literal default paths on rows that never uploaded an
// asset — treat them as no-image rather than rendering the same placeholder
// for every member.
const DEFAULT_LOGO_PATH = "uploads/10_company_logo_1766063582.png";
const DEFAULT_PHOTO_PATH = "uploads/10_profile_photo_1766063605.jpg";

const resolveMedia = (
  path: string | null,
  defaultPath?: string
): string | null => {
  if (!path) return null;
  if (defaultPath && path === defaultPath) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (!MEDIA_BASE) return path;
  return `${MEDIA_BASE}/${path.replace(/^\/+/, "")}`;
};

const MEMBER_PROJECTION = `
  m.member_id                                                                      AS id,
  m.member_registered_id                                                           AS registered_id,
  m.company                                                                        AS company_name,
  m.member_name                                                                    AS contact_name,
  m.email_address                                                                  AS email,
  m.phone_number                                                                   AS phone,
  NULLIF(m.service_provided,'')                                                    AS description,
  NULLIF(m.business_area,'')                                                       AS business_nature,
  NULL                                                                             AS sector,
  NULL                                                                             AS other_sector,
  NULL                                                                             AS other_industry,
  NULL                                                                             AS designation,
  NULLIF(CONCAT_WS(', ', NULLIF(m.member_city,''), NULLIF(m.member_state,'')),'')  AS business_location,
  NULL                                                                             AS turnover,
  NULL                                                                             AS referred_by,
  (${DERIVED_INDUSTRY_SQL})                                                        AS industry_id,
  COALESCE(s.segment_name, 'General')                                              AS industry_name,
  COALESCE(s.segment_name, 'General')                                              AS industry_text,
  NULL                                                                             AS industry_accent_color,
  m.member_zone                                                                    AS zone_id,
  m.member_zone                                                                    AS zone_name,
  m.chapter_id                                                                     AS chapter_id,
  NULLIF(m.company_logo,'')                                                        AS logo_raw,
  NULLIF(m.photo_url,'')                                                           AS profile_photo_raw,
  NULLIF(m.member_city,'')                                                         AS city,
  NULLIF(m.member_state,'')                                                        AS state,
  NULLIF(m.member_address1,'')                                                     AS address_line1,
  m.created_at                                                                     AS created_at
`;

interface MemberRow {
  id: number;
  registered_id: string | null;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  description: string | null;
  business_nature: string | null;
  sector: string | null;
  other_sector: string | null;
  other_industry: string | null;
  designation: string | null;
  business_location: string | null;
  turnover: string | null;
  referred_by: string | null;
  industry_id: number | null;
  industry_name: string | null;
  industry_text: string | null;
  industry_accent_color: string | null;
  zone_id: string | null;
  zone_name: string | null;
  chapter_id: number | null;
  logo_raw: string | null;
  profile_photo_raw: string | null;
  city: string | null;
  state: string | null;
  address_line1: string | null;
  created_at: string;
  chapter_name?: string | null;
}

function hydrate(row: MemberRow): DirectoryMember {
  return {
    id: String(row.id),
    registered_id: row.registered_id,
    company_name: row.company_name,
    contact_name: row.contact_name,
    email: row.email,
    phone: row.phone,
    description: row.description,
    business_nature: row.business_nature,
    sector: row.sector,
    industry_text: row.industry_text,
    other_sector: row.other_sector,
    other_industry: row.other_industry,
    designation: row.designation,
    business_location: row.business_location,
    turnover: row.turnover,
    referred_by: row.referred_by,
    services: [],
    logo_url: resolveMedia(row.logo_raw, DEFAULT_LOGO_PATH),
    profile_photo_url: resolveMedia(row.profile_photo_raw, DEFAULT_PHOTO_PATH),
    cover_photo_url: null,
    city: row.city,
    state: row.state,
    address_line1: row.address_line1,
    industry_id: row.industry_id,
    industry_name: row.industry_name,
    industry_accent_color: row.industry_accent_color ?? null,
    zone_id: row.zone_id,
    zone_name: row.zone_name,
    chapter_id: row.chapter_id,
    chapter_name: row.chapter_name ?? null,
    created_at: row.created_at,
  };
}

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function fetchMembersAction(
  filters: MemberListFilters = {}
): Promise<MemberListResult> {
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = filters.page ?? 0;
  const offset = page * pageSize;

  const where: string[] = [
    "(m.date_of_exit IS NULL OR m.date_of_exit = '0000-00-00')",
  ];
  const params: QueryParam[] = [];

  if (filters.industryId != null) {
    where.push(`(${DERIVED_INDUSTRY_SQL}) = ?`);
    params.push(filters.industryId);
  }
  if (filters.zoneId) {
    where.push("m.member_zone = ?");
    params.push(filters.zoneId);
  }
  if (filters.q && filters.q.trim()) {
    const like = `%${escapeLike(filters.q.trim())}%`;
    where.push(
      `(m.company LIKE ? OR m.member_name LIKE ? OR m.service_provided LIKE ?
        OR m.business_area LIKE ? OR s.segment_name LIKE ?
        OR m.member_city LIKE ? OR m.member_state LIKE ?)`
    );
    for (let i = 0; i < 7; i++) params.push(like);
  }
  const whereSql = where.join(" AND ");

  let orderSql = "ORDER BY company_name ASC";
  if (filters.sort === "-name") orderSql = "ORDER BY company_name DESC";
  else if (filters.sort === "recent") orderSql = "ORDER BY m.created_at DESC";

  const baseFrom = `
    FROM b4b_members m
    LEFT JOIN b4b_industry_segments s ON s.segment_id = (${DERIVED_INDUSTRY_SQL})
    WHERE ${whereSql}
  `;

  const listSql = `SELECT ${MEMBER_PROJECTION} ${baseFrom} ${orderSql} LIMIT ${pageSize} OFFSET ${offset}`;
  const countSql = `SELECT COUNT(*) AS total ${baseFrom}`;

  const [rows, countRows] = await Promise.all([
    query<MemberRow>(listSql, params),
    query<{ total: number }>(countSql, params),
  ]);

  return {
    items: rows.map(hydrate),
    total: Number(countRows[0]?.total ?? 0),
    page,
    pageSize,
  };
}

export async function fetchMemberAction(
  id: string
): Promise<DirectoryMember | null> {
  const memberId = Number.parseInt(id, 10);
  if (!Number.isFinite(memberId)) return null;

  const row = await queryOne<MemberRow>(
    `SELECT ${MEMBER_PROJECTION}, c.chapter_name AS chapter_name
     FROM b4b_members m
     LEFT JOIN b4b_industry_segments s ON s.segment_id = (${DERIVED_INDUSTRY_SQL})
     LEFT JOIN b4b_chapters c          ON c.chapter_id = m.chapter_id
     WHERE m.member_id = ?
       AND (m.date_of_exit IS NULL OR m.date_of_exit = '0000-00-00')
     LIMIT 1`,
    [memberId]
  );
  return row ? hydrate(row) : null;
}

export async function fetchOwnMemberAction(): Promise<DirectoryMember | null> {
  const session = await readSession();
  if (!session) return null;
  return fetchMemberAction(String(session.memberId));
}

export async function fetchIndustriesAction(): Promise<Industry[]> {
  const rows = await query<{
    id: number;
    name: string;
    description: string | null;
    sort_order: number;
  }>(
    `SELECT segment_id AS id, segment_name AS name, description, sort_order
     FROM b4b_industry_segments
     WHERE is_active = 1
     ORDER BY sort_order, segment_name`
  );
  const palette = [
    "#003ec7",
    "#0a66c2",
    "#3b82f6",
    "#0ea5e9",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#ef4444",
  ];
  const real: Industry[] = rows.map((r, i) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    accent_color: palette[i % palette.length],
    sort_order: r.sort_order,
    is_active: true,
  }));
  // Append the synthetic "General" bucket so members who don't fit any real
  // segment get a pill / tile rather than disappearing from filters.
  real.push({
    id: GENERAL_SEGMENT.id,
    name: GENERAL_SEGMENT.name,
    description: GENERAL_SEGMENT.description,
    accent_color: "#64748b", // slate, distinct from the segment palette
    sort_order: 9999,
    is_active: true,
  });
  return real;
}

export async function fetchZonesAction(): Promise<Zone[]> {
  const rows = await query<{ name: string }>(
    `SELECT zone_name AS name FROM b4b_zones ORDER BY zone_name`
  );
  return rows.map((r) => ({ id: r.name, name: r.name }));
}

export async function fetchDashboardStatsAction(): Promise<DashboardStats> {
  const [totalRows, indRows, generalRows] = await Promise.all([
    query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM b4b_members WHERE date_of_exit IS NULL OR date_of_exit = '0000-00-00'`
    ),
    query<{
      id: number;
      name: string;
      description: string | null;
      sort_order: number;
      member_count: number;
    }>(
      `SELECT s.segment_id AS id, s.segment_name AS name, s.description,
              s.sort_order, COUNT(m.member_id) AS member_count
       FROM b4b_industry_segments s
       LEFT JOIN b4b_members m
         ON s.segment_id = (${DERIVED_INDUSTRY_SQL})
        AND (m.date_of_exit IS NULL OR m.date_of_exit = '0000-00-00')
       WHERE s.is_active = 1
       GROUP BY s.segment_id, s.segment_name, s.description, s.sort_order
       ORDER BY s.sort_order, s.segment_name`
    ),
    query<{ n: number }>(
      `SELECT COUNT(*) AS n FROM b4b_members m
       WHERE (m.date_of_exit IS NULL OR m.date_of_exit = '0000-00-00')
         AND (${DERIVED_INDUSTRY_SQL}) = 0`
    ),
  ]);
  const palette = [
    "#003ec7",
    "#0a66c2",
    "#3b82f6",
    "#0ea5e9",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#ef4444",
  ];
  const industries = indRows.map((r, i) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    accent_color: palette[i % palette.length],
    sort_order: r.sort_order,
    member_count: Number(r.member_count ?? 0),
  }));
  industries.push({
    id: GENERAL_SEGMENT.id,
    name: GENERAL_SEGMENT.name,
    description: GENERAL_SEGMENT.description,
    accent_color: "#64748b",
    sort_order: 9999,
    member_count: Number(generalRows[0]?.n ?? 0),
  });
  return {
    totalMembers: Number(totalRows[0]?.total ?? 0),
    industries,
  };
}
