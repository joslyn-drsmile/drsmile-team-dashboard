create table if not exists public.team_payment_links (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('atome', 'payex')),
  external_id text not null,
  payment_link text not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'MYR' check (currency = 'MYR'),
  reference text not null default '',
  customer_name text not null default '',
  description text not null default '',
  status text not null default 'PENDING',
  created_by uuid not null default auth.uid() references auth.users(id),
  created_by_email text not null default '',
  created_at timestamptz not null default now(),
  unique (provider, external_id)
);

comment on table public.team_payment_links is
  'Payment links created from the DrSmile Team Dashboard. Provider systems remain the source of truth for payment status.';

alter table public.team_payment_links enable row level security;

create policy "team_payment_links_team_select"
on public.team_payment_links for select
to authenticated
using (public.expo_has_access());

create policy "team_payment_links_team_insert"
on public.team_payment_links for insert
to authenticated
with check (public.expo_has_access() and created_by = (select auth.uid()));

grant select, insert on public.team_payment_links to authenticated;

create index if not exists team_payment_links_created_at_idx
on public.team_payment_links (created_at desc);

create index if not exists team_payment_links_created_by_idx
on public.team_payment_links (created_by);
