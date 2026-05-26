-- B4BC Connect — Row-Level Security policies.
--
-- Roles live in app_metadata so they're trusted (only the service_role key can
-- set/change them) — never in user_metadata.
--   admin     : see + edit everything
--   zone_user : see + edit members whose zone_id matches their app_metadata.zone
--   member    : see all active members + edit only their own row
-- Anonymous users get nothing back from anything except `industries`/`zones`
-- so the public site can show landing data, but the directory itself is gated.

-- Helper: pull role / zone from the JWT's app_metadata.
create or replace function public.app_role()
returns text
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role')::text, 'anon')
$$;

create or replace function public.app_zone()
returns text
language sql
stable
as $$
  select (auth.jwt() -> 'app_metadata' ->> 'zone')::text
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$ select public.app_role() = 'admin' $$;

create or replace function public.is_zone_user()
returns boolean language sql stable as $$ select public.app_role() = 'zone_user' $$;

create or replace function public.is_member()
returns boolean language sql stable as $$ select public.app_role() = 'member' $$;

------------------------------------------------------------
-- industries
------------------------------------------------------------
alter table public.industries enable row level security;

create policy "industries readable to all signed-in users"
on public.industries
for select
to authenticated
using (true);

create policy "admins manage industries"
on public.industries
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

------------------------------------------------------------
-- zones
------------------------------------------------------------
alter table public.zones enable row level security;

create policy "zones readable to all signed-in users"
on public.zones
for select
to authenticated
using (true);

create policy "admins manage zones"
on public.zones
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

------------------------------------------------------------
-- members
------------------------------------------------------------
alter table public.members enable row level security;

-- Read: admins see everything; zone_user sees their zone; members see all active.
create policy "members read by role"
on public.members
for select
to authenticated
using (
  public.is_admin()
  or (public.is_zone_user() and zone_id = public.app_zone())
  or (public.is_member() and status = 'active')
);

-- Self-update: a member can edit their own row.
create policy "members can update their own row"
on public.members
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Admin/zone updates.
create policy "admins update any member"
on public.members
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "zone users update their zone members"
on public.members
for update
to authenticated
using (public.is_zone_user() and zone_id = public.app_zone())
with check (public.is_zone_user() and zone_id = public.app_zone());

-- Inserts: only admins/zone users (members are created via the migration script
-- or by the admin in the dashboard).
create policy "admins insert members"
on public.members
for insert
to authenticated
with check (public.is_admin());

create policy "zone users insert into their zone"
on public.members
for insert
to authenticated
with check (public.is_zone_user() and zone_id = public.app_zone());

-- Deletes: admin only.
create policy "admins delete members"
on public.members
for delete
to authenticated
using (public.is_admin());

------------------------------------------------------------
-- favorites
------------------------------------------------------------
alter table public.favorites enable row level security;

create policy "users see their own favorites"
on public.favorites
for select
to authenticated
using (user_id = auth.uid());

create policy "users manage their own favorites"
on public.favorites
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

------------------------------------------------------------
-- reports
------------------------------------------------------------
alter table public.reports enable row level security;

create policy "reporters see their own reports"
on public.reports
for select
to authenticated
using (reporter_id = auth.uid());

create policy "admins see all reports"
on public.reports
for select
to authenticated
using (public.is_admin());

create policy "any authenticated user can file a report"
on public.reports
for insert
to authenticated
with check (reporter_id = auth.uid());

create policy "admins can update report status"
on public.reports
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

------------------------------------------------------------
-- privacy
------------------------------------------------------------
alter table public.user_deletion_requests enable row level security;
alter table public.user_exports           enable row level security;

create policy "user manages own deletion request"
on public.user_deletion_requests
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "user manages own exports"
on public.user_exports
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
