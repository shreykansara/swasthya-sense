-- Migration: 20261031000005_case_flags.sql
-- Phase 7: Versioned Rule Engine and Clinical Case Flags
-- Non-negotiable principle: Transparent urgency flags with zero diagnostic condition naming.

CREATE TABLE IF NOT EXISTS case_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    upload_id UUID REFERENCES report_uploads(id) ON DELETE SET NULL,
    urgency TEXT NOT NULL CHECK (urgency IN ('urgent', 'soon', 'routine')),
    rule_id TEXT NOT NULL,
    rule_version TEXT NOT NULL DEFAULT 'v1.0',
    reason_code TEXT NOT NULL,
    contributions JSONB NOT NULL DEFAULT '{}'::jsonb,
    patient_explanation TEXT NOT NULL,
    clinician_summary TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'overridden')),
    clinician_override JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_case_flags_patient ON case_flags(patient_id);
CREATE INDEX IF NOT EXISTS idx_case_flags_urgency ON case_flags(urgency);
CREATE INDEX IF NOT EXISTS idx_case_flags_status ON case_flags(status);
CREATE INDEX IF NOT EXISTS idx_case_flags_upload ON case_flags(upload_id);

-- Enable Row Level Security
ALTER TABLE case_flags ENABLE ROW LEVEL SECURITY;

-- 1. Patients can view their own flags
CREATE POLICY patient_view_own_flags ON case_flags
    FOR SELECT
    USING (
        auth.uid() = patient_id
        OR EXISTS (
            SELECT 1 FROM patients p WHERE p.id = case_flags.patient_id AND p.id = auth.uid()
        )
    );

-- 2. Health workers can view flags of assigned patients
CREATE POLICY worker_view_assigned_flags ON case_flags
    FOR SELECT
    USING (
        current_role() = 'health_worker'
        AND is_assigned_worker(patient_id)
    );

-- 3. Clinicians can view and update flags for assigned patients
CREATE POLICY clinician_manage_assigned_flags ON case_flags
    FOR ALL
    USING (
        current_role() = 'clinician'
        AND is_assigned_clinician(patient_id)
    );

-- 4. Supervisor and Admin have full oversight
CREATE POLICY supervisor_admin_manage_all_flags ON case_flags
    FOR ALL
    USING (
        current_role() IN ('supervisor', 'admin')
    );
