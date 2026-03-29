-- Make admin checks case-insensitive to avoid false negatives for admin users
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_allowlist a
    JOIN auth.users u ON lower(u.email) = lower(a.email)
    WHERE u.id = auth.uid()
  );
$function$;

-- Add player ban metadata for admin moderation
ALTER TABLE public.player_stats
ADD COLUMN IF NOT EXISTS banned_matches integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS ban_reason text;

-- Admin broadcast notifications by audience
CREATE OR REPLACE FUNCTION public.send_inbox_notification_by_audience(
  _audience text,
  _title text,
  _message text
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
    RAISE EXCEPTION 'Only admins can send notifications';
  END IF;

  IF _title IS NULL OR btrim(_title) = '' THEN
    RAISE EXCEPTION 'Title is required';
  END IF;

  IF _message IS NULL OR btrim(_message) = '' THEN
    RAISE EXCEPTION 'Message is required';
  END IF;

  IF _audience NOT IN ('all_verified_users', 'team_members_only') THEN
    RAISE EXCEPTION 'Invalid audience';
  END IF;

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
    btrim(_title),
    btrim(_message),
    NULL
  FROM auth.users u
  WHERE u.email_confirmed_at IS NOT NULL
    AND (
      (_audience = 'all_verified_users')
      OR (
        _audience = 'team_members_only'
        AND EXISTS (
          SELECT 1
          FROM public.join_applications ja
          WHERE ja.user_id = u.id
            AND ja.status = 'accepted'
        )
      )
    );

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.send_inbox_notification_by_audience(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_inbox_notification_by_audience(text, text, text) TO authenticated;