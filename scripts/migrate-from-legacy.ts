/**
 * Migrate the legacy B4BC Postgres database into Supabase.
 *
 * Reads existing members from the b4bc_api Postgres (LEGACY_DATABASE_URL),
 * inserts equivalent rows into Supabase's `members` table, and creates a
 * Supabase Auth user for each member with a reset link they can use to set
 * their first password. Idempotent: re-running it updates rows by
 * legacy_member_id rather than duplicating them.
 *
 * Also creates the admin + zone-operator auth users.
 *
 * Required env (in .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY        — the `service_role` (secret) key
 *   LEGACY_DATABASE_URL        — postgres://... pointing at the b4bc_api DB
 *
 * Run with:
 *   npx tsx scripts/migrate-from-legacy.ts
 */
import "dotenv/config";
import { Client as PgClient } from "pg";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

const SUPABASE_URL = required("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_KEY = required("SUPABASE_SECRET_KEY");
const LEGACY_DB_URL = required("LEGACY_DATABASE_URL");
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3030";

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface LegacyMember {
  member_id: number;
  member_registered_id: string | null;
  first_name: string | null;
  last_name: string | null;
  member_name: string | null;
  company: string | null;
  business_area: string | null;
  service_provided: string | null;
  phone_number: string | null;
  email_address: string | null;
  company_logo: string | null;
  member_status: number | null;
  member_zone: string | null;
  member_city: string | null;
  member_state: string | null;
  member_address1: string | null;
  date_of_joining: string | null;
  industry_id: number | null;
  industry_name: string | null;
}

interface SkippedRow {
  member_id: number;
  reason: string;
  company: string | null;
  email: string | null;
}

async function ensureIndustries(industryNames: string[]) {
  const ordered = industryNames.filter(Boolean);
  if (ordered.length === 0) return new Map<string, number>();
  const { data, error } = await supabase
    .from("industries")
    .upsert(
      ordered.map((name, i) => ({
        name,
        sort_order: i,
        is_active: true,
        accent_color: pickAccent(i),
      })),
      { onConflict: "name", ignoreDuplicates: false }
    )
    .select("id,name");
  if (error) throw error;
  const map = new Map<string, number>();
  for (const row of data ?? []) map.set(row.name.toLowerCase(), row.id);
  return map;
}

function pickAccent(i: number) {
  const palette = [
    "#0EA5E9",
    "#22C55E",
    "#F97316",
    "#A855F7",
    "#EF4444",
    "#14B8A6",
    "#6366F1",
  ];
  return palette[i % palette.length];
}

async function ensureZones() {
  // 0001_init.sql seeded these already; this just re-asserts them.
  const zones = [
    ["BANGALORE", "Bangalore"],
    ["CHENNAI", "Chennai"],
    ["COIMBATORE", "Coimbatore"],
    ["MUMBAI", "Mumbai"],
    ["OTHERS", "Others"],
    ["WEST", "West"],
    ["EAST", "East"],
    ["NORTH", "North"],
    ["SOUTH", "South"],
  ];
  const { error } = await supabase
    .from("zones")
    .upsert(zones.map(([id, name]) => ({ id, name, active: true })), {
      onConflict: "id",
    });
  if (error) throw error;
}

async function fetchLegacyMembers(): Promise<LegacyMember[]> {
  const pg = new PgClient({ connectionString: LEGACY_DB_URL });
  await pg.connect();
  try {
    const res = await pg.query(`
      SELECT
        m.member_id,
        m.member_registered_id,
        m.first_name,
        m.last_name,
        m.member_name,
        m.company,
        m.business_area,
        m.service_provided,
        m.phone_number,
        m.email_address,
        m.company_logo,
        m.member_status,
        m.member_zone,
        m.member_city,
        m.member_state,
        m.member_address1,
        m.date_of_joining,
        m.industry_id,
        i.segment_name AS industry_name
      FROM b4b_members m
      LEFT JOIN b4b_industry_segments i ON i.segment_id = m.industry_id
      WHERE m.member_status = 0
      ORDER BY m.member_id;
    `);
    return res.rows as LegacyMember[];
  } finally {
    await pg.end();
  }
}

function normalizeZone(z: string | null): string | null {
  if (!z) return null;
  const v = z.trim().toUpperCase();
  return v || null;
}

function splitServices(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);
}

async function upsertMember(
  m: LegacyMember,
  industries: Map<string, number>
): Promise<{ memberId: string | null; skipped: SkippedRow | null }> {
  const company = (m.company ?? m.member_name ?? "").trim();
  if (!company) {
    return {
      memberId: null,
      skipped: {
        member_id: m.member_id,
        reason: "no company name",
        company: m.company,
        email: m.email_address,
      },
    };
  }
  const industryId =
    m.industry_name && industries.get(m.industry_name.toLowerCase())
      ? industries.get(m.industry_name.toLowerCase())!
      : null;
  const zoneId = normalizeZone(m.member_zone);

  // Upsert by legacy_member_id so re-runs are idempotent.
  const { data, error } = await supabase
    .from("members")
    .upsert(
      {
        legacy_member_id: m.member_id,
        registered_id: m.member_registered_id,
        company_name: company,
        contact_name: m.member_name?.trim() || null,
        first_name: m.first_name?.trim() || null,
        last_name: m.last_name?.trim() || null,
        email: m.email_address?.trim().toLowerCase() || null,
        phone: m.phone_number?.trim() || null,
        industry_id: industryId,
        zone_id: zoneId,
        description: m.business_area?.trim() || null,
        services: splitServices(m.service_provided),
        logo_url: m.company_logo?.trim() || null,
        city: m.member_city?.trim() || null,
        state: m.member_state?.trim() || null,
        address_line1: m.member_address1?.trim() || null,
        date_of_joining: m.date_of_joining,
        status: "active",
      },
      { onConflict: "legacy_member_id" }
    )
    .select("id")
    .maybeSingle();
  if (error) {
    return {
      memberId: null,
      skipped: {
        member_id: m.member_id,
        reason: error.message,
        company,
        email: m.email_address,
      },
    };
  }
  return { memberId: data?.id ?? null, skipped: null };
}

async function ensureAuthUser(
  email: string | null,
  role: "admin" | "zone_user" | "member",
  zone: string | null,
  displayName: string,
  linkMemberId: string | null
): Promise<{ created: boolean; resetLink?: string; skipped?: string }> {
  if (!email) return { created: false, skipped: "no email" };

  // Look up existing user.
  const { data: existing } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1,
    // listUsers doesn't filter by email server-side; do it client-side.
  });
  const existingUser =
    existing?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ??
    null;

  if (existingUser) {
    // Refresh app_metadata to the desired role/zone.
    await supabase.auth.admin.updateUserById(existingUser.id, {
      app_metadata: {
        role,
        zone,
        display_name: displayName,
      },
      user_metadata: { full_name: displayName },
    });
    if (linkMemberId) {
      await supabase
        .from("members")
        .update({ user_id: existingUser.id })
        .eq("id", linkMemberId);
    }
    return { created: false };
  }

  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: { role, zone, display_name: displayName },
    user_metadata: { full_name: displayName },
  });
  if (error || !created?.user) {
    return { created: false, skipped: error?.message ?? "create failed" };
  }
  if (linkMemberId) {
    await supabase
      .from("members")
      .update({ user_id: created.user.id })
      .eq("id", linkMemberId);
  }

  const { data: link } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${SITE_URL}/profile?reset=1` },
  });
  return { created: true, resetLink: link?.properties?.action_link };
}

async function createOperators() {
  const operators: Array<{
    email: string;
    role: "admin" | "zone_user";
    zone: string | null;
    name: string;
  }> = [
    { email: "admin@b4bc.org", role: "admin", zone: null, name: "B4BC Admin" },
    { email: "west@b4bc.org", role: "zone_user", zone: "WEST", name: "B4BC West" },
    { email: "east@b4bc.org", role: "zone_user", zone: "EAST", name: "B4BC East" },
    {
      email: "north@b4bc.org",
      role: "zone_user",
      zone: "NORTH",
      name: "B4BC North",
    },
    {
      email: "south@b4bc.org",
      role: "zone_user",
      zone: "SOUTH",
      name: "B4BC South",
    },
    {
      email: "bangalore@b4bc.org",
      role: "zone_user",
      zone: "BANGALORE",
      name: "B4BC Bangalore",
    },
    {
      email: "chennai@b4bc.org",
      role: "zone_user",
      zone: "CHENNAI",
      name: "B4BC Chennai",
    },
    {
      email: "coimbatore@b4bc.org",
      role: "zone_user",
      zone: "COIMBATORE",
      name: "B4BC Coimbatore",
    },
    {
      email: "mumbai@b4bc.org",
      role: "zone_user",
      zone: "MUMBAI",
      name: "B4BC Mumbai",
    },
  ];
  const out: Array<{ email: string; role: string; resetLink?: string }> = [];
  for (const op of operators) {
    const result = await ensureAuthUser(op.email, op.role, op.zone, op.name, null);
    out.push({
      email: op.email,
      role: op.role,
      resetLink: result.resetLink,
    });
    console.log(
      `  ${op.role.padEnd(10)} ${op.email}${result.created ? " (created)" : " (already exists)"}`
    );
  }
  return out;
}

async function main() {
  console.log("→ Fetching legacy members…");
  const rows = await fetchLegacyMembers();
  console.log(`  found ${rows.length} active member rows`);

  console.log("→ Building industries…");
  const industryNames = Array.from(
    new Set(rows.map((r) => r.industry_name ?? "").filter(Boolean))
  ).sort();
  const industries = await ensureIndustries(industryNames);
  console.log(`  ensured ${industries.size} industries`);

  console.log("→ Ensuring zones…");
  await ensureZones();

  console.log("→ Upserting member rows…");
  const skipped: SkippedRow[] = [];
  const members: Array<{
    legacy_member_id: number;
    member_id: string;
    email: string | null;
    company_name: string;
  }> = [];
  let processed = 0;
  for (const m of rows) {
    const { memberId, skipped: s } = await upsertMember(m, industries);
    if (s) skipped.push(s);
    if (memberId)
      members.push({
        legacy_member_id: m.member_id,
        member_id: memberId,
        email: m.email_address?.trim().toLowerCase() ?? null,
        company_name: m.company ?? m.member_name ?? "(unknown)",
      });
    if (++processed % 50 === 0) console.log(`  …${processed} / ${rows.length}`);
  }
  console.log(`  upserted ${members.length} members, skipped ${skipped.length}`);

  console.log("→ Creating admin + zone operators…");
  const operators = await createOperators();

  console.log("→ Creating member auth users + recovery links…");
  const memberLinks: Array<{
    email: string;
    company_name: string;
    resetLink?: string;
  }> = [];
  let counter = 0;
  for (const m of members) {
    if (!m.email) {
      skipped.push({
        member_id: m.legacy_member_id,
        reason: "no email — cannot create auth user",
        company: m.company_name,
        email: null,
      });
      continue;
    }
    const result = await ensureAuthUser(
      m.email,
      "member",
      null,
      m.company_name,
      m.member_id
    );
    if (result.skipped) {
      skipped.push({
        member_id: m.legacy_member_id,
        reason: `auth: ${result.skipped}`,
        company: m.company_name,
        email: m.email,
      });
      continue;
    }
    memberLinks.push({
      email: m.email,
      company_name: m.company_name,
      resetLink: result.resetLink,
    });
    if (++counter % 25 === 0)
      console.log(`  …${counter} / ${members.length} auth users`);
  }
  console.log(
    `  ensured ${memberLinks.length} member auth users; ${skipped.length} skipped`
  );

  // Persist a CSV the user can hand off to email sending later.
  const fs = await import("node:fs/promises");
  const csv = [
    "email,company_name,reset_link",
    ...memberLinks.map(
      (r) =>
        `${r.email},"${(r.company_name ?? "").replace(/"/g, '""')}",${r.resetLink ?? ""}`
    ),
  ].join("\n");
  await fs.writeFile("scripts/output/member-reset-links.csv", csv);

  const operatorsCsv = [
    "email,role,reset_link",
    ...operators.map(
      (o) => `${o.email},${o.role},${o.resetLink ?? "(already existed)"}`
    ),
  ].join("\n");
  await fs.writeFile("scripts/output/operator-reset-links.csv", operatorsCsv);

  if (skipped.length) {
    const skippedCsv = [
      "legacy_member_id,company,email,reason",
      ...skipped.map(
        (s) =>
          `${s.member_id},"${(s.company ?? "").replace(/"/g, '""')}",${s.email ?? ""},${s.reason}`
      ),
    ].join("\n");
    await fs.writeFile("scripts/output/skipped.csv", skippedCsv);
  }

  console.log("");
  console.log("Done.");
  console.log(`  members upserted        : ${members.length}`);
  console.log(`  auth users ensured      : ${memberLinks.length}`);
  console.log(`  operators ensured       : ${operators.length}`);
  console.log(`  skipped rows            : ${skipped.length}`);
  console.log("");
  console.log("Output:");
  console.log("  scripts/output/member-reset-links.csv");
  console.log("  scripts/output/operator-reset-links.csv");
  if (skipped.length) console.log("  scripts/output/skipped.csv");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
