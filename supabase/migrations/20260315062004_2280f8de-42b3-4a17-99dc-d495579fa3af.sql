-- Application submissions table
CREATE TABLE IF NOT EXISTS public.join_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  real_name TEXT NOT NULL,
  in_game_name TEXT NOT NULL,
  game_uid TEXT NOT NULL,
  gameplay_clip TEXT NOT NULL,
  playing_role TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.join_applications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_join_applications_user_id ON public.join_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_join_applications_created_at ON public.join_applications(created_at DESC);

CREATE POLICY "Users can create their own applications"
ON public.join_applications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own applications"
ON public.join_applications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can update applications"
ON public.join_applications
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Player reports table
CREATE TABLE IF NOT EXISTS public.player_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID NOT NULL,
  player_id UUID NOT NULL REFERENCES public.player_stats(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  forwarded_to_user_id UUID,
  forwarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.player_reports ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_player_reports_reporter ON public.player_reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_player_reports_player_id ON public.player_reports(player_id);
CREATE INDEX IF NOT EXISTS idx_player_reports_created_at ON public.player_reports(created_at DESC);

CREATE POLICY "Users can create reports"
ON public.player_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_user_id);

CREATE POLICY "Users can view own reports and admins see all"
ON public.player_reports
FOR SELECT
TO authenticated
USING (auth.uid() = reporter_user_id OR public.is_admin());

CREATE POLICY "Admins can update reports"
ON public.player_reports
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Notification recipient allowlist table
CREATE TABLE IF NOT EXISTS public.notification_allowlist (
  email TEXT PRIMARY KEY,
  added_by UUID,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_allowlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notification allowlist"
ON public.notification_allowlist
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can insert notification allowlist"
ON public.notification_allowlist
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete notification allowlist"
ON public.notification_allowlist
FOR DELETE
TO authenticated
USING (public.is_admin());

-- Inbox notifications table
CREATE TABLE IF NOT EXISTS public.inbox_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL,
  sender_user_id UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_report_id UUID REFERENCES public.player_reports(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inbox_notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_inbox_notifications_recipient ON public.inbox_notifications(recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_notifications_report_id ON public.inbox_notifications(related_report_id);

CREATE POLICY "Recipients can view their notifications"
ON public.inbox_notifications
FOR SELECT
TO authenticated
USING (recipient_user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Recipients can update read status"
ON public.inbox_notifications
FOR UPDATE
TO authenticated
USING (recipient_user_id = auth.uid() OR public.is_admin())
WITH CHECK (recipient_user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins can create notifications"
ON public.inbox_notifications
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Updated-at trigger on applications
DROP TRIGGER IF EXISTS update_join_applications_updated_at ON public.join_applications;
CREATE TRIGGER update_join_applications_updated_at
BEFORE UPDATE ON public.join_applications
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Helper function: send inbox notification by verified + allowlisted email
CREATE OR REPLACE FUNCTION public.send_inbox_notification_to_email(
  _recipient_email TEXT,
  _title TEXT,
  _message TEXT,
  _related_report_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  inserted_notification_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can send notifications';
  END IF;

  IF _recipient_email IS NULL OR btrim(_recipient_email) = '' THEN
    RAISE EXCEPTION 'Recipient email is required';
  END IF;

  IF _title IS NULL OR btrim(_title) = '' THEN
    RAISE EXCEPTION 'Title is required';
  END IF;

  IF _message IS NULL OR btrim(_message) = '' THEN
    RAISE EXCEPTION 'Message is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.notification_allowlist na
    WHERE lower(na.email) = lower(btrim(_recipient_email))
  ) THEN
    RAISE EXCEPTION 'Recipient email is not allowlisted';
  END IF;

  SELECT u.id
  INTO target_user_id
  FROM auth.users u
  WHERE lower(u.email) = lower(btrim(_recipient_email))
    AND u.email_confirmed_at IS NOT NULL
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Recipient must be a verified user';
  END IF;

  INSERT INTO public.inbox_notifications (
    recipient_user_id,
    sender_user_id,
    title,
    message,
    related_report_id
  )
  VALUES (
    target_user_id,
    auth.uid(),
    btrim(_title),
    btrim(_message),
    _related_report_id
  )
  RETURNING id INTO inserted_notification_id;

  RETURN inserted_notification_id;
END;
$$;

-- Helper function: forward report to allowlisted verified user
CREATE OR REPLACE FUNCTION public.forward_report_to_player(
  _report_id UUID,
  _recipient_email TEXT,
  _message TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_notification_id UUID;
  report_player_name TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can forward reports';
  END IF;

  SELECT ps.codename
  INTO report_player_name
  FROM public.player_reports pr
  JOIN public.player_stats ps ON ps.id = pr.player_id
  WHERE pr.id = _report_id;

  IF report_player_name IS NULL THEN
    RAISE EXCEPTION 'Report not found';
  END IF;

  target_notification_id := public.send_inbox_notification_to_email(
    _recipient_email,
    'Player Report: ' || report_player_name,
    _message,
    _report_id
  );

  UPDATE public.player_reports
  SET
    status = 'forwarded',
    forwarded_at = now()
  WHERE id = _report_id;

  RETURN target_notification_id;
END;
$$;