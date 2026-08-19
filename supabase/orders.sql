create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_name text not null default '',
  total numeric not null default 0,
  items jsonb not null default '[]'::jsonb,
  status text not null default 'processing' check (status in ('processing', 'confirmed')),
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "Users can read their own orders"
on public.orders for select
using (auth.uid() = user_id);

create policy "Users can create their own orders"
on public.orders for insert
with check (auth.uid() = user_id);

create policy "Admins can read all orders"
on public.orders for select
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

create policy "Admins can confirm orders"
on public.orders for update
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
)
with check (status in ('processing', 'confirmed'));
