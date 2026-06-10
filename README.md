# B4BC Connect — Business Directory Webapp

B4BC Connect is a member-only business directory for B4BC. It lets members sign
in, browse active businesses, filter by industry or zone, view business
profiles, inspect their own read-only member record, post public requirements,
and view member feed/messaging workflows.

This README describes the current implementation in this repository.

## Stack

- **Framework**: Next.js 16 App Router, React 19
- **Directory and auth data**: Legacy Hostinger/MySQL database via
  `mysql2/promise`
- **App workflow data**: PostgreSQL via `pg`
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
    |-- PostgreSQL reads/writes app workflow data
    |
    |--> [ Legacy MySQL ]
    |-- b4b_members
    |-- b4b_industry_segments
    |-- b4b_zones
    |-- b4b_chapters
    |
    |--> [ PostgreSQL: b4bc_app schema ]
    |-- requirements / responses / comments / reactions
    |-- saved partners / partner connections
    |-- conversations / participants / messages
    |-- member profiles / preferences / notifications
```

There is no separate API server. The Next.js app queries MySQL from server-only
code for member identity and directory records, and queries PostgreSQL from
server-only code for feed, chat, network, notification, and requirement data.

## Routes

- `/` — redirects signed-in users to `/directory`, otherwise `/login`.
- `/login` — signs in with the email address or phone number on a B4BC member
  record.
- `/directory` — merged member home with totals, industry tiles, requirement
  composer, and a paginated/searchable directory with industry, zone, and sort
  filters.
- `/dashboard` — redirects to `/directory` for old links.
- `/directory/[id]` — full business profile and contact actions.
- `/feed` — public requirements feed backed by PostgreSQL.
- `/messages` — member messaging interface backed by PostgreSQL.
- `/notifications` — member notification list backed by PostgreSQL.
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

MySQL access lives in `src/lib/mysql.ts`. It remains the source for member
identity, login, directory listings, industry segments, zones, and chapters.

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

PostgreSQL access lives in `src/lib/postgres.ts`. It is the source for
app-owned workflow data:

- `b4bc_app.requirements`, tags, attachments, responses, comments, and
  reactions
- `b4bc_app.saved_partners` and `b4bc_app.partner_connections`
- `b4bc_app.conversations`, participants, messages, and message attachments
- `b4bc_app.member_profiles`, `b4bc_app.member_preferences`, and
  `b4bc_app.notifications`

These tables store `legacy_member_id` values that refer to
`b4b_members.member_id` by convention. They do not declare foreign keys to
MySQL because the member directory is in a separate database.

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
APP_DATABASE_URL=
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

## Postgres Migrations

Apply the app database schema:

```bash
psql "$APP_DATABASE_URL" -f db/postgres/migrations/202606050001_app_backend_schema.sql
```

Rollback the schema, if needed:

```bash
psql "$APP_DATABASE_URL" -f db/postgres/migrations/202606050001_app_backend_schema.down.sql
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
      app-queries.ts       # Postgres workflow actions + MySQL member hydration
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
    postgres.ts            # Postgres pool and app workflow SQL helper
    session.ts             # JWT cookie signing/verification
    utils.ts
  proxy.ts                 # Protected route redirects
  types/
    database.ts            # App-facing TypeScript data shapes

scripts/
  extract_legacy_mysql.py  # Legacy export helper

db/
  postgres/
    migrations/            # App-owned Postgres schema migrations

app.js                     # Plesk/Passenger startup file
next.config.ts             # Next config and Plesk path fixes
```
