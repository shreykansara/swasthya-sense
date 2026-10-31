-- ==============================================================================
-- Swasthya Sense: Supabase Database Schema & Row Level Security (RLS)
-- Roles: Doctor, Patient, Lab Technician
-- ==============================================================================

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. User Profiles Table (Linked to Supabase Auth)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text not null check (role in ('doctor', 'patient', 'lab_technician')),
  full_name text not null,
  email text,
  phone text,
  patient_id text, -- Populated if role is 'patient'
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Patient Cohort Registry Table
create table if not exists public.patients (
  id text primary key, -- e.g. PAT-0001
  full_name text not null,
  age int not null,
  sex text not null check (sex in ('Male', 'Female', 'Other')),
  phone text,
  masked_phone text,
  email text,
  cohort text not null,
  assigned_worker_id text default 'ASHA-01',
  risk_category text not null check (risk_category in ('HIGH_RISK', 'MODERATE_RISK', 'LOW_RISK')),
  status text not null check (status in ('PENDING_DOCTOR_CONSULTATION', 'CONSULTED', 'UNDER_FOLLOW_UP')),
  is_high_priority boolean default false,
  triage_lane text not null check (triage_lane in ('clinical', 'administrative')),
  triage_tier text default 'routine',
  schedule_status text default 'ON_SCHEDULE',
  overdue_days int default 0,
  next_visit_date timestamptz,
  latest_vitals jsonb default '{}'::jsonb,
  report_data jsonb default '{}'::jsonb,
  predictions jsonb default '{}'::jsonb,
  uniforms jsonb default '{}'::jsonb,
  doctor_consultation jsonb default '{}'::jsonb,
  prescribed_practices jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Diagnostic Lab Reports Table (Audit of every uploaded report)
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  patient_id text references public.patients(id) on delete cascade not null,
  technician_id text,
  technician_name text not null,
  lab_name text not null,
  vitals jsonb not null,
  chemistry jsonb not null,
  lipids jsonb not null,
  cardiac_ecg jsonb not null,
  predictions jsonb,
  uploaded_at timestamptz default now()
);

-- 5. Doctor Clinical Consultations Table
create table if not exists public.consultations (
  id uuid primary key default gen_random_uuid(),
  patient_id text references public.patients(id) on delete cascade not null,
  doctor_id text not null,
  doctor_name text not null,
  clinical_notes text not null,
  recommendation text not null,
  triage_decision text not null,
  consulted_at timestamptz default now()
);

-- 6. Dispatched Communications (WhatsApp / SMS Simulator)
create table if not exists public.dispatched_communications (
  id uuid primary key default gen_random_uuid(),
  patient_id text references public.patients(id) on delete cascade not null,
  patient_name text not null,
  phone text not null,
  channel text not null,
  message_type text not null,
  body text not null,
  sender text not null,
  status text default 'DELIVERED',
  created_at timestamptz default now()
);

-- 7. Immutable Audit Trail
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id text not null,
  actor_role text not null,
  action text not null,
  patient_id text,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ==============================================================================
-- Row-Level Security (RLS) Policies
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.reports enable row level security;
alter table public.consultations enable row level security;
alter table public.dispatched_communications enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles: Users can view their own profile; Doctors and Admins can view all profiles
create policy "Allow user to view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Allow doctor to view all profiles"
  on public.profiles for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor'));

-- Patients:
-- Doctors: View all patients, update consultation notes and triage
create policy "Doctor can view all patients"
  on public.patients for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor'));

create policy "Doctor can update patient consultation"
  on public.patients for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor'));

-- Patients: Can only view their own record and prescribed practices
create policy "Patient can view own record"
  on public.patients for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'patient' and profiles.patient_id = patients.id
    )
  );

-- Lab Technicians: Can insert new patients or update existing patients when uploading reports
create policy "Lab Tech can view patients for report matching"
  on public.patients for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'lab_technician'));

create policy "Lab Tech can insert new patients"
  on public.patients for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'lab_technician'));

create policy "Lab Tech can update patient report data"
  on public.patients for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'lab_technician'));

-- Reports:
create policy "Lab Tech can insert reports"
  on public.reports for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'lab_technician'));

create policy "Doctor can view all reports"
  on public.reports for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor'));

create policy "Patient can view own reports"
  on public.reports for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'patient' and profiles.patient_id = reports.patient_id
    )
  );

