-- B4BC Connect — initial schema.
-- Mirrors the legacy Django models but tightened for Supabase:
--   * surrogate UUID PKs (matching auth.users for the member -> user link)
--   * proper FKs and indexes
--   * lower_case_with_underscores column names (Supabase/PostgREST convention)
--   * timestamps with tz, defaulted to now()

create extension if not exists "pgcrypto";
create extension if not exists citext;
create extension if not exists pg_trgm;

------------------------------------------------------------
-- Industries
------------------------------------------------------------
create table public.industries (
  id            bigserial primary key,
  name          text not null unique,
  description   text,
  accent_color  text not null default '#0052ff',
  sort_order    int  not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create index industries_sort_idx on public.industries (sort_order, name);

------------------------------------------------------------
-- Zones
------------------------------------------------------------
create table public.zones (
  id       text primary key,            -- uppercased zone code, e.g. 'WEST'
  name     text not null,
  active   boolean not null default true
);

------------------------------------------------------------
-- Members (business listings)
-- A member row may or may not be linked to a Supabase auth user. When linked,
-- `user_id = auth.users.id` and the member can edit their own row.
------------------------------------------------------------
create table public.members (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid unique references auth.users (id) on delete set null,
  legacy_member_id int unique,           -- preserves the id from the Django DB so we can re-run the migration idempotently
  registered_id    text,                 -- legacy "REG-9912" style id
  company_name     text not null,
  contact_name     text,
  first_name       text,
  last_name        text,
  email            citext unique,        -- normalized email for search + auth match
  phone            text,
  industry_id      bigint references public.industries (id) on delete set null,
  zone_id          text   references public.zones (id) on delete set null,
  description      text,                 -- "business area"
  services         text[] not null default '{}',
  logo_url         text,
  city             text,
  state            text,
  address_line1    text,
  pincode          text,
  date_of_joining  date,
  date_of_exit     date,
  status           text not null default 'active' check (status in ('active','inactive','pending')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index members_company_idx       on public.members using gin (company_name gin_trgm_ops);
create index members_contact_idx       on public.members using gin (contact_name gin_trgm_ops);
create index members_search_idx        on public.members using gin (
  to_tsvector('simple', coalesce(company_name,'') || ' ' || coalesce(contact_name,'') || ' ' || coalesce(description,''))
);
create index members_industry_idx      on public.members (industry_id);
create index members_zone_idx          on public.members (zone_id);
create index members_status_idx        on public.members (status);
create index members_user_idx          on public.members (user_id);

-- Touch updated_at on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger members_set_updated_at
before update on public.members
for each row execute function public.set_updated_at();

------------------------------------------------------------
-- Favorites (per-user member bookmarks)
------------------------------------------------------------
create table public.favorites (
  user_id    uuid not null references auth.users (id) on delete cascade,
  member_id  uuid not null references public.members (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, member_id)
);

create index favorites_user_idx on public.favorites (user_id);

------------------------------------------------------------
-- Reports (moderation queue)
------------------------------------------------------------
create table public.reports (
  id             bigserial primary key,
  reporter_id    uuid references auth.users (id) on delete set null,
  member_id      uuid not null references public.members (id) on delete cascade,
  reason         text not null check (length(reason) <= 80),
  note           text,
  status         text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at     timestamptz not null default now()
);

create index reports_member_idx on public.reports (member_id);
create index reports_status_idx on public.reports (status);

------------------------------------------------------------
-- Privacy: account deletion / data export requests
------------------------------------------------------------
create table public.user_deletion_requests (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  requested_at     timestamptz not null default now(),
  deletion_after   timestamptz not null,
  status           text not null default 'scheduled' check (status in ('scheduled','cancelled','completed'))
);

create table public.user_exports (
  id            bigserial primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  requested_at  timestamptz not null default now(),
  download_url  text,
  expires_at    timestamptz
);

------------------------------------------------------------
-- View: directory members + denormalized lookups for cheap reads.
-- Used by the Next app for listings/detail without extra joins.
------------------------------------------------------------
create or replace view public.directory_members as
select
  m.id,
  m.user_id,
  m.company_name,
  m.contact_name,
  m.email,
  m.phone,
  m.description,
  m.services,
  m.logo_url,
  m.city,
  m.state,
  m.address_line1,
  m.pincode,
  m.status,
  m.created_at,
  m.updated_at,
  m.industry_id,
  i.name        as industry_name,
  i.accent_color as industry_accent_color,
  m.zone_id,
  z.name        as zone_name
from public.members m
left join public.industries i on i.id = m.industry_id
left join public.zones      z on z.id = m.zone_id
where m.status = 'active';

------------------------------------------------------------
-- Initial seed: zones (industries get populated by the data migration)
------------------------------------------------------------
insert into public.zones (id, name) values
  ('BANGALORE','Bangalore'),
  ('CHENNAI','Chennai'),
  ('COIMBATORE','Coimbatore'),
  ('MUMBAI','Mumbai'),
  ('OTHERS','Others'),
  ('WEST','West'),
  ('EAST','East'),
  ('NORTH','North'),
  ('SOUTH','South')
on conflict (id) do nothing;
