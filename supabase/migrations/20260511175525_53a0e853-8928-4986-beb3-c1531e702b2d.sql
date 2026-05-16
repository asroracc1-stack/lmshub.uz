ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS exam_date date;

CREATE OR REPLACE FUNCTION public.send_exam_countdown_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _r record;
  _days int;
  _hours int;
BEGIN
  FOR _r IN
    SELECT id, full_name, exam_date FROM public.profiles
     WHERE exam_date IS NOT NULL AND exam_date >= CURRENT_DATE
  LOOP
    _days := (_r.exam_date - CURRENT_DATE);
    _hours := _days * 24;
    PERFORM public.send_notification(
      _r.id,
      '⏳ Imtihongacha ' || _days || ' kun (' || _hours || ' soat) qoldi',
      'Bugungi mashqlaringizni qoldirmang — har kun band ballingizni oshirish uchun muhim!',
      'info',
      '/student/dashboard'
    );
  END LOOP;
END;
$$;