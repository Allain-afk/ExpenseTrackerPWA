-- Atomically deletes every synced row owned by the authenticated caller.
-- The Supabase Auth account itself is intentionally preserved.

create or replace function public.delete_my_cloud_data()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  allocation_count integer := 0;
  cutoff_count integer := 0;
  plan_count integer := 0;
  transaction_count integer := 0;
  budget_count integer := 0;
  group_count integer := 0;
  wallet_count integer := 0;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  delete from public.budget_allocations where user_id = caller_id;
  get diagnostics allocation_count = row_count;

  delete from public.budget_cutoffs where user_id = caller_id;
  get diagnostics cutoff_count = row_count;

  delete from public.budget_plans where user_id = caller_id;
  get diagnostics plan_count = row_count;

  delete from public.transactions where user_id = caller_id;
  get diagnostics transaction_count = row_count;

  delete from public.budgets where user_id = caller_id;
  get diagnostics budget_count = row_count;

  delete from public.expense_groups where user_id = caller_id;
  get diagnostics group_count = row_count;

  delete from public.wallets where user_id = caller_id;
  get diagnostics wallet_count = row_count;

  return jsonb_build_object(
    'budget_allocations', allocation_count,
    'budget_cutoffs', cutoff_count,
    'budget_plans', plan_count,
    'transactions', transaction_count,
    'budgets', budget_count,
    'expense_groups', group_count,
    'wallets', wallet_count
  );
end;
$$;

revoke all on function public.delete_my_cloud_data() from public;
revoke all on function public.delete_my_cloud_data() from anon;
grant execute on function public.delete_my_cloud_data() to authenticated;

grant delete on table
  public.wallets,
  public.expense_groups,
  public.transactions,
  public.budgets,
  public.budget_plans,
  public.budget_cutoffs,
  public.budget_allocations
to authenticated;
