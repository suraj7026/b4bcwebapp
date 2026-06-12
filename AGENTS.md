# Repository Notes

This repository is the current B4BC Connect implementation:

- Next.js 16 App Router with React 19.
- Direct Hostinger/MySQL access through `mysql2/promise` for legacy directory
  reads and app-owned workflow tables.
- Custom member login using email or phone lookup in `b4b_members`.
- JWT session cookie named `b4bc_session`, signed with `SESSION_SECRET`.
- TanStack Query client state and server actions for data reads.
- Tailwind CSS v4 styling with local UI components.

Keep guidance, docs, and implementation aligned with the routes and data paths
that are present in this repository.

## Implemented Routes

- `/` redirects to `/directory` when signed in, otherwise `/login`.
- `/login` signs in using a member email address or phone number.
- `/directory` is the merged member home: stats, industry tiles, requirement
  composer, and searchable/filterable/paginated member listings.
- `/dashboard` redirects to `/directory`.
- `/directory/[id]` shows a full member/business profile.
- `/feed` shows public requirement feed data from app-owned MySQL tables and hydrates
  member names from MySQL.
- `/messages` shows member conversations from app-owned MySQL tables and hydrates member
  names from MySQL.
- `/notifications` shows signed-in member notifications from app-owned MySQL
  tables.
- `/profile` shows the signed-in member record as read-only data.
- `/settings` shows app-owned profile and notification settings from app-owned
  MySQL tables.

Protected routes are enforced in `src/proxy.ts`.

## Data Model

The app reads legacy tables including:

- `b4b_members`
- `b4b_industry_segments`
- `b4b_zones`
- `b4b_chapters`

Active members are rows where `date_of_exit IS NULL` or
`date_of_exit = '0000-00-00'`.

Many legacy rows have missing `industry`, so `src/lib/mysql.ts` derives a
synthetic industry id from `business_area` and `service_provided`. Preserve that
behavior unless replacing it with a verified data cleanup.

App-owned tables live in the same MySQL database with a `b4bc_app_` prefix.
They store `legacy_member_id` values that refer to `b4b_members.member_id` by
convention only; do not add foreign keys to legacy `b4b_*` tables.

MySQL app migrations live in `db/mysql/`.

## Environment

Required server-side environment variables:

- `LEGACY_MYSQL_HOST`
- `LEGACY_MYSQL_PORT`
- `LEGACY_MYSQL_USER`
- `LEGACY_MYSQL_PASSWORD`
- `LEGACY_MYSQL_DB`
- `SESSION_SECRET`

Public media URL:

- `NEXT_PUBLIC_MEDIA_BASE_URL`

## Deployment

The project includes `app.js` as a Plesk/Phusion Passenger startup file.
`next.config.ts` contains Windows/Plesk path-casing workarounds and standalone
output configuration. Keep those deployment constraints in mind when changing
build or runtime behavior.
