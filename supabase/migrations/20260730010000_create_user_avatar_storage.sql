INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.can_manage_avatar_object(object_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  object_tenant uuid;
  object_user uuid;
BEGIN
  IF object_name !~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp)$' THEN
    RETURN false;
  END IF;

  object_tenant := split_part(object_name, '/', 1)::uuid;
  object_user := split_part(split_part(object_name, '/', 2), '.', 1)::uuid;

  RETURN object_tenant = public.current_tenant_id()
    AND EXISTS (
      SELECT 1
      FROM public.profiles target
      WHERE target.id = object_user
        AND target.tenant_id = object_tenant
        AND (target.id = auth.uid() OR public.is_admin())
    );
EXCEPTION WHEN invalid_text_representation THEN
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.can_manage_avatar_object(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_avatar_object(text) TO authenticated;

DROP POLICY IF EXISTS "avatars tenant read" ON storage.objects;
CREATE POLICY "avatars tenant read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

DROP POLICY IF EXISTS "avatars owner or admin insert" ON storage.objects;
CREATE POLICY "avatars owner or admin insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND public.can_manage_avatar_object(name)
  );

DROP POLICY IF EXISTS "avatars owner or admin update" ON storage.objects;
CREATE POLICY "avatars owner or admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND public.can_manage_avatar_object(name)
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND public.can_manage_avatar_object(name)
  );

DROP POLICY IF EXISTS "avatars owner or admin delete" ON storage.objects;
CREATE POLICY "avatars owner or admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND public.can_manage_avatar_object(name)
  );

CREATE OR REPLACE FUNCTION public.set_profile_avatar(
  target_user_id uuid,
  avatar_path text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_tenant uuid := public.current_tenant_id();
  previous_path text;
BEGIN
  IF caller_tenant IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.profiles target
    WHERE target.id = target_user_id
      AND target.tenant_id = caller_tenant
      AND (target.id = auth.uid() OR public.is_admin())
  ) THEN
    RAISE EXCEPTION 'Accès refusé à la photo de cet utilisateur.';
  END IF;

  IF avatar_path IS NOT NULL AND (
    avatar_path !~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp)$'
    OR split_part(avatar_path, '/', 1)::uuid <> caller_tenant
    OR split_part(split_part(avatar_path, '/', 2), '.', 1)::uuid <> target_user_id
  ) THEN
    RAISE EXCEPTION 'Chemin de photo de profil invalide.';
  END IF;

  SELECT profiles.avatar_url INTO previous_path
  FROM public.profiles
  WHERE id = target_user_id AND tenant_id = caller_tenant
  FOR UPDATE;

  UPDATE public.profiles
  SET avatar_url = avatar_path
  WHERE id = target_user_id AND tenant_id = caller_tenant;

  RETURN previous_path;
END;
$$;

REVOKE ALL ON FUNCTION public.set_profile_avatar(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_profile_avatar(uuid, text) TO authenticated;
