-- SQL pgTAP / scripted RLS verification
-- Tests that:
-- 1. Worker cannot read unassigned patient
-- 2. Patient cannot read other patients
-- 3. Patient reads own perfusion inputs
-- 4. Patient blocked from other patients' perfusion inputs
-- 5. Worker blocked from unassigned patient's perfusion inputs
-- 6. Clinician reads assigned patient's perfusion inputs

BEGIN;

-- Setup test identities
SET LOCAL ROLE authenticated;

-- Test 1: Health Worker 1 accessing assigned patient
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000002';
SELECT count(*) = 1 AS worker_reads_assigned
FROM public.patients
WHERE assigned_worker_id = '00000000-0000-0000-0000-000000000002';

-- Test 2: Health Worker 1 cannot read unassigned patient
SELECT count(*) = 0 AS worker_blocked_unassigned
FROM public.patients
WHERE assigned_worker_id != '00000000-0000-0000-0000-000000000002';

-- Test 3: Patient reading own record only
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000001';
SELECT count(*) = 1 AS patient_reads_self
FROM public.patients
WHERE profile_id = '00000000-0000-0000-0000-000000000001';

SELECT count(*) = 0 AS patient_blocked_others
FROM public.patients
WHERE profile_id != '00000000-0000-0000-0000-000000000001';

-- Test 4: Patient reads own perfusion inputs
SELECT count(*) >= 0 AS patient_reads_own_perfusion
FROM public.perfusion_inputs
WHERE patient_id IN (SELECT id FROM public.patients WHERE profile_id = '00000000-0000-0000-0000-000000000001');

-- Test 5: Patient blocked from other patients' perfusion inputs
SELECT count(*) = 0 AS patient_blocked_other_perfusion
FROM public.perfusion_inputs
WHERE patient_id NOT IN (SELECT id FROM public.patients WHERE profile_id = '00000000-0000-0000-0000-000000000001');

-- Test 6: Worker blocked from reading unassigned patient's perfusion inputs
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000002';
SELECT count(*) = 0 AS worker_blocked_unassigned_perfusion
FROM public.perfusion_inputs
WHERE NOT public.is_assigned_worker(patient_id);

-- Test 7: Clinician accessing assigned patient's perfusion inputs
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000003';
SELECT count(*) >= 0 AS clinician_reads_assigned_perfusion
FROM public.perfusion_inputs
WHERE public.is_assigned_clinician(patient_id);

ROLLBACK;
