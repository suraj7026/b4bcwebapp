# B4BC Connect — Business Directory Webapp

Next.js 16 (App Router, TypeScript, Tailwind v4) frontend for the B4BC
business directory. Talks to the Django REST API at `../b4bc_api` (mounted at
`/v1/*`) through a server-side BFF layer that keeps the JWT pair in an
encrypted, http-only cookie.

## Stack
- **Framework**: Next.js 16 (App Router, React 19, Turbopack)
- **Styling**: Tailwind CSS v4 + custom design tokens from the Stitch
  "B4BC Connect Business Directory" project (Executive Minimalist palette,
  `#003ec7` primary, Inter typography, Material Symbols icons)
- **State**: TanStack Query v5
- **Validation**: Zod
- **Session**: JOSE-signed http-only cookie (`b4bc_session`) holding the
  access/refresh token pair from `/v1/auth/login`

## Routes
- `/login` — operator sign-in (admin or zone user, e.g. `b4bc_admin`,
  `b4bc_west`).
- `/dashboard` — industries dashboard, totals + grid of industry segments.
- `/directory` — searchable, paginated business directory with industry, zone
  and sort filters; featured first card.
- `/directory/[id]` — full business profile, contact actions, favorite +
  report flows.
- `/favorites` — saved members.
- `/profile` — current user info; if signed in as a `member`, full
  `PATCH /v1/members/me` form.
- `/privacy` — data export + scheduled account deletion (GDPR).

## API mapping (Django `b4bc_api` → BFF → client)
| Django endpoint                   | BFF route                          |
| --------------------------------- | ---------------------------------- |
| `POST /v1/auth/login`             | `POST /api/bff/login`              |
| `POST /v1/auth/logout`            | `POST /api/bff/logout`             |
| `POST /v1/auth/refresh`           | (internal — auto on 401)           |
| `GET  /v1/auth/me`                | `GET  /api/bff/me`                 |
| `GET  /v1/industries`             | `GET  /api/bff/industries`         |
| `GET  /v1/zones`                  | `GET  /api/bff/zones`              |
| `GET  /v1/members`                | `GET  /api/bff/members`            |
| `GET  /v1/members/<id>`           | `GET  /api/bff/members/[id]`       |
| `PATCH /v1/members/me`            | `PATCH /api/bff/members/me`        |
| `GET  /v1/favorites`              | `GET  /api/bff/favorites`          |
| `PUT/DELETE /v1/favorites/<id>`   | `PUT/DELETE /api/bff/favorites/[id]` |
| `POST /v1/members/<id>/report`    | `POST /api/bff/members/[id]/report` |
| `GET  /v1/users/me/export`        | `GET  /api/bff/privacy/export`     |
| `DELETE /v1/users/me`             | `DELETE /api/bff/privacy/delete`   |

## Running locally
```bash
# 1. Start the Django API at http://localhost:8000
cd ../b4bc_api && python manage.py runserver 0.0.0.0:8000

# 2. Configure the webapp
cp .env.example .env.local
# Edit NEXT_PUBLIC_API_BASE_URL and SESSION_SECRET (32+ random bytes)

# 3. Install + start
npm install
npm run dev
```

Open http://localhost:3000 and sign in with operator credentials configured
on the Django side (e.g. `b4bc_admin` / `@Admin2026` when the matching
`B4BC_ADMIN_USERNAME` and `B4BC_ADMIN_PASSWORD_HASH` envs are set).

## Layout
```
src/
  app/
    (app)/                 # Authed shell with TopBar
      dashboard/
      directory/
        [id]/
      favorites/
      profile/
      privacy/
    api/bff/               # Server-only BFF routes
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
    ui/                    # Button, Input, Card, Chip, Icon
    providers.tsx          # TanStack Query
  lib/
    api/
      types.ts             # Shared TS types for the API
      server.ts            # Server-only API client + token refresh
      client.ts            # Client-only wrapper that talks to BFF
    session.ts             # JWT-signed cookie session
    env.ts
    utils.ts
  middleware.ts            # Redirects unauthenticated traffic to /login
```

## Notes
- The `(app)` group enforces auth via the layout; `middleware.ts` does the
  unauthenticated → `/login` redirect for fast bounce.
- The session cookie carries the refresh token plus the user identity. When
  the access token has <30s left, the BFF transparently rotates it via
  `/v1/auth/refresh`. A 401 from the API triggers a single retry through the
  same rotation path.
- All write actions (favorites, profile patch, reports, privacy actions)
  call the API through the BFF so the JWT never leaves the server.
