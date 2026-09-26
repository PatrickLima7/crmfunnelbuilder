-- Migration 016: Enable Admin Insert and Delete on public.profiles
-- Execute no Supabase Dashboard > SQL Editor

DROP POLICY IF EXISTS "admin can insert profiles" ON public.profiles;
CREATE POLICY "admin can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin can delete profiles" ON public.profiles;
CREATE POLICY "admin can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.is_admin());

DROP POLICY IF EXISTS "user can insert own profile" ON public.profiles;
CREATE POLICY "user can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
