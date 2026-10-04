-- Budgeting sync tables: saved plans, cut-offs, and allocations.
-- These tables are planning data only and do not represent wallet balances or transactions.

create table if not exists public.budget_plans (
  id text primary key,
  uuid text unique not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  notes text,
  sort_order integer not null default 0,
  last_modified timestamptz not null default timezone('utc', now())
);

create table if not exists public.budget_cutoffs (
  id text primary key,
  uuid text unique not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_uuid text not null references public.budget_plans(uuid) on delete cascade,
  label text not null,
  cutoff_date timestamptz,
  estimated_amount numeric(18, 2) not null default 0,
  notes text,
  sort_order integer not null default 0,
  last_modified timestamptz not null default timezone('utc', now())
);

create table if not exists public.budget_allocations (
  id text primary key,
  uuid text unique not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  cutoff_uuid text not null references public.budget_cutoffs(uuid) on delete cascade,
  particulars text not null,
  amount numeric(18, 2) not null,
  category text,
  payment_method text,
  notes text,
  sort_order integer not null default 0,
  last_modified timestamptz not null default timezone('utc', now())
);

create index if not exists idx_budget_plans_user_last_modified
  on public.budget_plans (user_id, last_modified desc);

create index if not exists idx_budget_cutoffs_user_plan
  on public.budget_cutoffs (user_id, plan_uuid, sort_order);

create index if not exists idx_budget_allocations_user_cutoff
  on public.budget_allocations (user_id, cutoff_uuid, sort_order);

alter table public.budget_plans enable row level security;
alter table public.budget_cutoffs enable row level security;
alter table public.budget_allocations enable row level security;

drop policy if exists "budget plans owner access" on public.budget_plans;
create policy "budget plans owner access"
  on public.budget_plans
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "budget cutoffs owner access" on public.budget_cutoffs;
create policy "budget cutoffs owner access"
  on public.budget_cutoffs
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "budget allocations owner access" on public.budget_allocations;
create policy "budget allocations owner access"
  on public.budget_allocations
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
