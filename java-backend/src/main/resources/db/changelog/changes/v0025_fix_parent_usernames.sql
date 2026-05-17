-- Hamma 'asrorsuperadmin' username bilan yozilib qolgan Ota-onalarni topib ularning username ni to'g'irlaymiz
UPDATE public.users
SET username = CONCAT('parent_', id, '_', CAST((RANDOM() * 900 + 100) AS INT))
WHERE role = 'PARENT'
  AND username = 'asrorsuperadmin';
