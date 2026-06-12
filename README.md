# B4BC Connect — Business Directory Webapp

B4BC Connect is a member-only business directory for B4BC. It lets members sign
in, browse active businesses, filter by industry or zone, view business
profiles, inspect their own read-only member record, post public requirements,
and view member feed/messaging workflows.

This README describes the current implementation in this repository.

## Stack

- **Framework**: Next.js 16 App Router, React 19
- **Data**: Legacy Hostinger/MySQL database via `mysql2/promise`
  for both read-only legacy directory data and app-owned `b4bc_app_*`
  workflow tables
- **Auth**: Custom email-or-phone member lookup plus signed JWT cookie
- **Session**: HTTP-only `b4bc_session` cookie signed with `SESSION_SECRET`
- **State**: TanStack Query v5
- **Styling**: Tailwind CSS v4, Inter, Lucide icons, local UI components
- **Deployment**: Plesk/Phusion Passenger compatible `app.js`, standalone Next
  output

## Architecture

```text
[ Browser ]
    |
    v
[ Next.js app ]
    |-- proxy verifies b4bc_session
    |-- server actions read/write cookies and query data
    |-- MySQL reads member identity and directory data
    |-- MySQL reads/writes app-owned workflow data
    |
    |--> [ MySQL ]
    |-- b4b_members
    |-- b4b_industry_segments
    |-- b4b_zones
    |-- b4b_chapters
    |-- b4bc_app_requirements / responses / comments / reactions
    |-- b4bc_app_saved_partners / partner_connections
    |-- b4bc_app_conversations / participants / messages
    |-- b4bc_app_member_profiles / preferences / notifications
```

There is no separate API server. The Next.js app queries MySQL from server-only
code for member identity, directory records, feed, chat, network,
notification, and requirement data.

## Routes

- `/` — redirects signed-in users to `/directory`, otherwise `/login`.
- `/login` — signs in with the email address or phone number on a B4BC member
  record.
- `/directory` — merged member home with totals, industry tiles, requirement
  composer, and a paginated/searchable directory with industry, zone, and sort
  filters.
- `/dashboard` — redirects to `/directory` for old links.
- `/directory/[id]` — full business profile and contact actions.
- `/feed` — public requirements feed backed by app-owned MySQL tables.
- `/messages` — member messaging interface backed by app-owned MySQL tables.
- `/notifications` — member notification list backed by app-owned MySQL tables.
- `/profile` — read-only view of the signed-in member record.
- `/settings` — app-owned profile settings and notification preferences.

Protected routes are `/dashboard`, `/directory`, `/feed`, `/messages`,
`/notifications`, `/profile`, and `/settings`.

## Authentication

Login is handled by `src/app/actions/auth.ts`.

1. The user enters an email address or phone number.
2. The app looks for an active row in `b4b_members`.
3. If found, the app signs a JWT containing `memberId`.
4. The token is stored in the HTTP-only `b4bc_session` cookie.

There is currently no password flow, signup flow, role model, or admin UI in
this implementation.

## Data Access

MySQL access lives in `src/lib/mysql.ts`. Legacy `b4b_*` tables remain the
source for member identity, login, directory listings, industry segments, zones,
and chapters.

Required tables:

- `b4b_members`
- `b4b_industry_segments`
- `b4b_zones`
- `b4b_chapters`

Active members are filtered as:

```sql
date_of_exit IS NULL OR date_of_exit = '0000-00-00'
```

The legacy data often has a missing `b4b_members.industry` value, so the app
derives an industry id from `business_area` and `service_provided`. That logic
is centralized in `DERIVED_INDUSTRY_SQL` in `src/lib/mysql.ts`.

App-owned workflow tables also live in MySQL with the `b4bc_app_` prefix:

- `b4bc_app_requirements`, tags, attachments, responses, comments, and
  reactions
- `b4bc_app_saved_partners` and `b4bc_app_partner_connections`
- `b4bc_app_conversations`, participants, messages, and message attachments
- `b4bc_app_member_profiles`, `b4bc_app_member_preferences`, and
  `b4bc_app_notifications`
- `b4bc_app_network_activity_events`

These tables store `legacy_member_id` values that refer to
`b4b_members.member_id` by convention. They do not declare foreign keys to
legacy `b4b_*` tables, keeping app-owned data separate from imported member
data.

## Environment

Create `.env.local` from `.env.example` and fill in the real values:

```bash
cp .env.example .env.local
```

Required server-only variables:

```env
LEGACY_MYSQL_HOST=
LEGACY_MYSQL_PORT=3306
LEGACY_MYSQL_USER=
LEGACY_MYSQL_PASSWORD=
LEGACY_MYSQL_DB=
SESSION_SECRET=
```

Public variable:

```env
NEXT_PUBLIC_MEDIA_BASE_URL=https://b4bc.org/people/
```

Generate a session secret with:

```bash
openssl rand -base64 48
```

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with an email
address or phone number that exists on an active `b4b_members` row.

## MySQL App Migrations

Apply the app database schema:

```bash
MYSQL_PWD="$LEGACY_MYSQL_PASSWORD" mysql \
  --host="$LEGACY_MYSQL_HOST" \
  --port="$LEGACY_MYSQL_PORT" \
  --user="$LEGACY_MYSQL_USER" \
  "$LEGACY_MYSQL_DB" < db/mysql/migrations/202606120001_app_backend_schema.sql
```

Rollback the schema, if needed:

```bash
MYSQL_PWD="$LEGACY_MYSQL_PASSWORD" mysql \
  --host="$LEGACY_MYSQL_HOST" \
  --port="$LEGACY_MYSQL_PORT" \
  --user="$LEGACY_MYSQL_USER" \
  "$LEGACY_MYSQL_DB" < db/mysql/migrations/202606120001_app_backend_schema.down.sql
```

## Build

```bash
npm run build
npm start
```

`next.config.ts` sets `output: "standalone"` and contains Windows/Plesk
path-casing workarounds. `app.js` is the production startup file for
Plesk/Phusion Passenger.

## Project Layout

```text
src/
  app/
    (app)/                 # Authenticated app shell
      dashboard/
      directory/
        [id]/
      feed/
      messages/
      profile/
      settings/
    actions/
      auth.ts              # Login/logout server actions
      app-queries.ts       # MySQL app workflow actions + member hydration
      queries.ts           # Directory, profile, dashboard data actions
    login/
    global-error.tsx
    layout.tsx
    page.tsx               # Session-aware redirect
    globals.css
  components/
    auth/
    directory/
    layout/
    ui/
    providers.tsx          # TanStack Query provider
  lib/
    auth.ts                # Current session user lookup
    media.ts               # Media URL helper
    mysql.ts               # MySQL pool and legacy SQL helpers
    session.ts             # JWT cookie signing/verification
    utils.ts
  proxy.ts                 # Protected route redirects
  types/
    database.ts            # App-facing TypeScript data shapes

scripts/
  extract_legacy_mysql.py  # Legacy export helper

db/
  mysql/
    migrations/            # App-owned MySQL schema migrations

app.js                     # Plesk/Passenger startup file
next.config.ts             # Next config and Plesk path fixes
```
