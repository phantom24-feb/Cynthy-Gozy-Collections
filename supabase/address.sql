-- Run once after creating the profiles table.
alter table public.profiles
add column if not exists delivery_address text not null default '';

alter table public.orders
add column if not exists delivery_address text not null default '';

create index if not exists orders_delivery_address_user_idx
on public.orders (user_id, created_at desc);