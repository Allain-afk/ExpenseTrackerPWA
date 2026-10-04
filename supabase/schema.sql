-- Run in Supabase SQL Editor.
-- Uses quoted camelCase columns to match current app payloads.

create extension if not exists pgcrypto;

create table if not exists public.wallets (
  uuid text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  "colorValue" bigint not null,
  "isHidden" integer not null default 0,
  "sortOrder" integer not null default 0,
  last_modified timestamptz not null default timezone('utc', now())
);

-- Existing projects may already have colorValue as integer.
-- Flutter/ARGB color numbers can exceed int32, so force bigint.
alter table public.wallets
  alter column "colorValue" type bigint using "colorValue"::bigint;

create table if not exists public.expense_groups (
  uuid text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  "createdAt" timestamptz not null default timezone('utc', now()),
  "updatedAt" timestamptz not null default timezone('utc', now()),
  last_modified timestamptz not null default timezone('utc', now())
);

create table if not exists public.transactions (
  uuid text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(18, 2) not null,
  category text not null,
  description text not null,
  date timestamptz not null,
  type text not null check (type in ('income', 'expense')),
  "imagePath" text,
  "groupId" integer,
  "walletId" integer,
  group_uuid text,
  wallet_uuid text,
  last_modified timestamptz not null default timezone('utc', now())
);

create table if not exists public.budgets (
  id text primary key,
  uuid text unique not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  limit_amount numeric(18, 2) not null,
  last_modified timestamptz not null default timezone('utc', now())
);

-- Planning data only; these tables do not affect wallet balances or transactions.
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

create index if not exists idx_wallets_user_last_modified
  on public.wallets (user_id, last_modified desc);

create index if not exists idx_groups_user_last_modified
  on public.expense_groups (user_id, last_modified desc);

create index if not exists idx_transactions_user_last_modified
  on public.transactions (user_id, last_modified desc);

create index if not exists idx_budgets_user_last_modified
  on public.budgets (user_id, last_modified desc);

create index if not exists idx_budget_plans_user_last_modified
  on public.budget_plans (user_id, last_modified desc);

create index if not exists idx_budget_cutoffs_user_plan
  on public.budget_cutoffs (user_id, plan_uuid, sort_order);

create index if not exists idx_budget_allocations_user_cutoff
  on public.budget_allocations (user_id, cutoff_uuid, sort_order);

alter table public.wallets enable row level security;
alter table public.expense_groups enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.budget_plans enable row level security;
alter table public.budget_cutoffs enable row level security;
alter table public.budget_allocations enable row level security;

drop policy if exists "wallets owner access" on public.wallets;
create policy "wallets owner access"
  on public.wallets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "groups owner access" on public.expense_groups;
create policy "groups owner access"
  on public.expense_groups
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "transactions owner access" on public.transactions;
create policy "transactions owner access"
  on public.transactions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "budgets owner access" on public.budgets;
create policy "budgets owner access"
  on public.budgets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "budget plans owner access" on public.budget_plans;
create policy "budget plans owner access"
  on public.budget_plans for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "budget cutoffs owner access" on public.budget_cutoffs;
create policy "budget cutoffs owner access"
  on public.budget_cutoffs for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "budget allocations owner access" on public.budget_allocations;
create policy "budget allocations owner access"
  on public.budget_allocations for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
