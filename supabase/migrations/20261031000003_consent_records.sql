-- Migration 20261031000003: Consent Records and Enums

CREATE TYPE consent_scope AS ENUM (
  'data_storage',
  'report_upload',
  'messaging'
);

CREATE TYPE messaging_channel AS ENUM (
  'sms',
  'whatsapp'
);

CREATE TABLE public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  scope consent_scope NOT NULL,
  channel messaging_channel, -- Nullable; populated only when scope = 'messaging'
  granted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  revoked_at TIMESTAMPTZ, -- Null means currently active; populated on revocation
  consent_version TEXT NOT NULL DEFAULT 'v1.0',
  captured_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_consent_patient_scope ON public.consent_records(patient_id, scope);
CREATE INDEX idx_consent_active ON public.consent_records(patient_id, scope, revoked_at) WHERE revoked_at IS NULL;

-- Helper SQL function to check active consent for a scope and channel
CREATE OR REPLACE FUNCTION public.has_active_consent(
  p_patient_id UUID,
  p_scope consent_scope,
  p_channel messaging_channel DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.consent_records
    WHERE patient_id = p_patient_id
      AND scope = p_scope
      AND (p_channel IS NULL OR channel = p_channel)
      AND revoked_at IS NULL
  );
$$;

-- RLS: deny all by default
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

-- 1. Patients can view their own consent records
CREATE POLICY "Patients can view own consent"
  ON public.consent_records
  FOR SELECT
  TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM public.patients WHERE profile_id = auth.uid()
    )
  );

-- 2. Health workers and clinicians assigned to the patient can view consent
CREATE POLICY "Assigned staff can view consent"
  ON public.consent_records
  FOR SELECT
  TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM public.patients
      WHERE assigned_worker_id = auth.uid()
         OR assigned_clinician_id = auth.uid()
    )
    OR public.current_role() IN ('supervisor', 'admin')
  );

-- 3. Patients can grant consent for themselves
CREATE POLICY "Patients can insert own consent"
  ON public.consent_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    patient_id IN (
      SELECT id FROM public.patients WHERE profile_id = auth.uid()
    )
    AND captured_by = auth.uid()
  );

-- 4. Health workers can record consent on behalf of assigned patients (e.g. verbally during visit)
CREATE POLICY "Health workers can record patient consent"
  ON public.consent_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_role() = 'health_worker'
    AND patient_id IN (
      SELECT id FROM public.patients WHERE assigned_worker_id = auth.uid()
    )
    AND captured_by = auth.uid()
  );

-- 5. Revocation updates: only patient or assigned staff can set revoked_at
CREATE POLICY "Patient can revoke own consent"
  ON public.consent_records
  FOR UPDATE
  TO authenticated
  USING (
    patient_id IN (
      SELECT id FROM public.patients WHERE profile_id = auth.uid()
    )
  )
  WITH CHECK (
    revoked_at IS NOT NULL
  );
