-- Run this migration once so cart expiry can be calculated reliably.
alter table public.cart_items
add column if not exists created_at timestamptz not null default now();

create index if not exists cart_items_created_at_idx
on public.cart_items (created_at);