-- Support module: tenants exchange with the SAOVIA team in structured ticket
-- conversations. Project-wide (not a toggleable pack like Hotel), so it uses
-- the ordinary current_tenant_id()/has_permission() baseline (see ventes/
-- clients RLS) rather than the hotel_permission_for() module-gated pattern.
--
-- Write surface is intentionally narrow: no INSERT/UPDATE RLS policies are
-- granted to `authenticated` at all. Every tenant-facing mutation goes
-- through a SECURITY DEFINER RPC that re-checks has_permission() internally
-- (create_support_ticket, reply_support_ticket, close_support_ticket,
-- reopen_support_ticket, mark_support_messages_read) so a single forgotten
-- WITH CHECK clause can't leak write access. Super-admin mutations (status/
-- priority changes, replying as "support") go through the service-role
-- client from server functions, mirroring src/lib/super-admin.server.ts.

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  subject text NOT NULL,
  category text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_tickets_subject_check CHECK (btrim(subject) <> ''),
  CONSTRAINT support_tickets_category_check CHECK (category IN (
    'Bug', 'Question', 'Facturation', 'Demande de fonctionnalité', 'Compte / Accès', 'Autre'
  )),
  CONSTRAINT support_tickets_priority_check CHECK (priority IN ('normal', 'high', 'urgent')),
  CONSTRAINT support_tickets_status_check CHECK (status IN (
    'open', 'in_progress', 'waiting_customer', 'resolved', 'closed'
  ))
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_status
  ON public.support_tickets (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_last_message
  ON public.support_tickets (tenant_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES auth.users(id),
  sender_type text NOT NULL,
  message text NOT NULL,
  attachment_path text,
  attachment_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CONSTRAINT support_messages_message_check CHECK (btrim(message) <> ''),
  CONSTRAINT support_messages_sender_type_check CHECK (sender_type IN ('tenant', 'support'))
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket
  ON public.support_messages (ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_support_messages_tenant_unread
  ON public.support_messages (tenant_id, sender_type, read_at);

DROP TRIGGER IF EXISTS support_tickets_set_updated_at ON public.support_tickets;
CREATE TRIGGER support_tickets_set_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.support_messages_touch_ticket() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.support_tickets
  SET last_message_at = NEW.created_at,
      updated_at = now(),
      status = CASE
        WHEN NEW.sender_type = 'tenant' AND status IN ('resolved', 'closed') THEN 'open'
        WHEN NEW.sender_type = 'support' AND status = 'open' THEN 'in_progress'
        ELSE status
      END
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS support_messages_touch_ticket ON public.support_messages;
CREATE TRIGGER support_messages_touch_ticket
AFTER INSERT ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.support_messages_touch_ticket();

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.support_tickets TO authenticated;
GRANT SELECT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
GRANT ALL ON public.support_messages TO service_role;

CREATE POLICY "support_tickets_select" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (
    (tenant_id = public.current_tenant_id() AND public.has_permission('support.view'))
    OR EXISTS (SELECT 1 FROM public.platform_admins admin WHERE admin.user_id = auth.uid())
  );

CREATE POLICY "support_messages_select" ON public.support_messages
  FOR SELECT TO authenticated
  USING (
    (tenant_id = public.current_tenant_id() AND public.has_permission('support.view'))
    OR EXISTS (SELECT 1 FROM public.platform_admins admin WHERE admin.user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.create_support_ticket(
  requested_subject text,
  requested_category text,
  requested_priority text,
  requested_message text,
  requested_attachment_path text DEFAULT NULL,
  requested_attachment_name text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_ticket_id uuid;
  tenant uuid := public.current_tenant_id();
BEGIN
  IF tenant IS NULL OR NOT public.has_permission('support.create') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Permission requise pour créer un ticket.';
  END IF;
  IF btrim(coalesce(requested_subject, '')) = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Le sujet est obligatoire.';
  END IF;
  IF btrim(coalesce(requested_message, '')) = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Le message est obligatoire.';
  END IF;

  INSERT INTO public.support_tickets (tenant_id, created_by, subject, category, priority, status)
  VALUES (tenant, auth.uid(), btrim(requested_subject), requested_category, requested_priority, 'open')
  RETURNING id INTO new_ticket_id;

  INSERT INTO public.support_messages
    (ticket_id, tenant_id, sender_user_id, sender_type, message, attachment_path, attachment_name)
  VALUES
    (new_ticket_id, tenant, auth.uid(), 'tenant', btrim(requested_message), requested_attachment_path, requested_attachment_name);

  RETURN new_ticket_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reply_support_ticket(
  requested_ticket_id uuid,
  requested_message text,
  requested_attachment_path text DEFAULT NULL,
  requested_attachment_name text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_message_id uuid;
  tenant uuid := public.current_tenant_id();
BEGIN
  IF tenant IS NULL OR NOT public.has_permission('support.view') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Permission requise pour répondre à ce ticket.';
  END IF;
  IF btrim(coalesce(requested_message, '')) = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Le message est obligatoire.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = requested_ticket_id AND t.tenant_id = tenant
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Ticket introuvable ou accès refusé.';
  END IF;

  INSERT INTO public.support_messages
    (ticket_id, tenant_id, sender_user_id, sender_type, message, attachment_path, attachment_name)
  VALUES
    (requested_ticket_id, tenant, auth.uid(), 'tenant', btrim(requested_message), requested_attachment_path, requested_attachment_name)
  RETURNING id INTO new_message_id;

  RETURN new_message_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_support_ticket(requested_ticket_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_permission('support.view') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Permission requise pour fermer ce ticket.';
  END IF;
  UPDATE public.support_tickets
  SET status = 'closed'
  WHERE id = requested_ticket_id AND tenant_id = public.current_tenant_id();
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Ticket introuvable ou accès refusé.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.reopen_support_ticket(requested_ticket_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_permission('support.view') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Permission requise pour rouvrir ce ticket.';
  END IF;
  UPDATE public.support_tickets
  SET status = 'open'
  WHERE id = requested_ticket_id
    AND tenant_id = public.current_tenant_id()
    AND status IN ('resolved', 'closed');
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Ticket introuvable, accès refusé, ou déjà ouvert.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_support_messages_read(requested_ticket_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  tenant uuid := public.current_tenant_id();
  is_admin_actor boolean := EXISTS (
    SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = auth.uid()
  );
BEGIN
  IF is_admin_actor THEN
    UPDATE public.support_messages
    SET read_at = now()
    WHERE ticket_id = requested_ticket_id AND sender_type = 'tenant' AND read_at IS NULL;
  ELSIF tenant IS NOT NULL AND public.has_permission('support.view') THEN
    UPDATE public.support_messages
    SET read_at = now()
    WHERE ticket_id = requested_ticket_id
      AND tenant_id = tenant
      AND sender_type = 'support'
      AND read_at IS NULL;
  ELSE
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Accès refusé.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.create_support_ticket(text, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reply_support_ticket(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.close_support_ticket(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reopen_support_ticket(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_support_messages_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_support_ticket(text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reply_support_ticket(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_support_ticket(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_support_ticket(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_support_messages_read(uuid) TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-attachments', 'support-attachments', false, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "support_attachments_tenant_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'support-attachments'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
    AND (storage.foldername(name))[2] = 'attachments'
  );

CREATE POLICY "support_attachments_tenant_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'support-attachments'
    AND (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

INSERT INTO public.permissions (code, description)
VALUES
  ('support.view', 'Voir les tickets support'),
  ('support.create', 'Créer un ticket support')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.roles role
CROSS JOIN public.permissions permission
WHERE role.name = 'Administrateur'
  AND permission.code IN ('support.view', 'support.create')
ON CONFLICT (role_id, permission_id) DO NOTHING;
;
