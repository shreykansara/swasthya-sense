-- SQL pgTAP / scripted RLS verification
-- Tests that:
-- 1. Worker cannot read unassigned patient
-- 2. Patient cannot read other patients

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

ROLLBACK;
