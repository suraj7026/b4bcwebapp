# B4BC Connect — Business Directory Webapp

Next.js 16 + Supabase webapp for the B4BC business directory. No separate
backend — the Next.js app talks straight to Supabase (Postgres + Auth +
Row-Level Security) using the publishable key on the client and the
service-role secret in scripts.

## Stack
- **Framework**: Next.js 16 (App Router, React 19, Turbopack)
- **Backend**: Supabase (Postgres + Auth + RLS + Storage)
- **Auth**: Email + password through Supabase Auth; admin / zone-user /
  member roles encoded in `app_metadata`
- **State**: TanStack Query v5
- **Styling**: Tailwind CSS v4, design tokens from the Stitch "B4BC Connect
  Business Directory" project (Inter, `#003ec7` primary, Material Symbols)

## Architecture
```
[ Browser ] ──► b4bcwebapp (Next.js on Vercel)
                  │ @supabase/supabase-js
                  ▼
            Supabase project
            ├─ Postgres  (industries, zones, members, favorites, reports, …)
            ├─ Auth      (admin / zone_user / member)
            ├─ Storage   (optional — currently linking external logos)
            └─ RLS       (admin → all, zone_user → own zone, member → self)
```

## Routes
- `/login` — Supabase email/password + magic-link sign-in.
- `/dashboard` — totals + industry tiles.
- `/directory` — paginated, searchable directory with industry/zone/sort
  filters; `keepPreviousData` for smooth refetches; pagination via offset.
- `/directory/[id]` — full business profile, contact actions, favorite +
  report flows.
- `/favorites` — saved members.
- `/profile` — current user info; for `role=member`, an inline edit form on
  the linked `members` row.
- `/privacy` — schedule deletion + request export.

## Supabase

### Schema
SQL lives in [`supabase/migrations/`](supabase/migrations). Apply with:
```bash
psql "$LEGACY_DATABASE_URL" -f supabase/migrations/20260526120000_init.sql
psql "$LEGACY_DATABASE_URL" -f supabase/migrations/20260526120100_rls.sql
```
…or paste them into the Supabase SQL editor in the dashboard.

Tables (all under `public`):
- `industries`, `zones` — reference data.
- `members` — primary business listing. `user_id` FKs to `auth.users` so a
  member account can edit its own row.
- `favorites` — `(user_id, member_id)` bookmarks.
- `reports` — moderation queue.
- `user_deletion_requests`, `user_exports` — GDPR-ish actions.

Plus a `directory_members` view that denormalises industry + zone for cheap
read-side joins.

### RLS
Roles + zone live in `auth.users.app_metadata`:
```jsonc
{ "role": "admin" }                       // sees everything
{ "role": "zone_user", "zone": "WEST" }   // sees only WEST members
{ "role": "member" }                      // sees all active members; edits own row
```
Policies in [`20260526120100_rls.sql`](supabase/migrations/20260526120100_rls.sql).

### Migration from the old Django Postgres
[`scripts/migrate-from-legacy.ts`](scripts/migrate-from-legacy.ts) reads from
the legacy `b4b_members` / `b4b_industry_segments` tables and:
1. Upserts industries (creates 1 row per unique `segment_name`).
2. Upserts `public.zones` (idempotent).
3. Upserts `public.members` keyed by `legacy_member_id` (re-runs safely).
4. Creates a Supabase Auth user for every member with a valid email and
   captures a recovery link in `scripts/output/member-reset-links.csv`.
5. Creates the admin + zone-operator accounts
   (`admin@b4bc.org`, `west@b4bc.org`, etc.) with `app_metadata` set and
   logs their recovery links to `scripts/output/operator-reset-links.csv`.
6. Anything we couldn't migrate ends up in `scripts/output/skipped.csv`.

Run it:
```bash
# In .env.local:
# NEXT_PUBLIC_SUPABASE_URL=...
# SUPABASE_SECRET_KEY=...           ← the service_role key
# LEGACY_DATABASE_URL=postgres://... (the old b4bc_api DB)

npx tsx scripts/migrate-from-legacy.ts
```

## Local development
```bash
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm install
npm run dev
```

Open http://localhost:3000 and sign in with any auth user you've created.

## Deploying to Vercel
1. Import `suraj7026/b4bcwebapp` into Vercel.
2. Add three environment variables to **Production + Preview + Development**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_MEDIA_BASE_URL` (default `https://b4bc.org/people/`)
3. (Optional, server-only) `SUPABASE_SECRET_KEY` for any server actions or
   API routes that need to bypass RLS. **Don't** prefix with `NEXT_PUBLIC_`.
4. Deploy.

No backend host, no Postgres procurement, no CORS gymnastics. Supabase
covers all three.

## Project layout
```
src/
  app/
    (app)/                 # Authed shell
      dashboard/
      directory/
        [id]/
      favorites/
      profile/
      privacy/
    login/
    layout.tsx
    page.tsx               # Redirects to /login or /directory
    globals.css            # Tailwind tokens + design system
  components/
    layout/top-bar.tsx
    directory/
      business-card.tsx
      filters-panel.tsx
      report-dialog.tsx
      logo.tsx
    ui/                    # Button, Input, Card, Chip, Icon
    providers.tsx          # TanStack Query
  lib/
    auth.ts                # getSessionUser() server helper
    media.ts               # resolveLogoUrl()
    supabase-queries.ts    # typed queries used by the pages
    utils.ts
  middleware.ts            # Wraps utils/supabase/middleware.updateSession
  types/database.ts        # Hand-written Database type for the JS client
  utils/supabase/
    server.ts              # createClient() for RSC / route handlers
    client.ts              # createClient() for "use client"
    middleware.ts          # session refresher

supabase/
  config.toml
  migrations/
    20260526120000_init.sql
    20260526120100_rls.sql

scripts/
  migrate-from-legacy.ts
```
