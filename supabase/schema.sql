-- Cashio cloud data schema for Supabase
-- Run this script once in the Supabase SQL Editor.

create table if not exists public.cashio_transactions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  type text not null check (type in ('income','expense')),
  amount numeric(24,4) not null check (amount > 0),
  currency text not null,
  title text not null check (char_length(title) between 1 and 120),
  category text not null,
  date date not null,
  time text not null check (time ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'),
  description text not null default '' check (char_length(description) <= 500),
  created_at_client text not null,
  updated_at_client text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id,id)
);

create table if not exists public.cashio_categories (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  label text not null check (char_length(label) between 1 and 80),
  kind text not null check (kind in ('income','expense','both')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id,id)
);

create index if not exists cashio_transactions_user_updated_idx
  on public.cashio_transactions(user_id, updated_at_client);

create index if not exists cashio_categories_user_label_idx
  on public.cashio_categories(user_id, label);

alter table public.cashio_transactions enable row level security;
alter table public.cashio_categories enable row level security;

drop policy if exists cashio_transactions_select_own on public.cashio_transactions;
drop policy if exists cashio_transactions_insert_own on public.cashio_transactions;
drop policy if exists cashio_transactions_update_own on public.cashio_transactions;
drop policy if exists cashio_transactions_delete_own on public.cashio_transactions;

create policy cashio_transactions_select_own
on public.cashio_transactions
for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy cashio_transactions_insert_own
on public.cashio_transactions
for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy cashio_transactions_update_own
on public.cashio_transactions
for update to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy cashio_transactions_delete_own
on public.cashio_transactions
for delete to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists cashio_categories_select_own on public.cashio_categories;
drop policy if exists cashio_categories_insert_own on public.cashio_categories;
drop policy if exists cashio_categories_update_own on public.cashio_categories;
drop policy if exists cashio_categories_delete_own on public.cashio_categories;

create policy cashio_categories_select_own
on public.cashio_categories
for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy cashio_categories_insert_own
on public.cashio_categories
for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy cashio_categories_update_own
on public.cashio_categories
for update to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy cashio_categories_delete_own
on public.cashio_categories
for delete to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

revoke all on public.cashio_transactions from anon;
revoke all on public.cashio_categories from anon;

grant select, insert, update, delete on public.cashio_transactions to authenticated;
grant select, insert, update, delete on public.cashio_categories to authenticated;
