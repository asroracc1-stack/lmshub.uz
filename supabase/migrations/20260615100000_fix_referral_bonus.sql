-- Apply Referral Code and immediately give bonus
CREATE OR REPLACE FUNCTION public.apply_referral(_code TEXT)
RETURNS BOOLEAN LANGUAGE PLPGSQL SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid UUID := auth.uid(); _ref UUID;
BEGIN
  IF _uid IS NULL OR _code IS NULL THEN RETURN false; END IF;
  SELECT id INTO _ref FROM public.profiles WHERE referral_code = upper(_code) AND id <> _uid;
  IF _ref IS NULL THEN RETURN false; END IF;
  
  UPDATE public.profiles SET referred_by = _ref
   WHERE id = _uid AND referred_by IS NULL;
   
  IF FOUND THEN
    PERFORM public.maybe_pay_referral_bonus(_uid);
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Referral Bonus Assigner (Give 10 coins immediately)
CREATE OR REPLACE FUNCTION public.maybe_pay_referral_bonus(_user_id UUID)
RETURNS VOID LANGUAGE PLPGSQL SECURITY DEFINER SET search_path=public AS $$
DECLARE _ref UUID; _paid BOOLEAN;
BEGIN
  SELECT referred_by, referral_bonus_paid INTO _ref, _paid FROM public.profiles WHERE id = _user_id;
  IF _ref IS NULL OR _paid THEN RETURN; END IF;
  
  PERFORM public.award_coins(_user_id, 10, 'Taklif bonusi 🎉', 'referral', jsonb_build_object('referrer', _ref));
  PERFORM public.award_coins(_ref, 10, 'Do''stingiz qo''shildi 🎉', 'referral', jsonb_build_object('invitee', _user_id));
  
  UPDATE public.profiles SET referral_bonus_paid = true WHERE id = _user_id;
END;
$$;
