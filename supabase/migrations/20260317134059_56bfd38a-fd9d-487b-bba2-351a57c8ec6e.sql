CREATE OR REPLACE FUNCTION public.admin_list_registered_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  created_at timestamptz,
  email_confirmed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can view registered users';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.created_at,
    u.email_confirmed_at
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_registered_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_registered_users() TO authenticated;