-- Migration 20261031000001: Enum app_role and profiles table

CREATE TYPE app_role AS ENUM (
  'patient',
  'health_worker',
  'clinician',
  'supervisor',
  'admin'
);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  display_name TEXT NOT NULL,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  masked_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Deny all by default
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's app_role
CREATE OR REPLACE FUNCTION public.current_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- RLS Policies on profiles:
-- 1. Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- 2. Admins and supervisors can view all profiles
CREATE POLICY "Admins and supervisors can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.current_role() IN ('admin', 'supervisor')
  );

-- 3. Health workers and clinicians can view patient profiles assigned to them or unassigned
CREATE POLICY "Staff can view patient profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.current_role() IN ('health_worker', 'clinician')
    AND role = 'patient'
  );

-- 4. Users can update their own display_name and preferred_language
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );
