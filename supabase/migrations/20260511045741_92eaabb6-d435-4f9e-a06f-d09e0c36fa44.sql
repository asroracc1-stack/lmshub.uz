ALTER TABLE public.grades
ALTER COLUMN max_score SET DEFAULT 5;

CREATE OR REPLACE FUNCTION public.validate_grade_scale()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.score IS NULL THEN
    RAISE EXCEPTION 'Grade score is required';
  END IF;

  IF NEW.score < 1 OR NEW.score > 5 THEN
    RAISE EXCEPTION 'Grade score must be between 1 and 5';
  END IF;

  NEW.max_score := 5;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_grade_scale ON public.grades;
CREATE TRIGGER trg_validate_grade_scale
BEFORE INSERT OR UPDATE OF score, max_score ON public.grades
FOR EACH ROW
EXECUTE FUNCTION public.validate_grade_scale();

DROP POLICY IF EXISTS "teachers manage grades they gave" ON public.grades;
DROP POLICY IF EXISTS "teachers read grades they gave" ON public.grades;
DROP POLICY IF EXISTS "teachers add grades for own students" ON public.grades;
DROP POLICY IF EXISTS "teachers edit grades they gave" ON public.grades;
DROP POLICY IF EXISTS "teachers delete grades they gave" ON public.grades;

CREATE POLICY "teachers read grades they gave"
ON public.grades
FOR SELECT
TO authenticated
USING (teacher_id = auth.uid());

CREATE POLICY "teachers add grades for own students"
ON public.grades
FOR INSERT
TO authenticated
WITH CHECK (
  teacher_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.group_members gm
    JOIN public.group_teachers gt ON gt.group_id = gm.group_id
    WHERE gm.student_id = grades.student_id
      AND gt.teacher_id = auth.uid()
      AND gm.organization_id = grades.organization_id
      AND gt.organization_id = grades.organization_id
  )
);

CREATE POLICY "teachers edit grades they gave"
ON public.grades
FOR UPDATE
TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (
  teacher_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.group_members gm
    JOIN public.group_teachers gt ON gt.group_id = gm.group_id
    WHERE gm.student_id = grades.student_id
      AND gt.teacher_id = auth.uid()
      AND gm.organization_id = grades.organization_id
      AND gt.organization_id = grades.organization_id
  )
);

CREATE POLICY "teachers delete grades they gave"
ON public.grades
FOR DELETE
TO authenticated
USING (teacher_id = auth.uid());