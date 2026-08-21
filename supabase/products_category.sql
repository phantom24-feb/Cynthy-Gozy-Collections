-- Run this migration once in Supabase SQL Editor.
-- Normalize legacy rows before enforcing the requested "Jewelries" value.
do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public'
      and rel.relname = 'products'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%category%'
  loop
    execute format(
      'alter table public.products drop constraint if exists %I',
      constraint_record.conname
    );
  end loop;
end $$;

update public.products
set category = 'Jewelries'
where category = 'Jewelry';

alter table public.products
add constraint products_category_check
check (category in ('Clothes', 'Shoes', 'Jewelries'));
