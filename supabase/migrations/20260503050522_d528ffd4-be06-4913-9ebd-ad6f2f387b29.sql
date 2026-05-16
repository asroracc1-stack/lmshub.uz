CREATE OR REPLACE FUNCTION public.claim_reward(_reward_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _org uuid;
  _coins integer;
  _reward record;
  _grant_id uuid;
  _mgr record;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT organization_id, coins INTO _org, _coins FROM public.profiles WHERE id = _uid;
  IF _org IS NULL THEN RAISE EXCEPTION 'No organization'; END IF;

  SELECT * INTO _reward FROM public.rewards
   WHERE id = _reward_id AND organization_id = _org AND is_active = true;
  IF _reward.id IS NULL THEN RAISE EXCEPTION 'Reward unavailable'; END IF;

  IF _coins < _reward.cost_coins THEN
    RAISE EXCEPTION 'Coin yetarli emas';
  END IF;
  IF _reward.stock IS NOT NULL AND _reward.stock <= 0 THEN
    RAISE EXCEPTION 'Sovg''a tugagan';
  END IF;

  -- Deduct coins (also creates a coin_transactions row)
  PERFORM public.award_coins(
    _uid,
    -_reward.cost_coins,
    'Sovg''a olindi: ' || _reward.title,
    'reward',
    jsonb_build_object('reward_id', _reward.id)
  );

  -- Insert grant
  INSERT INTO public.reward_grants(organization_id, student_id, reward_id, title, description, coins_spent, status)
  VALUES (_org, _uid, _reward.id, _reward.title, _reward.description, _reward.cost_coins, 'pending')
  RETURNING id INTO _grant_id;

  -- Decrement stock if tracked
  IF _reward.stock IS NOT NULL THEN
    UPDATE public.rewards SET stock = GREATEST(0, stock - 1) WHERE id = _reward.id;
  END IF;

  -- Notify org managers
  FOR _mgr IN
    SELECT user_id FROM public.user_roles
     WHERE organization_id = _org AND role IN ('admin','administrator')
  LOOP
    PERFORM public.send_notification(
      _mgr.user_id,
      '🎁 Talaba sovg''a oldi: ' || _reward.title,
      'Talaba sovg''ani topshirib bering',
      'info',
      '/admin/rewards'
    );
  END LOOP;

  RETURN _grant_id;
END;
$$;