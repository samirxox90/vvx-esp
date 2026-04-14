CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  schedule_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed')),
  squad_main TEXT[] NOT NULL DEFAULT '{}',
  squad_extra TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tournaments"
ON public.tournaments
FOR SELECT
USING (true);

CREATE POLICY "Admins can create tournaments"
ON public.tournaments
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update tournaments"
ON public.tournaments
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete tournaments"
ON public.tournaments
FOR DELETE
TO authenticated
USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.tournament_participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  response TEXT NOT NULL DEFAULT 'pending' CHECK (response IN ('pending', 'accepted', 'rejected')),
  reject_reason TEXT,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE (tournament_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_participations_tournament_response
ON public.tournament_participations (tournament_id, response);

CREATE INDEX IF NOT EXISTS idx_tournament_participations_user
ON public.tournament_participations (user_id);

ALTER TABLE public.tournament_participations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users and admins can view tournament participations"
ON public.tournament_participations
FOR SELECT
TO authenticated
USING ((auth.uid() = user_id) OR public.is_admin());

CREATE POLICY "Admins can create tournament participations"
ON public.tournament_participations
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Users can respond to own participation"
ON public.tournament_participations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update tournament participations"
ON public.tournament_participations
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete tournament participations"
ON public.tournament_participations
FOR DELETE
TO authenticated
USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.admin_send_tournament_invites(
  _tournament_id UUID,
  _title TEXT DEFAULT 'Tournament Invite',
  _message TEXT DEFAULT 'Do you want to play our next tournament?'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can send tournament invites';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = _tournament_id) THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  INSERT INTO public.tournament_participations (tournament_id, user_id)
  SELECT DISTINCT
    _tournament_id,
    u.id
  FROM auth.users u
  WHERE u.email_confirmed_at IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.join_applications ja
      WHERE ja.user_id = u.id
        AND ja.status = 'accepted'
    )
    AND EXISTS (
      SELECT 1
      FROM public.notification_allowlist na
      WHERE lower(na.email) = lower(u.email)
    )
  ON CONFLICT (tournament_id, user_id)
  DO UPDATE SET
    invited_at = now(),
    response = 'pending',
    reject_reason = NULL,
    responded_at = NULL;

  INSERT INTO public.inbox_notifications (
    recipient_user_id,
    sender_user_id,
    title,
    message,
    related_report_id
  )
  SELECT DISTINCT
    u.id,
    auth.uid(),
    COALESCE(NULLIF(btrim(_title), ''), 'Tournament Invite'),
    COALESCE(NULLIF(btrim(_message), ''), 'Do you want to play our next tournament?') || E'\n\nTournament ID: ' || _tournament_id::text,
    NULL
  FROM auth.users u
  WHERE u.email_confirmed_at IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.join_applications ja
      WHERE ja.user_id = u.id
        AND ja.status = 'accepted'
    )
    AND EXISTS (
      SELECT 1
      FROM public.notification_allowlist na
      WHERE lower(na.email) = lower(u.email)
    );

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_tournament_participation_response_time()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.response IS DISTINCT FROM OLD.response THEN
    NEW.responded_at := now();
    IF NEW.response <> 'rejected' THEN
      NEW.reject_reason := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tournaments_updated_at ON public.tournaments;
CREATE TRIGGER trg_tournaments_updated_at
BEFORE UPDATE ON public.tournaments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_tournament_participations_response_time ON public.tournament_participations;
CREATE TRIGGER trg_tournament_participations_response_time
BEFORE UPDATE ON public.tournament_participations
FOR EACH ROW
EXECUTE FUNCTION public.set_tournament_participation_response_time();