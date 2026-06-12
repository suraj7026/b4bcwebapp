# MySQL app tables

These migrations create app-owned B4BC Connect tables inside the legacy MySQL
database without altering legacy tables.

All tables use the `b4bc_app_` prefix so they remain separate from existing
legacy tables such as `b4b_members`, `b4b_industry_segments`, `b4b_zones`, and
`b4b_chapters`.

The app-owned tables store legacy member ids by convention only. They do not add
foreign keys to any legacy member table.

## Apply

Set the legacy MySQL environment variables, then run:

```sh
MYSQL_PWD="$LEGACY_MYSQL_PASSWORD" mysql \
  --host="$LEGACY_MYSQL_HOST" \
  --port="$LEGACY_MYSQL_PORT" \
  --user="$LEGACY_MYSQL_USER" \
  "$LEGACY_MYSQL_DB" < db/mysql/migrations/202606120001_app_backend_schema.sql
```

Rollback, if needed:

```sh
MYSQL_PWD="$LEGACY_MYSQL_PASSWORD" mysql \
  --host="$LEGACY_MYSQL_HOST" \
  --port="$LEGACY_MYSQL_PORT" \
  --user="$LEGACY_MYSQL_USER" \
  "$LEGACY_MYSQL_DB" < db/mysql/migrations/202606120001_app_backend_schema.down.sql
```
