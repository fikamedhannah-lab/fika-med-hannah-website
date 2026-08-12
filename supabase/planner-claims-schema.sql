-- =========================================================
-- Fika med Hannah — planner claim tracking schema
-- ---------------------------------------------------------
-- Run this once in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste → Run).
--
-- Security model: the anon (public, client-side) role is NOT granted
-- any direct access to the tables below — only EXECUTE on the two
-- functions at the bottom. Both functions are SECURITY DEFINER so
-- they can read/write the tables on the anon caller's behalf, but the
-- functions only expose exactly the typed parameters/columns needed
-- (no raw SQL from the client, no arbitrary table reads/writes).
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists public.planner_claims (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  overall_level text,
  marketing_consent boolean not null default false,
  claim_number int not null,
  created_at timestamptz not null default now()
);

create table if not exists public.planner_claim_counter (
  id int primary key default 1,
  count int not null default 0,
  constraint single_row check (id = 1)
);
insert into public.planner_claim_counter (id, count) values (1, 0)
  on conflict (id) do nothing;

alter table public.planner_claims enable row level security;
alter table public.planner_claim_counter enable row level security;
-- No policies are created on purpose: with RLS on and zero policies,
-- even the anon/authenticated roles get zero direct table access.
-- All access must go through the SECURITY DEFINER functions below.

-- Atomically claims the next spot for an email (idempotent: re-submitting
-- the same email returns the original claim_number, doesn't double-count).
create or replace function public.claim_planner_spot(
  p_email text,
  p_overall_level text,
  p_marketing_consent boolean
)
returns table (claim_number int, free_claims_used int, is_free boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_existing_claim_number int;
  v_new_count int;
begin
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email';
  end if;

  select pc.claim_number into v_existing_claim_number
  from planner_claims pc
  where pc.email = v_email;

  if v_existing_claim_number is not null then
    select c.count into v_new_count from planner_claim_counter c where c.id = 1;
    return query select v_existing_claim_number, v_new_count, v_existing_claim_number <= 100;
    return;
  end if;

  update planner_claim_counter set count = count + 1 where id = 1
    returning count into v_new_count;

  insert into planner_claims (email, overall_level, marketing_consent, claim_number)
  values (v_email, p_overall_level, p_marketing_consent, v_new_count);

  return query select v_new_count, v_new_count, v_new_count <= 100;
end;
$$;

revoke all on function public.claim_planner_spot(text, text, boolean) from public;
grant execute on function public.claim_planner_spot(text, text, boolean) to anon;

-- Read-only current claim count, for showing a live "X of 100 left" badge.
create or replace function public.get_planner_claim_count()
returns int
language sql
security definer
set search_path = public
as $$
  select count from planner_claim_counter where id = 1;
$$;

revoke all on function public.get_planner_claim_count() from public;
grant execute on function public.get_planner_claim_count() to anon;
