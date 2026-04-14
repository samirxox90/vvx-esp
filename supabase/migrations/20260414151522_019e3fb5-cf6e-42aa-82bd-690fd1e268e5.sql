CREATE OR REPLACE FUNCTION public.admin_send_tournament_invites_to_selected_emails(
  _tournament_id uuid,
  _emails text[],
  _title text DEFAULT 'Tournament Invite'::text,
  _message text DEFAULT 'Do you want to play our next tournament?'::text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inserted_count integer := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can send tournament invites';
  END IF;

  IF _tournament_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.tournaments t WHERE t.id = _tournament_id
  ) THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  IF _emails IS NULL OR array_length(_emails, 1) IS NULL THEN
    RAISE EXCEPTION 'At least one recipient email is required';
  END IF;

  INSERT INTO public.tournament_participations (tournament_id, user_id)
  SELECT DISTINCT
    _tournament_id,
    u.id
  FROM auth.users u
  WHERE lower(u.email) = ANY (
      SELECT lower(btrim(email_item))
      FROM unnest(_emails) AS email_item
      WHERE btrim(email_item) <> ''
    )
    AND u.email_confirmed_at IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.notification_allowlist na
      WHERE lower(na.email) = lower(u.email)
    )
    AND EXISTS (
      SELECT 1
      FROM public.join_applications ja
      WHERE ja.user_id = u.id
        AND ja.status = 'accepted'
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
  WHERE lower(u.email) = ANY (
      SELECT lower(btrim(email_item))
      FROM unnest(_emails) AS email_item
      WHERE btrim(email_item) <> ''
    )
    AND u.email_confirmed_at IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.notification_allowlist na
      WHERE lower(na.email) = lower(u.email)
    )
    AND EXISTS (
      SELECT 1
      FROM public.join_applications ja
      WHERE ja.user_id = u.id
        AND ja.status = 'accepted'
    );

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_tournament_participation_results(_tournament_id uuid DEFAULT NULL::uuid)
RETURNS TABLE (
  tournament_id uuid,
  tournament_title text,
  schedule_at timestamp with time zone,
  user_id uuid,
  user_email text,
  invited_at timestamp with time zone,
  response text,
  reject_reason text,
  responded_at timestamp with time zone,
  is_allowlisted boolean,
  is_team_member boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can view tournament participation results';
  END IF;

  RETURN QUERY
  SELECT
    tp.tournament_id,
    t.title AS tournament_title,
    t.schedule_at,
    tp.user_id,
    u.email::text AS user_email,
    tp.invited_at,
    tp.response,
    tp.reject_reason,
    tp.responded_at,
    EXISTS (
      SELECT 1
      FROM public.notification_allowlist na
      WHERE lower(na.email) = lower(u.email)
    ) AS is_allowlisted,
    EXISTS (
      SELECT 1
      FROM public.join_applications ja
      WHERE ja.user_id = tp.user_id
        AND ja.status = 'accepted'
    ) AS is_team_member
  FROM public.tournament_participations tp
  JOIN public.tournaments t ON t.id = tp.tournament_id
  JOIN auth.users u ON u.id = tp.user_id
  WHERE _tournament_id IS NULL OR tp.tournament_id = _tournament_id
  ORDER BY t.schedule_at DESC, tp.invited_at DESC;
END;
$$;