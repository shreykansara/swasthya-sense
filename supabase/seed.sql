-- Supabase Seed Data for Swasthya Sense
-- Creates test users across all 5 roles: patient, health_worker, clinician, supervisor, admin

-- 1. Helper function to create auth users with encrypted password 'Password123!'
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  pwd_hash TEXT := crypt('Password123!', gen_salt('bf'));
  patient_user_id UUID := '00000000-0000-0000-0000-000000000001';
  worker_user_id UUID := '00000000-0000-0000-0000-000000000002';
  clinician_user_id UUID := '00000000-0000-0000-0000-000000000003';
  supervisor_user_id UUID := '00000000-0000-0000-0000-000000000004';
  admin_user_id UUID := '00000000-0000-0000-0000-000000000005';
BEGIN
  -- Insert into auth.users if not present
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud
  ) VALUES
    (patient_user_id, '00000000-0000-0000-0000-000000000000', 'patient@swasthya.test', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"role":"patient"}', false, 'authenticated', 'authenticated'),
    (worker_user_id, '00000000-0000-0000-0000-000000000000', 'worker@swasthya.test', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"role":"health_worker"}', false, 'authenticated', 'authenticated'),
    (clinician_user_id, '00000000-0000-0000-0000-000000000000', 'clinician@swasthya.test', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"role":"clinician"}', false, 'authenticated', 'authenticated'),
    (supervisor_user_id, '00000000-0000-0000-0000-000000000000', 'supervisor@swasthya.test', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"role":"supervisor"}', false, 'authenticated', 'authenticated'),
    (admin_user_id, '00000000-0000-0000-0000-000000000000', 'admin@swasthya.test', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"role":"admin"}', false, 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  -- Create public.profiles
  INSERT INTO public.profiles (id, role, display_name, preferred_language, masked_id) VALUES
    (patient_user_id, 'patient', 'Aarav Sharma (Patient)', 'en', 'PT-9821'),
    (worker_user_id, 'health_worker', 'Pooja Devi (ASHA Worker)', 'hi', 'HW-4102'),
    (clinician_user_id, 'clinician', 'Dr. Ramesh Patel (MD)', 'en', 'CL-1044'),
    (supervisor_user_id, 'supervisor', 'Sunita Rao (PHC Supervisor)', 'en', 'SV-0301'),
    (admin_user_id, 'admin', 'System Administrator', 'en', 'AD-0001')
  ON CONFLICT (id) DO NOTHING;

  -- Create a sample patient record linked to Aarav Sharma
  INSERT INTO public.patients (
    id, profile_id, cohort_id, assigned_worker_id, assigned_clinician_id,
    preferred_language, phone_masked, status
  ) VALUES
    ('11111111-1111-1111-1111-111111111111', patient_user_id, 'hypertension_lipids', worker_user_id, clinician_user_id, 'hi', '+91 98XXX-XX321', 'active')
  ON CONFLICT (id) DO NOTHING;
END $$;
