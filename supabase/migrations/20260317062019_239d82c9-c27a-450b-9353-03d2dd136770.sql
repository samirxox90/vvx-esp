-- Auto notifications for applications and reports

CREATE OR REPLACE FUNCTION public.notify_application_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.inbox_notifications (
    recipient_user_id,
    sender_user_id,
    title,
    message
  ) VALUES (
    NEW.user_id,
    NULL,
    'Application received',
    'Thanks for applying to join the team. Your application was submitted successfully and is now under review.'
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_application_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('accepted', 'rejected') THEN
    INSERT INTO public.inbox_notifications (
      recipient_user_id,
      sender_user_id,
      title,
      message
    ) VALUES (
      NEW.user_id,
      auth.uid(),
      CASE
        WHEN NEW.status = 'accepted' THEN 'Application accepted'
        ELSE 'Application rejected'
      END,
      CASE
        WHEN NEW.status = 'accepted' THEN 'Congratulations! Your team application has been accepted.'
        ELSE 'Your team application was reviewed and is currently not accepted. You can improve and apply again.'
      END
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_report_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.inbox_notifications (
    recipient_user_id,
    sender_user_id,
    title,
    message,
    related_report_id
  ) VALUES (
    NEW.reporter_user_id,
    NULL,
    'Report received',
    'Thanks for your report. Our admin team will review it and take action if needed.',
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_application_submitted ON public.join_applications;
CREATE TRIGGER trg_notify_application_submitted
AFTER INSERT ON public.join_applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_application_submitted();

DROP TRIGGER IF EXISTS trg_notify_application_status_change ON public.join_applications;
CREATE TRIGGER trg_notify_application_status_change
AFTER UPDATE OF status ON public.join_applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_application_status_change();

DROP TRIGGER IF EXISTS trg_notify_report_submitted ON public.player_reports;
CREATE TRIGGER trg_notify_report_submitted
AFTER INSERT ON public.player_reports
FOR EACH ROW
EXECUTE FUNCTION public.notify_report_submitted();