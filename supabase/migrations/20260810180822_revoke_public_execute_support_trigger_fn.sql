-- support_messages_touch_ticket() is a trigger function only — it relies on
-- the TG_* trigger context (NEW record) and errors if invoked directly, but
-- Postgres grants EXECUTE to PUBLIC by default on new functions, which
-- exposed it as a callable (harmless but unnecessary) RPC endpoint. Trigger
-- firing is unaffected by revoking direct-call EXECUTE — it runs through the
-- trigger mechanism, not the RPC/SQL-call ACL path.
REVOKE ALL ON FUNCTION public.support_messages_touch_ticket() FROM PUBLIC, anon, authenticated;
;
