# Postgres app database

These migrations create the app-owned backend tables for B4BC Connect features that do not belong in the legacy member directory database.

The current member directory still comes from the legacy source. New Postgres tables store `legacy_member_id` values to link back to directory members by convention, but they do not declare foreign keys to the legacy database because cross-database foreign keys are not available.

## Tables

- `b4bc_app.member_profiles` and `b4bc_app.member_preferences`: app-specific profile completion, services, verification, and notification settings.
- `b4bc_app.requirements`, tags, attachments, responses, comments, and reactions: the public feed and requirement matching workflow.
- `b4bc_app.saved_partners` and `b4bc_app.partner_connections`: saved directory partners and network connection requests.
- `b4bc_app.conversations`, participants, messages, and message attachments: direct, requirement-based, and connection-based chat.
- `b4bc_app.notifications`: unread counters and activity notifications across feed, chats, and network actions.
- `b4bc_app.network_activity_events`: canonical dashboard/network activity events derived from app-owned Postgres actions.

## Apply

Set `APP_DATABASE_URL` to the new Postgres database, then run:

```sh
psql "$APP_DATABASE_URL" -f db/postgres/migrations/202606050001_app_backend_schema.sql
psql "$APP_DATABASE_URL" -f db/postgres/migrations/202606100001_network_activity_log.sql
```

Rollback, if needed:

```sh
psql "$APP_DATABASE_URL" -f db/postgres/migrations/202606050001_app_backend_schema.down.sql
psql "$APP_DATABASE_URL" -f db/postgres/migrations/202606100001_network_activity_log.down.sql
```

This only creates schema objects in Postgres. It does not change the legacy MySQL directory or wire the Next.js app to Postgres yet.
