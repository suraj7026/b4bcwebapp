import "server-only";

import {
  ACTIVE_MEMBER_SQL,
  DERIVED_INDUSTRY_SQL,
  query,
  type QueryParam,
} from "@/lib/mysql";
import type { PartnerRecommendation } from "@/types/database";

const MEDIA_BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "").replace(
  /\/$/,
  ""
);

const DEFAULT_LOGO_PATH = "uploads/10_company_logo_1766063582.png";
const DEFAULT_PHOTO_PATH = "uploads/10_profile_photo_1766063605.jpg";

const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "and",
  "any",
  "are",
  "business",
  "can",
  "company",
  "current",
  "for",
  "from",
  "help",
  "into",
  "looking",
  "need",
  "needs",
  "new",
  "our",
  "please",
  "post",
  "q1",
  "q2",
  "q3",
  "q4",
  "requirement",
  "requirements",
  "seeking",
  "service",
  "services",
  "supplier",
  "that",
  "the",
  "this",
  "with",
  "your",
]);

const SHORT_ALLOWED_TERMS = new Set(["ai", "ca", "hr", "it", "ui", "ux"]);

interface MemberMatchRow {
  id: number;
  registered_id: string | null;
  company_name: string | null;
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
}

function resolveMedia(path: string | null, defaultPath?: string): string | null {
  if (!path) return null;
  if (defaultPath && path === defaultPath) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (!MEDIA_BASE) return path;
  return `${MEDIA_BASE}/${path.replace(/^\/+/, "")}`;
}

function hydrateRecommendation(
  row: MemberMatchRow,
  match_percent: number,
  matched_terms: string[]
): PartnerRecommendation {
  return {
    id: String(row.id),
    registered_id: row.registered_id,
    company_name: row.company_name ?? "",
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
    industry_accent_color: row.industry_accent_color,
    zone_id: row.zone_id,
    zone_name: row.zone_name,
    chapter_id: row.chapter_id,
    chapter_name: null,
    created_at: row.created_at,
    match_percent,
    matched_terms,
  };
}

export function tokenizeRequirementText(text: string): string[] {
  const terms = text
    .toLowerCase()
    .match(/[a-z0-9&]+/g)
    ?.map((term) => term.replace(/^&+|&+$/g, ""))
    .filter(Boolean) ?? [];

  return Array.from(
    new Set(
      terms.filter((term) => {
        if (STOP_WORDS.has(term)) return false;
        return term.length >= 3 || SHORT_ALLOWED_TERMS.has(term);
      })
    )
  ).slice(0, 12);
}

function includesTerm(value: string | null, term: string): boolean {
  return value?.toLowerCase().includes(term) ?? false;
}

function scoreMember(
  row: MemberMatchRow,
  terms: string[],
  phrase: string
): { score: number; matchedTerms: string[] } {
  const fields: Array<{ value: string | null; weight: number }> = [
    { value: row.description, weight: 8 },
    { value: row.business_nature, weight: 7 },
    { value: row.industry_name, weight: 5 },
    { value: row.industry_text, weight: 5 },
    { value: row.company_name, weight: 3 },
    { value: row.city, weight: 2 },
    { value: row.state, weight: 2 },
    { value: row.zone_name, weight: 2 },
    { value: row.contact_name, weight: 1 },
  ];
  const matched = new Set<string>();
  let score = 0;

  for (const term of terms) {
    for (const field of fields) {
      if (includesTerm(field.value, term)) {
        score += field.weight;
        matched.add(term);
      }
    }
  }

  if (phrase.length >= 5) {
    const phraseFields = [row.description, row.business_nature, row.company_name];
    if (phraseFields.some((field) => includesTerm(field, phrase))) score += 18;
  }

  if (terms.length > 0 && matched.size === terms.length) score += 10;

  return { score, matchedTerms: Array.from(matched) };
}

function createdAtTime(row: MemberMatchRow): number {
  const parsed = Date.parse(row.created_at);
  return Number.isFinite(parsed) ? parsed : 0;
}

function matchPercent(score: number, maxScore: number, index: number): number {
  if (maxScore <= 0) return Math.max(72, 84 - index * 3);
  return Math.max(72, Math.min(99, Math.round(72 + (score / maxScore) * 27)));
}

export async function fetchPartnerRecommendationsForRequirement(
  requirementText: string,
  currentMemberId: number | null,
  limit = 3
): Promise<PartnerRecommendation[]> {
  const terms = tokenizeRequirementText(requirementText);
  const phrase = requirementText.trim().toLowerCase();
  const where = [ACTIVE_MEMBER_SQL];
  const params: QueryParam[] = [];

  if (currentMemberId != null) {
    where.push("m.member_id <> ?");
    params.push(currentMemberId);
  }

  const rows = await query<MemberMatchRow>(
    `SELECT
       m.member_id AS id,
       m.member_registered_id AS registered_id,
       m.company AS company_name,
       m.member_name AS contact_name,
       m.email_address AS email,
       m.phone_number AS phone,
       NULLIF(m.service_provided,'') AS description,
       NULLIF(m.business_area,'') AS business_nature,
       NULL AS sector,
       NULL AS other_sector,
       NULL AS other_industry,
       NULL AS designation,
       NULLIF(CONCAT_WS(', ', NULLIF(m.member_city,''), NULLIF(m.member_state,'')),'') AS business_location,
       NULL AS turnover,
       NULL AS referred_by,
       (${DERIVED_INDUSTRY_SQL}) AS industry_id,
       COALESCE(s.segment_name, 'General') AS industry_name,
       COALESCE(s.segment_name, 'General') AS industry_text,
       NULL AS industry_accent_color,
       m.member_zone AS zone_id,
       m.member_zone AS zone_name,
       m.chapter_id AS chapter_id,
       NULLIF(m.company_logo,'') AS logo_raw,
       NULLIF(m.photo_url,'') AS profile_photo_raw,
       NULLIF(m.member_city,'') AS city,
       NULLIF(m.member_state,'') AS state,
       NULLIF(m.member_address1,'') AS address_line1,
       m.created_at AS created_at
     FROM b4b_members m
     LEFT JOIN b4b_industry_segments s ON s.segment_id = (${DERIVED_INDUSTRY_SQL})
     WHERE ${where.join(" AND ")}`,
    params
  );

  const scored = rows
    .map((row) => ({ row, ...scoreMember(row, terms, phrase) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return createdAtTime(b.row) - createdAtTime(a.row);
    })
    .slice(0, limit);

  const maxScore = scored[0]?.score ?? 0;
  return scored.map((item, index) =>
    hydrateRecommendation(
      item.row,
      matchPercent(item.score, maxScore, index),
      item.matchedTerms
    )
  );
}
