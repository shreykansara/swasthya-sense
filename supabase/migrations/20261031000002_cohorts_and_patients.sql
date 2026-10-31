-- Migration 20261031000002: Cohorts, Patients, helper SQL functions and RLS policies

CREATE TABLE public.cohorts (
  id TEXT PRIMARY KEY, -- 'hypertension_lipids', 'post_event_discharge', 'heart_failure'
  code TEXT NOT NULL UNIQUE, -- 'A', 'B', 'C' (neutral labels for UI)
  display_label TEXT NOT NULL, -- 'Cohort A', 'Cohort B', 'Cohort C'
  descriptive_name TEXT NOT NULL, -- Descriptive clinical name shown only on admin screen
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed standard 3 cohorts
INSERT INTO public.cohorts (id, code, display_label, descriptive_name, description) VALUES
  ('hypertension_lipids', 'A', 'Cohort A', 'Hypertension & Lipid Management', 'Long-term metabolic and blood pressure stabilization'),
  ('post_event_discharge', 'B', 'Cohort B', 'Post-Acute Event Discharge Follow-Up', 'Close monitoring following an acute cardiac episode discharge'),
  ('heart_failure', 'C', 'Cohort C', 'Heart Failure Fluid & Symptom Management', 'Ejection fraction, fluid balance and electrolyte monitoring');

CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  cohort_id TEXT NOT NULL REFERENCES public.cohorts(id),
  assigned_worker_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_clinician_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  phone_masked TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'discharged', 'erased')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_patients_assigned_worker ON public.patients(assigned_worker_id);
CREATE INDEX idx_patients_assigned_clinician ON public.patients(assigned_clinician_id);
CREATE INDEX idx_patients_cohort ON public.patients(cohort_id);

-- Helper SQL functions
CREATE OR REPLACE FUNCTION public.is_assigned_worker(target_patient_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patients
    WHERE id = target_patient_id
      AND assigned_worker_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_assigned_clinician(target_patient_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patients
    WHERE id = target_patient_id
      AND assigned_clinician_id = auth.uid()
  );
$$;

-- RLS on cohorts (readable by all authenticated users)
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cohorts"
  ON public.cohorts
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS on patients (deny by default)
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- 1. Patients can only read their own patient record
CREATE POLICY "Patients can read own record"
  ON public.patients
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- 2. Health workers can read ONLY patients assigned to them
CREATE POLICY "Health workers can read assigned patients"
  ON public.patients
  FOR SELECT
  TO authenticated
  USING (
    public.current_role() = 'health_worker'
    AND assigned_worker_id = auth.uid()
  );

-- 3. Clinicians can read patients assigned to them
CREATE POLICY "Clinicians can read assigned patients"
  ON public.patients
  FOR SELECT
  TO authenticated
  USING (
    public.current_role() = 'clinician'
    AND assigned_clinician_id = auth.uid()
  );

-- 4. Supervisors and admins can read all patients
CREATE POLICY "Supervisors and admins can read all patients"
  ON public.patients
  FOR SELECT
  TO authenticated
  USING (
    public.current_role() IN ('supervisor', 'admin')
  );

-- 5. Only admins and supervisors can update patient assignments
CREATE POLICY "Admins and supervisors can update patients"
  ON public.patients
  FOR UPDATE
  TO authenticated
  USING (
    public.current_role() IN ('admin', 'supervisor')
  );

-- 6. Admins can insert patient records
CREATE POLICY "Admins can insert patients"
  ON public.patients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_role() = 'admin'
  );
