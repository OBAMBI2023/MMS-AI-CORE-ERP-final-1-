import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { configureCurrency } from "@/lib/mms/format";
import { useTenant } from "@/providers/TenantProvider";

type Row = Tables<"parametres">;

export const EDITABLE_PARAMETRES_FIELDS = [
  "company_name",
  "trade_name",
  "business_sector",
  "phone",
  "email",
  "website",
  "whatsapp",
  "city",
  "country",
  "address",
  "logo_url",
  "currency",
  "decimals",
  "date_format",
  "quote_prefix",
  "invoice_prefix",
  "receipt_prefix",
  "rccm",
  "tax_number",
  "tax_regime",
  "vat_rate",
  "signature_url",
  "stamp_url",
] as const;

export type ParametresForm = Pick<Row, (typeof EDITABLE_PARAMETRES_FIELDS)[number]>;

function toForm(row: Row): ParametresForm {
  const form = {} as ParametresForm;
  for (const key of EDITABLE_PARAMETRES_FIELDS) {
    (form as Record<string, unknown>)[key] = row[key];
  }
  return form;
}

function formatError(error: unknown) {
  const value = error as { message?: string };
  return value?.message || "Une erreur inattendue est survenue.";
}

/**
 * Single source of truth for editing the tenant's `parametres` row across every
 * Général / Légal / Facturation / Documents tab, so switching tabs never loses
 * unsaved edits made in another tab — one form, one save mutation.
 */
export function useParametresEditor() {
  const queryClient = useQueryClient();
  const { profile, loading: tenantLoading } = useTenant();
  const tenantId = profile?.tenant_id;
  const [form, setForm] = useState<ParametresForm | null>(null);
  const [snapshot, setSnapshot] = useState<ParametresForm | null>(null);

  const query = useQuery({
    queryKey: ["parametres", tenantId],
    enabled: !tenantLoading && Boolean(tenantId),
    queryFn: async () => {
      if (!tenantId) throw new Error("Aucun tenant associé à ce compte.");
      const { data, error } = await supabase
        .from("parametres")
        .select("*")
        .eq("tenant_id", tenantId)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Les paramètres de ce tenant sont introuvables.");
      return data;
    },
  });

  useEffect(() => {
    if (!query.data) return;
    const next = toForm(query.data);
    setForm(next);
    setSnapshot(next);
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: async (values: ParametresForm) => {
      if (!tenantId || !query.data?.id) throw new Error("Tenant introuvable.");
      const payload: Partial<Row> = {
        ...values,
        company_name: values.company_name.trim(),
      };
      const { data, error } = await supabase
        .from("parametres")
        .update(payload)
        .eq("id", query.data.id)
        .eq("tenant_id", tenantId)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (saved) => {
      configureCurrency(saved.currency, saved.decimals);
      queryClient.setQueryData(["parametres", tenantId], saved);
      const next = toForm(saved);
      setForm(next);
      setSnapshot(next);
      await queryClient.invalidateQueries({ queryKey: ["parametres", tenantId] });
    },
  });

  const update = <K extends keyof ParametresForm>(key: K, value: ParametresForm[K]) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));

  const merge = (patch: Partial<ParametresForm>) =>
    setForm((current) => (current ? { ...current, ...patch } : current));

  const revert = () => {
    if (snapshot) setForm(snapshot);
  };

  const isDirty = Boolean(form && snapshot && JSON.stringify(form) !== JSON.stringify(snapshot));

  return {
    tenantId,
    settingsId: query.data?.id ?? null,
    loading: tenantLoading || query.isLoading,
    error: query.error,
    refetch: query.refetch,
    form,
    update,
    merge,
    revert,
    isDirty,
    save: () => (form ? saveMutation.mutateAsync(form) : Promise.resolve(undefined)),
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error ? formatError(saveMutation.error) : null,
  };
}
