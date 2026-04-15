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
AS $function$
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

  WITH normalized_emails AS (
    SELECT DISTINCT lower(btrim(email_item)) AS email
    FROM unnest(_emails) AS email_item
    WHERE btrim(email_item) <> ''
  ),
  recipients AS (
    SELECT DISTINCT u.id, lower(u.email) AS email
    FROM auth.users u
    JOIN normalized_emails ne ON ne.email = lower(u.email)
    WHERE u.email IS NOT NULL
      AND u.email_confirmed_at IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.notification_allowlist na
        WHERE lower(na.email) = lower(u.email)
      )
  )
  INSERT INTO public.tournament_participations (tournament_id, user_id)
  SELECT _tournament_id, r.id
  FROM recipients r
  ON CONFLICT (tournament_id, user_id)
  DO UPDATE SET
    invited_at = now(),
    response = 'pending',
    reject_reason = NULL,
    responded_at = NULL;

  WITH normalized_emails AS (
    SELECT DISTINCT lower(btrim(email_item)) AS email
    FROM unnest(_emails) AS email_item
    WHERE btrim(email_item) <> ''
  ),
  recipients AS (
    SELECT DISTINCT u.id
    FROM auth.users u
    JOIN normalized_emails ne ON ne.email = lower(u.email)
    WHERE u.email IS NOT NULL
      AND u.email_confirmed_at IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.notification_allowlist na
        WHERE lower(na.email) = lower(u.email)
      )
  )
  INSERT INTO public.inbox_notifications (
    recipient_user_id,
    sender_user_id,
    title,
    message,
    related_report_id
  )
  SELECT
    r.id,
    auth.uid(),
    COALESCE(NULLIF(btrim(_title), ''), 'Tournament Invite'),
    COALESCE(NULLIF(btrim(_message), ''), 'Do you want to play our next tournament?') || E'\n\nTournament ID: ' || _tournament_id::text,
    NULL
  FROM recipients r;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$function$;