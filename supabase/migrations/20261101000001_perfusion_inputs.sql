-- Migration 20261101000001: Perfusion Inputs, Inference Results, Consent Trigger, and RLS

-- 1. Table: perfusion_inputs
CREATE TABLE public.perfusion_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  inputs JSONB NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('manual', 'report_prefill', 'preset')),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_perfusion_inputs_patient ON public.perfusion_inputs(patient_id);
CREATE INDEX idx_perfusion_inputs_created_at ON public.perfusion_inputs(created_at DESC);

-- 2. Table: perfusion_results
CREATE TABLE public.perfusion_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_id UUID NOT NULL REFERENCES public.perfusion_inputs(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  cad_p NUMERIC NOT NULL,
  lad_p NUMERIC NOT NULL,
  lcx_p NUMERIC NOT NULL,
  rca_p NUMERIC NOT NULL,
  shap JSONB,
  model_version TEXT NOT NULL DEFAULT 'v1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_perfusion_results_input ON public.perfusion_results(input_id);
CREATE INDEX idx_perfusion_results_patient ON public.perfusion_results(patient_id);

-- 3. Consent enforcement trigger (data_storage required)
CREATE OR REPLACE FUNCTION public.check_perfusion_input_consent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_active_consent(NEW.patient_id, 'data_storage'::consent_scope) THEN
    RAISE EXCEPTION 'Cannot record perfusion inputs: active data_storage consent is required for patient %', NEW.patient_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_perfusion_inputs_consent
BEFORE INSERT ON public.perfusion_inputs
FOR EACH ROW
EXECUTE FUNCTION public.check_perfusion_input_consent();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.perfusion_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfusion_results ENABLE ROW LEVEL SECURITY;

-- 4.1 Policies for perfusion_inputs:
-- Patient: reads and inserts only own rows
CREATE POLICY "Patients read own perfusion inputs"
  ON public.perfusion_inputs
  FOR SELECT
  TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM public.patients WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Patients insert own perfusion inputs"
  ON public.perfusion_inputs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    patient_id IN (
      SELECT id FROM public.patients WHERE profile_id = auth.uid()
    )
  );

-- Health Worker: reads rows for assigned patients
CREATE POLICY "Health workers read assigned patients perfusion inputs"
  ON public.perfusion_inputs
  FOR SELECT
  TO authenticated
  USING (
    public.is_assigned_worker(patient_id)
  );

-- Clinician: reads and inserts for assigned patients
CREATE POLICY "Clinicians read assigned patients perfusion inputs"
  ON public.perfusion_inputs
  FOR SELECT
  TO authenticated
  USING (
    public.is_assigned_clinician(patient_id)
  );

CREATE POLICY "Clinicians insert assigned patients perfusion inputs"
  ON public.perfusion_inputs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_assigned_clinician(patient_id)
  );

-- Supervisor and Admin: read all
CREATE POLICY "Supervisors and Admins read all perfusion inputs"
  ON public.perfusion_inputs
  FOR SELECT
  TO authenticated
  USING (
    public.current_role() IN ('supervisor', 'admin')
  );

-- Admin: full access
CREATE POLICY "Admins full manage perfusion inputs"
  ON public.perfusion_inputs
  FOR ALL
  TO authenticated
  USING (
    public.current_role() = 'admin'
  );

-- 4.2 Policies for perfusion_results:
-- Patient: reads only own results
CREATE POLICY "Patients read own perfusion results"
  ON public.perfusion_results
  FOR SELECT
  TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM public.patients WHERE profile_id = auth.uid()
    )
  );

-- Health Worker: reads assigned patients results
CREATE POLICY "Health workers read assigned patients perfusion results"
  ON public.perfusion_results
  FOR SELECT
  TO authenticated
  USING (
    public.is_assigned_worker(patient_id)
  );

-- Clinician: reads and inserts for assigned patients
CREATE POLICY "Clinicians read assigned patients perfusion results"
  ON public.perfusion_results
  FOR SELECT
  TO authenticated
  USING (
    public.is_assigned_clinician(patient_id)
  );

CREATE POLICY "Clinicians insert assigned patients perfusion results"
  ON public.perfusion_results
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_assigned_clinician(patient_id)
  );

-- Supervisor and Admin: read all
CREATE POLICY "Supervisors and Admins read all perfusion results"
  ON public.perfusion_results
  FOR SELECT
  TO authenticated
  USING (
    public.current_role() IN ('supervisor', 'admin')
  );

-- Admin: full access
CREATE POLICY "Admins full manage perfusion results"
  ON public.perfusion_results
  FOR ALL
  TO authenticated
  USING (
    public.current_role() = 'admin'
  );
