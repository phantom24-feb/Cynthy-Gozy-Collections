-- Run once in the Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  );
$$;

DO $$
DECLARE
  constraint_record record;
BEGIN
  FOR constraint_record IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public'
      AND rel.relname = 'orders'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%status%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS %I',
      constraint_record.conname
    );
  END LOOP;
END $$;

ALTER TABLE public.orders
ADD CONSTRAINT orders_status_check
CHECK (status IN ('processing', 'confirmed', 'shipped', 'delivered'));

DROP POLICY IF EXISTS "Admins can confirm orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update order status" ON public.orders;

CREATE POLICY "Admins can update order status"
ON public.orders FOR UPDATE
USING (
  public.is_admin()
)
WITH CHECK (status IN ('processing', 'confirmed', 'shipped', 'delivered'));

CREATE TABLE IF NOT EXISTS public.about_us (
  id integer PRIMARY KEY CHECK (id = 1),
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.about_us (id, content)
VALUES (1, 'Cynthy Gozy Collections brings quality fashion pieces to you.')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.about_us ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read About Us" ON public.about_us;
DROP POLICY IF EXISTS "Admins can manage About Us" ON public.about_us;

CREATE POLICY "Anyone can read About Us"
ON public.about_us FOR SELECT
USING (true);

CREATE POLICY "Admins can manage About Us"
ON public.about_us FOR ALL
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id OR public.is_admin()
);