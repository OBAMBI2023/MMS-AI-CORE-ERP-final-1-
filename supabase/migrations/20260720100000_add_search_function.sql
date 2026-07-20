-- ============================================================================
-- Fonction de recherche globale unifiée
-- ============================================================================

CREATE OR REPLACE FUNCTION public.global_search(search_query text)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  module text,
  url text,
  icon text
) AS $$
BEGIN
  RETURN QUERY
  -- Clients
  SELECT c.id, c.name, (COALESCE(c.phone, '') || ' ' || COALESCE(c.email, '')), 'Clients', '/clients', 'user'
  FROM public.clients c
  WHERE c.name ILIKE '%' || search_query || '%'
     OR c.phone ILIKE '%' || search_query || '%'
     OR c.email ILIKE '%' || search_query || '%'
     OR c.address ILIKE '%' || search_query || '%'
     OR c.notes ILIKE '%' || search_query || '%'
  
  UNION ALL
  
  -- Fournisseurs
  SELECT f.id, f.name, (COALESCE(f.phone, '') || ' ' || COALESCE(f.email, '')), 'Fournisseurs', '/fournisseurs', 'building'
  FROM public.fournisseurs f
  WHERE f.name ILIKE '%' || search_query || '%'
     OR f.phone ILIKE '%' || search_query || '%'
     OR f.email ILIKE '%' || search_query || '%'
     OR f.address ILIKE '%' || search_query || '%'
     OR f.notes ILIKE '%' || search_query || '%'
  
  UNION ALL
  
  -- Services
  SELECT s.id, s.name, s.category, 'Services', '/services', 'briefcase'
  FROM public.services s
  WHERE s.name ILIKE '%' || search_query || '%' OR s.category ILIKE '%' || search_query || '%'
  
  UNION ALL
  
  -- Ventes
  SELECT v.id, v.number, (COALESCE(v.client_name, '')), 'Ventes', '/ventes', 'receipt'
  FROM public.ventes v
  WHERE v.number ILIKE '%' || search_query || '%' OR v.client_name ILIKE '%' || search_query || '%'
  
  UNION ALL
  
  -- Achats
  SELECT a.id, a.number, (COALESCE(a.fournisseur_name, '')), 'Achats', '/achats', 'shopping-cart'
  FROM public.achats a
  WHERE a.number ILIKE '%' || search_query || '%' OR a.fournisseur_name ILIKE '%' || search_query || '%'
  
  UNION ALL
  
  -- Charges
  SELECT d.id, d.description, d.category, 'Charges', '/depenses', 'credit-card'
  FROM public.depenses d
  WHERE d.description ILIKE '%' || search_query || '%' OR d.category ILIKE '%' || search_query || '%'
  
  UNION ALL
  
  -- Devis
  SELECT de.id, de.number, (COALESCE(de.client_name, '')), 'Devis', '/devis', 'file-text'
  FROM public.devis de
  WHERE de.number ILIKE '%' || search_query || '%' OR de.client_name ILIKE '%' || search_query || '%'
  
  UNION ALL
  
  -- Paramètres
  SELECT p.id, p.company_name, 'Paramètres de l''entreprise', 'Paramètres', '/parametres', 'settings'
  FROM public.parametres p
  WHERE p.company_name ILIKE '%' || search_query || '%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
