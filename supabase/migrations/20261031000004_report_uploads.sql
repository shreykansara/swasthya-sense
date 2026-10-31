-- Migration 20261031000004: Report Intake, Storage and Extracted Values

CREATE TYPE upload_status AS ENUM (
  'uploaded',
  'extracting',
  'needs_confirmation',
  'confirmed',
  'failed'
);

CREATE TABLE public.report_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  status upload_status NOT NULL DEFAULT 'uploaded',
  error_message TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_report_uploads_patient ON public.report_uploads(patient_id);
CREATE INDEX idx_report_uploads_status ON public.report_uploads(status);

CREATE TABLE public.extracted_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.report_uploads(id) ON DELETE CASCADE,
  analyte TEXT NOT NULL, -- normalized analyte identifier from catalog
  raw_text TEXT NOT NULL,
  value NUMERIC(10, 2),
  unit TEXT,
  reference_low NUMERIC(10, 2),
  reference_high NUMERIC(10, 2),
  confidence NUMERIC(4, 3) NOT NULL DEFAULT 1.000, -- 0.000 to 1.000
  page INTEGER NOT NULL DEFAULT 1,
  bbox_x NUMERIC(8, 2),
  bbox_y NUMERIC(8, 2),
  bbox_w NUMERIC(8, 2),
  bbox_h NUMERIC(8, 2),
  flag_out_of_plausible_range BOOLEAN NOT NULL DEFAULT false,
  flag_unit_mismatch BOOLEAN NOT NULL DEFAULT false,
  confirmed_value NUMERIC(10, 2), -- Populated only upon explicit human confirmation
  confirmed_by UUID REFERENCES public.profiles(id),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_extracted_values_upload ON public.extracted_values(upload_id);
CREATE INDEX idx_extracted_values_confirmed ON public.extracted_values(upload_id, confirmed_value) WHERE confirmed_value IS NOT NULL;

-- Enable RLS (deny all by default)
ALTER TABLE public.report_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_values ENABLE ROW LEVEL SECURITY;

-- Report Uploads RLS
CREATE POLICY "Patients can view own uploads"
  ON public.report_uploads
  FOR SELECT
  TO authenticated
  USING (
    patient_id IN (SELECT id FROM public.patients WHERE profile_id = auth.uid())
  );

CREATE POLICY "Assigned staff can view patient uploads"
  ON public.report_uploads
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

-- Extracted Values RLS
CREATE POLICY "Users can view extracted values for accessible uploads"
  ON public.extracted_values
  FOR SELECT
  TO authenticated
  USING (
    upload_id IN (
      SELECT id FROM public.report_uploads
      WHERE patient_id IN (
        SELECT id FROM public.patients
        WHERE profile_id = auth.uid()
           OR assigned_worker_id = auth.uid()
           OR assigned_clinician_id = auth.uid()
      )
      OR public.current_role() IN ('supervisor', 'admin')
    )
  );

-- Confirmation updates: Patients and health workers can update confirmed values
CREATE POLICY "Patients and staff can confirm extracted values"
  ON public.extracted_values
  FOR UPDATE
  TO authenticated
  USING (
    upload_id IN (
      SELECT id FROM public.report_uploads
      WHERE patient_id IN (
        SELECT id FROM public.patients
        WHERE profile_id = auth.uid()
           OR assigned_worker_id = auth.uid()
           OR assigned_clinician_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    confirmed_value IS NOT NULL
    AND confirmed_by = auth.uid()
  );
