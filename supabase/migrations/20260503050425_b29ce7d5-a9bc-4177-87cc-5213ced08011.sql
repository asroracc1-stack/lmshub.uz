-- Let any organization member read roles within their own organization
-- so students can find the admin/administrator (to view payment cards).
CREATE POLICY "org members read same org roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL
  AND organization_id = public.current_user_org()
);

-- Trigger: when a student's coin balance changes upwards, notify them
-- about any active reward they can now afford (only the cheapest one,
-- to avoid spam).
CREATE OR REPLACE FUNCTION public.notify_reward_unlocked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _reward record;
BEGIN
  IF NEW.coins > COALESCE(OLD.coins, 0) THEN
    SELECT id, title, cost_coins
      INTO _reward
      FROM public.rewards
     WHERE organization_id = NEW.organization_id
       AND is_active = true
       AND cost_coins > 0
       AND cost_coins <= NEW.coins
       AND cost_coins > COALESCE(OLD.coins, 0)
     ORDER BY cost_coins DESC
     LIMIT 1;

    IF _reward.id IS NOT NULL THEN
      PERFORM public.send_notification(
        NEW.id,
        '🎁 Yangi sovg''a ochildi: ' || _reward.title,
        'Sizda ' || NEW.coins || ' coin bor — bu sovg''ani olishingiz mumkin!',
        'success',
        '/student/coins'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_reward_unlocked ON public.profiles;
CREATE TRIGGER trg_notify_reward_unlocked
AFTER UPDATE OF coins ON public.profiles
FOR EACH ROW
WHEN (NEW.coins IS DISTINCT FROM OLD.coins)
EXECUTE FUNCTION public.notify_reward_unlocked();