create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_name text not null default '',
  delivery_address text not null default '',
  total numeric not null default 0,
  items jsonb not null default '[]'::jsonb,
  status text not null default 'processing' check (status in ('processing', 'confirmed', 'shipped', 'delivered')),
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

alter table public.orders add column if not exists delivery_address text not null default '';

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

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  );
$$;

drop policy if exists "Admins can confirm orders" on public.orders;
drop policy if exists "Admins can update order status" on public.orders;

create policy "Admins can update order status"
on public.orders for update
using (
  public.is_admin()
)
with check (
  public.is_admin()
  and status in ('processing', 'confirmed', 'shipped', 'delivered')
);
