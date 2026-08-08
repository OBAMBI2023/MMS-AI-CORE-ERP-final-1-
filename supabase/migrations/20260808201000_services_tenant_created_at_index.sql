-- Evaluated during the MEDIUM stress test (tenant 8dd8375b-0d60-4835-bbe5-bd1fbda8d932):
-- services was the only core catalog table without a (tenant_id, created_at) index,
-- unlike ventes/achats/clients/fournisseurs/devis. Confirmed via EXPLAIN ANALYZE
-- before/after on the live MEDIUM dataset (10,022 rows for this tenant):
--   before: Seq Scan + Sort, 116.6ms for the unbounded "ORDER BY created_at DESC"
--           the Dashboard used to run (now removed — see the RPC migration in this
--           same batch), 33.4ms Seq Scan for the ilike search.
--   after:  Index Scan, 3.1ms for the same unbounded order-by (37x), <1ms for the
--           already-paginated CatalogPage query (was already fast via top-N
--           heapsort on a small table, but this removes the O(n) Seq Scan
--           component entirely, which matters as the table grows toward LARGE).
-- Created live via CREATE INDEX CONCURRENTLY (no lock, verified). This migration
-- uses a plain CREATE INDEX IF NOT EXISTS so it's a no-op replay against the
-- environment where it already exists, and a normal (non-concurrent, acceptable on
-- an empty/fresh table) creation anywhere else this migration set is applied.
CREATE INDEX IF NOT EXISTS idx_services_tenant_id_created_at
  ON public.services (tenant_id, created_at DESC);
