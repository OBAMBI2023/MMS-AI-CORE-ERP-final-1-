-- Un devis "accepté" n'est pas de l'argent encaissé : le CA (revenue_total /
-- revenue_month / revenue_prev_month / weekly trend / monthly series) sommait
-- jusqu'ici devis.total pour tout devis status='accepté', gonflant le CA au
-- moment de l'acceptation alors qu'aucun paiement n'a été reçu. Ce correctif
-- introduit un vrai grand-livre de règlements par devis (mêmes principes que
-- hotel_reservation_payments/collect_hotel_invoice_payment) et calcule le CA
-- encaissé à partir des paiements réellement enregistrés, jamais du statut.
--
-- Aucune table devis dupliquée : devis_payments s'attache au devis existant,
-- et devis_balances est une VUE (paid_total/balance_due/settlement_status
-- calculés à la volée), pas une copie de données.

-- 1. FK cross-tenant sûre depuis devis_payments vers devis.
ALTER TABLE public.devis ADD CONSTRAINT devis_id_tenant_id_key UNIQUE (id, tenant_id);

-- 2. Grand-livre des règlements (plusieurs paiements par devis).
CREATE TABLE public.devis_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  devis_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  method text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  reference text,
  notes text,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (devis_id, tenant_id) REFERENCES public.devis(id, tenant_id) ON DELETE RESTRICT
);

CREATE INDEX devis_payments_tenant_devis_idx ON public.devis_payments(tenant_id, devis_id);

ALTER TABLE public.devis_payments ENABLE ROW LEVEL SECURITY;
-- Historique immuable côté client : toute écriture passe par
-- collect_devis_payment (SECURITY DEFINER), jamais par un accès table direct.
CREATE POLICY devis_payments_select ON public.devis_payments FOR SELECT TO authenticated
USING (tenant_id = public.current_tenant_id());
REVOKE ALL ON public.devis_payments FROM anon;
GRANT SELECT ON public.devis_payments TO authenticated;
GRANT ALL ON public.devis_payments TO service_role;

-- 3. Solde par devis, calculé à la volée (security_invoker => RLS de devis /
--    devis_payments appliquée avec les droits de l'appelant, jamais de fuite
--    cross-tenant même si cette vue est interrogée directement en client).
CREATE OR REPLACE VIEW public.devis_balances WITH (security_invoker = true) AS
SELECT
  d.*,
  COALESCE(p.paid_total, 0) AS paid_total,
  d.total - COALESCE(p.paid_total, 0) AS balance_due,
  CASE
    WHEN d.status <> 'accepté' THEN NULL
    WHEN COALESCE(p.paid_total, 0) <= 0 THEN 'en_attente'
    WHEN COALESCE(p.paid_total, 0) < d.total THEN 'partiel'
    ELSE 'reglé'
  END AS settlement_status
FROM public.devis d
LEFT JOIN (
  SELECT tenant_id, devis_id, SUM(amount) AS paid_total
  FROM public.devis_payments
  GROUP BY 1, 2
) p ON p.tenant_id = d.tenant_id AND p.devis_id = d.id;

GRANT SELECT ON public.devis_balances TO authenticated, service_role;

-- 4. Seul point d'écriture pour un règlement : verrouille le devis, revérifie
--    tenant/permission/statut/solde côté serveur (jamais de confiance dans
--    des valeurs client), puis ajoute la ligne au grand-livre. Idempotence
--    de la contrainte de solde garantie par le row lock (FOR UPDATE) : deux
--    appels concurrents sur le même devis se sérialisent, le second relit un
--    solde à jour et ne peut pas dépasser le reste à payer.
CREATE OR REPLACE FUNCTION public.collect_devis_payment(
  requested_devis_id uuid,
  requested_amount numeric,
  requested_method text DEFAULT NULL,
  requested_reference text DEFAULT NULL,
  requested_notes text DEFAULT NULL,
  requested_paid_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target public.devis%ROWTYPE;
  remaining numeric;
  payment_id uuid;
  effective_paid_at timestamptz;
BEGIN
  IF requested_amount IS NULL OR requested_amount <= 0 THEN
    RAISE EXCEPTION 'Le montant doit être positif';
  END IF;
  effective_paid_at := COALESCE(requested_paid_at, now());
  IF effective_paid_at::date > now()::date THEN
    RAISE EXCEPTION 'La date de règlement ne peut pas être dans le futur';
  END IF;

  SELECT * INTO target FROM public.devis WHERE id = requested_devis_id FOR UPDATE;
  IF NOT FOUND
     OR target.tenant_id <> public.current_tenant_id()
     OR NOT public.has_permission('devis.edit') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Règlement interdit';
  END IF;
  IF target.status <> 'accepté' THEN
    RAISE EXCEPTION 'Seul un devis accepté peut être réglé';
  END IF;

  SELECT GREATEST(0, balance_due) INTO remaining
  FROM public.devis_balances WHERE tenant_id = target.tenant_id AND id = target.id;
  IF requested_amount > remaining THEN
    RAISE EXCEPTION 'Le règlement dépasse le reste à payer';
  END IF;

  INSERT INTO public.devis_payments (tenant_id, devis_id, amount, method, paid_at, reference, notes)
  VALUES (
    target.tenant_id, target.id, requested_amount, NULLIF(BTRIM(COALESCE(requested_method, '')), ''),
    effective_paid_at, NULLIF(BTRIM(COALESCE(requested_reference, '')), ''),
    NULLIF(BTRIM(COALESCE(requested_notes, '')), '')
  )
  RETURNING id INTO payment_id;

  RETURN payment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.collect_devis_payment(uuid, numeric, text, text, text, timestamptz)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.collect_devis_payment(uuid, numeric, text, text, text, timestamptz)
  TO authenticated, service_role;

-- 5. devis_summary étendu avec des filtres optionnels statut/règlement, pour
--    que la barre de total reflète l'onglet actif (Acceptés / Partiellement
--    réglés / Réglés). p_search reste le premier paramètre : compatible avec
--    l'appel existant devis_summary({ p_search }).
CREATE OR REPLACE FUNCTION public.devis_summary(
  p_search text DEFAULT NULL::text,
  p_status text DEFAULT NULL::text,
  p_settlement_status text DEFAULT NULL::text
)
RETURNS TABLE(count bigint, total numeric)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_search text := btrim(coalesce(p_search, ''));
  v_pattern text;
BEGIN
  IF v_search = '' THEN
    v_pattern := NULL;
  ELSE
    v_pattern := '%' || replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  END IF;

  RETURN QUERY
  SELECT count(*), coalesce(sum(d.total), 0)
  FROM public.devis_balances d
  WHERE d.tenant_id = current_tenant_id()
    AND (p_status IS NULL OR d.status = p_status)
    AND (p_settlement_status IS NULL OR d.settlement_status = p_settlement_status)
    AND (
      v_pattern IS NULL
      OR d.number ILIKE v_pattern ESCAPE '\'
      OR d.client_name ILIKE v_pattern ESCAPE '\'
    );
END;
$$;

-- 6. Fix du CA : un devis accepté n'ajoute plus jamais son montant total au
--    CA. Seule la somme des règlements réellement enregistrés (devis_payments,
--    bornée par paid_at comme depenses.paid_at) alimente le CA encaissé.
CREATE OR REPLACE FUNCTION public.get_dashboard_kpi_totals(
  p_prev_month_start timestamptz,
  p_month_start timestamptz,
  p_now timestamptz
)
RETURNS json
LANGUAGE sql
STABLE
AS $$
  WITH tid AS (SELECT public.current_tenant_id() AS t)
  SELECT json_build_object(
    'revenue_total',
      (SELECT COALESCE(SUM(v.total), 0) FROM public.ventes v, tid WHERE v.tenant_id = tid.t)
      + (SELECT COALESCE(SUM(dp.amount), 0) FROM public.devis_payments dp, tid WHERE dp.tenant_id = tid.t),
    'revenue_month',
      (SELECT COALESCE(SUM(v.total), 0) FROM public.ventes v, tid WHERE v.tenant_id = tid.t AND v.created_at >= p_month_start AND v.created_at < p_now)
      + (SELECT COALESCE(SUM(dp.amount), 0) FROM public.devis_payments dp, tid WHERE dp.tenant_id = tid.t AND dp.paid_at >= p_month_start AND dp.paid_at < p_now),
    'revenue_prev_month',
      (SELECT COALESCE(SUM(v.total), 0) FROM public.ventes v, tid WHERE v.tenant_id = tid.t AND v.created_at >= p_prev_month_start AND v.created_at < p_month_start)
      + (SELECT COALESCE(SUM(dp.amount), 0) FROM public.devis_payments dp, tid WHERE dp.tenant_id = tid.t AND dp.paid_at >= p_prev_month_start AND dp.paid_at < p_month_start),
    'depenses_total', (SELECT COALESCE(SUM(d.amount), 0) FROM public.depenses d, tid WHERE d.tenant_id = tid.t),
    'depenses_month', (SELECT COALESCE(SUM(d.amount), 0) FROM public.depenses d, tid WHERE d.tenant_id = tid.t AND d.paid_at >= p_month_start AND d.paid_at < p_now),
    'depenses_prev_month', (SELECT COALESCE(SUM(d.amount), 0) FROM public.depenses d, tid WHERE d.tenant_id = tid.t AND d.paid_at >= p_prev_month_start AND d.paid_at < p_month_start),
    'depenses_count_total', (SELECT COUNT(*) FROM public.depenses d, tid WHERE d.tenant_id = tid.t),
    'achats_total', (SELECT COALESCE(SUM(a.total), 0) FROM public.achats a, tid WHERE a.tenant_id = tid.t),
    'achats_month', (SELECT COALESCE(SUM(a.total), 0) FROM public.achats a, tid WHERE a.tenant_id = tid.t AND a.created_at >= p_month_start AND a.created_at < p_now),
    'achats_prev_month', (SELECT COALESCE(SUM(a.total), 0) FROM public.achats a, tid WHERE a.tenant_id = tid.t AND a.created_at >= p_prev_month_start AND a.created_at < p_month_start),
    'achats_count_total', (SELECT COUNT(*) FROM public.achats a, tid WHERE a.tenant_id = tid.t),
    'clients_total', (SELECT COUNT(*) FROM public.clients c, tid WHERE c.tenant_id = tid.t),
    'clients_month', (SELECT COUNT(*) FROM public.clients c, tid WHERE c.tenant_id = tid.t AND c.created_at >= p_month_start AND c.created_at < p_now),
    'clients_prev_month', (SELECT COUNT(*) FROM public.clients c, tid WHERE c.tenant_id = tid.t AND c.created_at >= p_prev_month_start AND c.created_at < p_month_start),
    'fournisseurs_total', (SELECT COUNT(*) FROM public.fournisseurs f, tid WHERE f.tenant_id = tid.t),
    'fournisseurs_month', (SELECT COUNT(*) FROM public.fournisseurs f, tid WHERE f.tenant_id = tid.t AND f.created_at >= p_month_start AND f.created_at < p_now),
    'fournisseurs_prev_month', (SELECT COUNT(*) FROM public.fournisseurs f, tid WHERE f.tenant_id = tid.t AND f.created_at >= p_prev_month_start AND f.created_at < p_month_start),
    'ventes_total', (SELECT COUNT(*) FROM public.ventes v, tid WHERE v.tenant_id = tid.t),
    'ventes_month', (SELECT COUNT(*) FROM public.ventes v, tid WHERE v.tenant_id = tid.t AND v.created_at >= p_month_start AND v.created_at < p_now),
    'ventes_prev_month', (SELECT COUNT(*) FROM public.ventes v, tid WHERE v.tenant_id = tid.t AND v.created_at >= p_prev_month_start AND v.created_at < p_month_start),
    'services_total', (SELECT COUNT(*) FROM public.services s, tid WHERE s.tenant_id = tid.t),
    'services_month', (SELECT COUNT(*) FROM public.services s, tid WHERE s.tenant_id = tid.t AND s.created_at >= p_month_start AND s.created_at < p_now),
    'services_prev_month', (SELECT COUNT(*) FROM public.services s, tid WHERE s.tenant_id = tid.t AND s.created_at >= p_prev_month_start AND s.created_at < p_month_start),
    'devis_count_total', (SELECT COUNT(*) FROM public.devis dv, tid WHERE dv.tenant_id = tid.t),
    'devis_pending_count', (SELECT COUNT(*) FROM public.devis dv, tid WHERE dv.tenant_id = tid.t AND dv.status = 'envoyé'),
    'devis_pending_total', (SELECT COALESCE(SUM(dv.total), 0) FROM public.devis dv, tid WHERE dv.tenant_id = tid.t AND dv.status = 'envoyé')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_weekly_trend(
  p_week_starts timestamptz[],
  p_week_ends timestamptz[]
)
RETURNS TABLE(
  idx int,
  revenue numeric,
  depenses numeric,
  achats numeric,
  benefice numeric,
  clients_count bigint,
  fournisseurs_count bigint,
  ventes_count bigint,
  services_count bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH tid AS (SELECT public.current_tenant_id() AS t),
  weeks AS (
    SELECT ord::int AS idx, ws AS week_start, we AS week_end
    FROM unnest(p_week_starts, p_week_ends) WITH ORDINALITY AS u(ws, we, ord)
  )
  SELECT
    w.idx,
    COALESCE((SELECT SUM(v.total) FROM public.ventes v, tid WHERE v.tenant_id = tid.t AND v.created_at >= w.week_start AND v.created_at <= w.week_end), 0)
      + COALESCE((SELECT SUM(dp.amount) FROM public.devis_payments dp, tid WHERE dp.tenant_id = tid.t AND dp.paid_at >= w.week_start AND dp.paid_at <= w.week_end), 0) AS revenue,
    COALESCE((SELECT SUM(d.amount) FROM public.depenses d, tid WHERE d.tenant_id = tid.t AND d.paid_at >= w.week_start AND d.paid_at <= w.week_end), 0) AS depenses,
    COALESCE((SELECT SUM(a.total) FROM public.achats a, tid WHERE a.tenant_id = tid.t AND a.created_at >= w.week_start AND a.created_at <= w.week_end), 0) AS achats,
    COALESCE((SELECT SUM(v2.total) FROM public.ventes v2, tid WHERE v2.tenant_id = tid.t AND v2.created_at >= w.week_start AND v2.created_at <= w.week_end), 0) AS benefice,
    COALESCE((SELECT COUNT(*) FROM public.clients c, tid WHERE c.tenant_id = tid.t AND c.created_at >= w.week_start AND c.created_at <= w.week_end), 0) AS clients_count,
    COALESCE((SELECT COUNT(*) FROM public.fournisseurs f, tid WHERE f.tenant_id = tid.t AND f.created_at >= w.week_start AND f.created_at <= w.week_end), 0) AS fournisseurs_count,
    COALESCE((SELECT COUNT(*) FROM public.ventes v3, tid WHERE v3.tenant_id = tid.t AND v3.created_at >= w.week_start AND v3.created_at <= w.week_end), 0) AS ventes_count,
    COALESCE((SELECT COUNT(*) FROM public.services s, tid WHERE s.tenant_id = tid.t AND s.created_at >= w.week_start AND s.created_at <= w.week_end), 0) AS services_count
  FROM weeks w
  ORDER BY w.idx;
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_monthly_series(
  p_month_starts timestamptz[],
  p_month_ends timestamptz[]
)
RETURNS TABLE(idx int, ca numeric, depenses numeric, achats numeric)
LANGUAGE sql
STABLE
AS $$
  WITH tid AS (SELECT public.current_tenant_id() AS t),
  months AS (
    SELECT ord::int AS idx, ms AS month_start, me AS month_end
    FROM unnest(p_month_starts, p_month_ends) WITH ORDINALITY AS u(ms, me, ord)
  )
  SELECT
    m.idx,
    COALESCE((SELECT SUM(v.total) FROM public.ventes v, tid WHERE v.tenant_id = tid.t AND v.created_at >= m.month_start AND v.created_at < m.month_end), 0)
      + COALESCE((SELECT SUM(dp.amount) FROM public.devis_payments dp, tid WHERE dp.tenant_id = tid.t AND dp.paid_at >= m.month_start AND dp.paid_at < m.month_end), 0) AS ca,
    COALESCE((SELECT SUM(d.amount) FROM public.depenses d, tid WHERE d.tenant_id = tid.t AND d.paid_at >= m.month_start AND d.paid_at < m.month_end), 0) AS depenses,
    COALESCE((SELECT SUM(a.total) FROM public.achats a, tid WHERE a.tenant_id = tid.t AND a.created_at >= m.month_start AND a.created_at < m.month_end), 0) AS achats
  FROM months m
  ORDER BY m.idx;
$$;
