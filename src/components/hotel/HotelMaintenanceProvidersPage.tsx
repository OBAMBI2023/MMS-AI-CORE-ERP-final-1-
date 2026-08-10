import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  Loader2,
  MapPin,
  MessageCircle,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { HotelAppShell } from "@/components/hotel/HotelAppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useActionPermission } from "@/hooks/use-action-permission";
import { useTenantModules } from "@/hooks/use-tenant-modules";
import { useTenant } from "@/providers/TenantProvider";
import { cn } from "@/lib/utils";

// The generated Supabase types do not include hotel_maintenance_providers yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type AvailabilityStatus = "available" | "busy" | "unavailable";

const AVAILABILITY_OPTIONS: { value: AvailabilityStatus; label: string }[] = [
  { value: "available", label: "Disponible" },
  { value: "busy", label: "Occupé" },
  { value: "unavailable", label: "Indisponible" },
];
const AVAILABILITY_LABEL: Record<AvailabilityStatus, string> = {
  available: "Disponible",
  busy: "Occupé",
  unavailable: "Indisponible",
};
const AVAILABILITY_BADGE: Record<AvailabilityStatus, string> = {
  available: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  busy: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  unavailable: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

// WhatsApp is stored in the existing `whatsapp` column as a normalized
// international number ("+225XXXXXXXXXX") — no new field/column. The picker
// below just splits that single stored string into a country dial code +
// local part for editing, and rejoins them on save.
const COUNTRY_CODES = [
  { dial: "225", label: "Côte d'Ivoire", flag: "🇨🇮" },
  { dial: "221", label: "Sénégal", flag: "🇸🇳" },
  { dial: "223", label: "Mali", flag: "🇲🇱" },
  { dial: "226", label: "Burkina Faso", flag: "🇧🇫" },
  { dial: "224", label: "Guinée", flag: "🇬🇳" },
  { dial: "233", label: "Ghana", flag: "🇬🇭" },
  { dial: "229", label: "Bénin", flag: "🇧🇯" },
  { dial: "228", label: "Togo", flag: "🇹🇬" },
  { dial: "234", label: "Nigéria", flag: "🇳🇬" },
  { dial: "33", label: "France", flag: "🇫🇷" },
  { dial: "1", label: "États-Unis / Canada", flag: "🇺🇸" },
] as const;
const DEFAULT_COUNTRY_DIAL = COUNTRY_CODES[0].dial;

/** Splits a stored WhatsApp value into { country, local }. Matches known
 * dial codes longest-first so e.g. a number under "225" is never mistaken
 * for the single-digit "1" code. Legacy values saved before this picker
 * existed have no "+" prefix at all — those fall back to the default
 * country with the full value as the local part, never dropping digits. */
function splitWhatsapp(stored: string | null | undefined): { country: string; local: string } {
  const digits = (stored ?? "").replace(/[^\d]/g, "");
  if (!digits) return { country: DEFAULT_COUNTRY_DIAL, local: "" };
  const byLength = [...COUNTRY_CODES].sort((a, b) => b.dial.length - a.dial.length);
  for (const code of byLength) {
    if (digits.startsWith(code.dial)) {
      return { country: code.dial, local: digits.slice(code.dial.length) };
    }
  }
  return { country: DEFAULT_COUNTRY_DIAL, local: digits };
}

function normalizeWhatsapp(countryDial: string, local: string): string {
  return `+${countryDial}${local.replace(/[^\d]/g, "")}`;
}

function toWhatsAppHref(value: string): string {
  const { country, local } = splitWhatsapp(value);
  return `https://wa.me/${country}${local}`;
}

type Provider = {
  id: string;
  tenant_id: string;
  full_name: string;
  company_name: string | null;
  trade: string;
  phone: string;
  whatsapp: string | null;
  intervention_area: string | null;
  availability_status: AvailabilityStatus;
  internal_note: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ProviderForm = {
  full_name: string;
  company_name: string;
  trade: string;
  phone: string;
  intervention_area: string;
  availability_status: AvailabilityStatus;
  internal_note: string;
  is_active: boolean;
};

const emptyForm = (): ProviderForm => ({
  full_name: "",
  company_name: "",
  trade: "",
  phone: "",
  intervention_area: "",
  availability_status: "available",
  internal_note: "",
  is_active: true,
});

export function HotelMaintenanceProvidersPage() {
  // Radix Dialog/AlertDialog/Sheet/DropdownMenu portal their content to
  // document.body by default, which sits outside HotelAppShell's
  // `.hotel-theme` div — CSS custom properties (--primary, --ring) don't
  // cross that boundary, so modals/menus fell back to the global blue
  // instead of the SAOVIA Hôtel green. Mirroring the theme class onto
  // <body> while this page is mounted fixes every portaled element at once
  // without touching the shared HotelAppShell (used by every other Hotel
  // page) or any global design token.
  useEffect(() => {
    document.body.classList.add("hotel-theme");
    return () => {
      document.body.classList.remove("hotel-theme");
    };
  }, []);

  const qc = useQueryClient();
  const { profile } = useTenant();
  const tenantId = profile?.tenant_id;
  const canView = useActionPermission("hotel.maintenance.view");
  const canCreate = useActionPermission("hotel.maintenance.create");
  const canUpdate = useActionPermission("hotel.maintenance.update");
  const modulesQuery = useTenantModules();
  const moduleEnabled = modulesQuery.data?.has("hotel_maintenance") ?? false;

  const [query, setQuery] = useState("");
  const [availability, setAvailability] = useState("all");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [deleting, setDeleting] = useState<Provider | null>(null);

  const providersQuery = useQuery({
    queryKey: ["hotel-maintenance-providers", tenantId],
    enabled: Boolean(tenantId) && canView,
    queryFn: async () => {
      const { data, error } = await db
        .from("hotel_maintenance_providers")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Provider[];
    },
  });

  const providers = providersQuery.data ?? [];
  const availableCount = providers.filter((p) => p.availability_status === "available").length;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return providers.filter((p) => {
      if (availability !== "all" && p.availability_status !== availability) return false;
      if (
        normalized &&
        !`${p.full_name} ${p.company_name ?? ""} ${p.trade} ${p.intervention_area ?? ""}`
          .toLocaleLowerCase("fr")
          .includes(normalized)
      )
        return false;
      return true;
    });
  }, [providers, query, availability]);

  const hasActiveFilters = Boolean(query || availability !== "all");
  const resetFilters = () => {
    setQuery("");
    setAvailability("all");
  };

  const deleteProvider = useMutation({
    mutationFn: async (provider: Provider) => {
      if (!tenantId) throw new Error("Établissement introuvable.");
      const { error } = await db
        .from("hotel_maintenance_providers")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("id", provider.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["hotel-maintenance-providers", tenantId] });
      setDeleting(null);
      toast.success("Prestataire supprimé");
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (provider: Provider) => {
    setEditing(provider);
    setFormOpen(true);
  };

  if (modulesQuery.isLoading) {
    return (
      <HotelAppShell title="Prestataires" subtitle="Annuaire des prestataires de maintenance">
        <Skeleton className="h-72 rounded-[24px]" />
      </HotelAppShell>
    );
  }

  if (!moduleEnabled) {
    return (
      <HotelAppShell title="Prestataires" subtitle="Annuaire des prestataires de maintenance">
        <div className="mt-4 grid min-h-72 place-items-center rounded-[24px] border border-dashed bg-muted/20 p-8 text-center">
          <div>
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <Wrench className="size-7" />
            </div>
            <h3 className="mt-4 font-semibold">Module non disponible</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Le module Prestataires n'est pas activé pour votre établissement. Contactez votre
              administrateur.
            </p>
          </div>
        </div>
      </HotelAppShell>
    );
  }

  if (!canView) {
    return (
      <HotelAppShell title="Prestataires" subtitle="Annuaire des prestataires de maintenance">
        <div className="mt-4 grid min-h-72 place-items-center rounded-[24px] border border-dashed bg-muted/20 p-8 text-center">
          <div>
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <Wrench className="size-7" />
            </div>
            <h3 className="mt-4 font-semibold">Accès restreint</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Vous n'avez pas la permission de consulter les prestataires de cet établissement.
            </p>
          </div>
        </div>
      </HotelAppShell>
    );
  }

  return (
    <HotelAppShell
      title="Prestataires"
      subtitle="Annuaire des prestataires de maintenance"
      actions={
        canCreate ? (
          <Button onClick={openCreate} size="sm" className="rounded-full px-3.5">
            <Plus className="size-4" />
            Nouveau prestataire
          </Button>
        ) : null
      }
    >
      <div className="grid grid-cols-2 divide-x divide-border overflow-hidden rounded-2xl border bg-card shadow-sm">
        {(
          [
            [String(providers.length), `Prestataire${providers.length > 1 ? "s" : ""}`],
            [String(availableCount), `Disponible${availableCount > 1 ? "s" : ""}`],
          ] as const
        ).map(([value, label]) => (
          <div key={label} className="flex items-center justify-center gap-2 px-3 py-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Wrench className="size-3.5" />
            </span>
            <p className="truncate text-sm font-semibold">
              <span className="font-bold">{value}</span> {label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-2.5 rounded-2xl border bg-card p-2 shadow-sm">
        <div className="flex items-center gap-2 sm:hidden">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nom, métier, secteur…"
              className="h-9 w-full rounded-xl border bg-background pl-9 pr-8 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Effacer la recherche"
                className="absolute right-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setFilterSheetOpen(true)}
            aria-label="Filtres"
            className="relative h-9 w-9 shrink-0 rounded-xl"
          >
            <SlidersHorizontal className="size-4" />
            {hasActiveFilters && (
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" />
            )}
          </Button>
        </div>

        <div className="hidden sm:grid sm:grid-cols-2 sm:gap-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]">
          <div className="relative min-w-0">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nom, métier, secteur…"
              className="h-11 w-full rounded-xl border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <FilterSelect
            value={availability}
            onChange={setAvailability}
            options={[
              ["all", "Toutes les disponibilités"],
              ...AVAILABILITY_OPTIONS.map((o) => [o.value, o.label]),
            ]}
          />
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="icon"
              onClick={resetFilters}
              aria-label="Réinitialiser les filtres"
              className="h-11 w-11 shrink-0 justify-self-start rounded-xl text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto rounded-t-[24px] sm:hidden"
        >
          <SheetHeader>
            <SheetTitle>Filtrer les prestataires</SheetTitle>
            <SheetDescription>Affinez la liste par disponibilité.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Disponibilité
              </p>
              <div className="flex flex-wrap gap-2">
                {[["all", "Toutes"], ...AVAILABILITY_OPTIONS.map((o) => [o.value, o.label])].map(
                  ([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAvailability(key)}
                      className={`h-10 rounded-xl px-3 text-sm font-medium ring-1 transition-colors ${
                        availability === key
                          ? "bg-primary text-primary-foreground ring-primary"
                          : "bg-background text-foreground ring-border hover:bg-muted"
                      }`}
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>
          <SheetFooter className="mt-6 flex-row gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={resetFilters}
              className="flex-1 rounded-xl"
            >
              Réinitialiser
            </Button>
            <Button
              type="button"
              onClick={() => setFilterSheetOpen(false)}
              className="flex-1 rounded-xl"
            >
              Voir {filtered.length} prestataire{filtered.length > 1 ? "s" : ""}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {providersQuery.isLoading ? (
        <>
          <div className="hidden min-h-72 place-items-center md:grid">
            <Loader2 className="size-7 animate-spin text-primary" />
          </div>
          <div className="mt-2.5 space-y-2 md:hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm"
              >
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : providersQuery.isError ? (
        <div className="mt-2.5 grid min-h-72 place-items-center rounded-[24px] border border-dashed bg-muted/20 p-8 text-center">
          <div>
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <Wrench className="size-7" />
            </div>
            <h3 className="mt-4 font-semibold">Impossible de charger les prestataires</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Vérifiez votre connexion puis réessayez.
            </p>
            <Button
              variant="outline"
              onClick={() => void providersQuery.refetch()}
              className="mt-5 rounded-xl"
            >
              Réessayer
            </Button>
          </div>
        </div>
      ) : filtered.length ? (
        <div className="mt-2.5 overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  {["Prestataire", "Métier", "Contact", "Secteur", "Disponibilité", "Actions"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((provider) => (
                  <ProviderRow
                    key={provider.id}
                    provider={provider}
                    canUpdate={canUpdate}
                    onEdit={() => openEdit(provider)}
                    onDelete={() => setDeleting(provider)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y md:hidden">
            {filtered.map((provider) => (
              <ProviderMobileCard
                key={provider.id}
                provider={provider}
                canUpdate={canUpdate}
                onEdit={() => openEdit(provider)}
                onDelete={() => setDeleting(provider)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-2.5 grid min-h-72 place-items-center rounded-[24px] border border-dashed bg-muted/20 p-8 text-center">
          <div>
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <Wrench className="size-7" />
            </div>
            <h3 className="mt-4 font-semibold">Aucun prestataire</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasActiveFilters
                ? "Aucun résultat pour ces filtres."
                : "Ajoutez votre premier prestataire de maintenance."}
            </p>
            {canCreate && !hasActiveFilters && (
              <Button onClick={openCreate} size="sm" className="mt-5 rounded-full px-3.5">
                <Plus className="size-4" />
                Nouveau prestataire
              </Button>
            )}
          </div>
        </div>
      )}

      <ProviderFormDialog
        open={formOpen}
        provider={editing}
        tenantId={tenantId}
        onOpenChange={setFormOpen}
        onSaved={() =>
          void qc.invalidateQueries({ queryKey: ["hotel-maintenance-providers", tenantId] })
        }
      />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce prestataire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment supprimer{" "}
              <span className="font-medium text-foreground">{deleting?.full_name}</span> ? Cette
              action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteProvider.mutate(deleting)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProvider.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </HotelAppShell>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <label className="relative flex h-11 items-center rounded-xl border bg-background px-3 text-sm">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none bg-transparent pr-7 outline-none"
      >
        {options.map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 size-3.5 text-muted-foreground" />
    </label>
  );
}

type RowProps = {
  provider: Provider;
  canUpdate: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

function ActionsMenu({ canUpdate, onEdit, onDelete }: Omit<RowProps, "provider">) {
  if (!canUpdate) return <span className="text-muted-foreground">—</span>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label="Actions">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil className="size-4" /> Modifier
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="size-4" /> Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProviderRow({ provider, canUpdate, onEdit, onDelete }: RowProps) {
  return (
    <tr className="hover:bg-muted/30">
      <td className="px-3 py-3">
        <p className="font-medium">{provider.full_name}</p>
        {provider.company_name && (
          <p className="text-xs text-muted-foreground">{provider.company_name}</p>
        )}
      </td>
      <td className="px-3 py-3">{provider.trade}</td>
      <td className="px-3 py-3">
        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Phone className="size-3" /> {provider.phone}
          </span>
          {provider.whatsapp && (
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="size-3" /> {provider.whatsapp}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-3 text-muted-foreground">
        {provider.intervention_area ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3" /> {provider.intervention_area}
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="px-3 py-3">
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            AVAILABILITY_BADGE[provider.availability_status],
          )}
        >
          {AVAILABILITY_LABEL[provider.availability_status]}
        </span>
      </td>
      <td className="px-3 py-3 text-right">
        <ActionsMenu canUpdate={canUpdate} onEdit={onEdit} onDelete={onDelete} />
      </td>
    </tr>
  );
}

function ProviderMobileCard({ provider, canUpdate, onEdit, onDelete }: RowProps) {
  const hasWhatsapp = Boolean(provider.whatsapp?.trim());
  return (
    <div className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <Wrench className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{provider.full_name}</p>
            <p className="truncate text-xs text-muted-foreground">{provider.trade}</p>
          </div>
        </div>
        <ActionsMenu canUpdate={canUpdate} onEdit={onEdit} onDelete={onDelete} />
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
            AVAILABILITY_BADGE[provider.availability_status],
          )}
        >
          {AVAILABILITY_LABEL[provider.availability_status]}
        </span>
        <div className="flex items-center gap-3">
          {hasWhatsapp && (
            <a
              href={toWhatsAppHref(provider.whatsapp as string)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
            >
              <MessageCircle className="size-3.5" /> WhatsApp
            </a>
          )}
          <a
            href={`tel:${provider.phone}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary"
          >
            <Phone className="size-3.5" /> Appeler
          </a>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5 block">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function ProviderFormDialog({
  open,
  provider,
  tenantId,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  provider: Provider | null;
  tenantId?: string;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ProviderForm>(emptyForm());
  const [whatsappCountry, setWhatsappCountry] = useState<string>(DEFAULT_COUNTRY_DIAL);
  const [whatsappLocal, setWhatsappLocal] = useState("");
  const isEdit = Boolean(provider);
  const reset = () => {
    setForm(
      provider
        ? {
            full_name: provider.full_name,
            company_name: provider.company_name ?? "",
            trade: provider.trade,
            phone: provider.phone,
            intervention_area: provider.intervention_area ?? "",
            availability_status: provider.availability_status,
            internal_note: provider.internal_note ?? "",
            is_active: provider.is_active,
          }
        : emptyForm(),
    );
    const { country, local } = splitWhatsapp(provider?.whatsapp);
    setWhatsappCountry(country);
    setWhatsappLocal(local);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Aucun établissement actif.");
      const fullName = form.full_name.trim();
      const trade = form.trade.trim();
      const phone = form.phone.trim();
      if (!fullName) throw new Error("Le nom est obligatoire.");
      if (!trade) throw new Error("Le métier est obligatoire.");
      if (!phone) throw new Error("Le téléphone est obligatoire.");
      const payload = {
        full_name: fullName,
        company_name: form.company_name.trim() || null,
        trade,
        phone,
        whatsapp: whatsappLocal.trim() ? normalizeWhatsapp(whatsappCountry, whatsappLocal) : null,
        intervention_area: form.intervention_area.trim() || null,
        availability_status: form.availability_status,
        internal_note: form.internal_note.trim() || null,
        is_active: form.is_active,
      };
      const result = provider
        ? await db
            .from("hotel_maintenance_providers")
            .update(payload)
            .eq("tenant_id", tenantId)
            .eq("id", provider.id)
        : await db.from("hotel_maintenance_providers").insert({ ...payload, tenant_id: tenantId });
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      toast.success(isEdit ? "Prestataire mis à jour" : "Prestataire ajouté");
      onSaved();
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex w-[calc(100vw-24px)] max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-[20px] p-0 sm:w-full sm:max-w-[560px]">
        <DialogHeader className="shrink-0 border-b px-4 py-4 sm:px-6">
          <DialogTitle>{isEdit ? "Modifier le prestataire" : "Nouveau prestataire"}</DialogTitle>
          <DialogDescription>
            Renseignez les informations du prestataire de maintenance.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!save.isPending) save.mutate();
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nom complet" required>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Ex : Kouassi Yao"
                  className="h-11"
                  autoFocus
                />
              </Field>
              <Field label="Entreprise">
                <Input
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  placeholder="Ex : Yao Plomberie"
                  className="h-11"
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Métier" required>
                <Input
                  value={form.trade}
                  onChange={(e) => setForm({ ...form, trade: e.target.value })}
                  placeholder="Ex : Plombier"
                  className="h-11"
                />
              </Field>
              <Field label="Disponibilité">
                <FilterSelect
                  value={form.availability_status}
                  onChange={(v) =>
                    setForm({ ...form, availability_status: v as AvailabilityStatus })
                  }
                  options={AVAILABILITY_OPTIONS.map((o) => [o.value, o.label])}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Téléphone" required>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Ex : 07 00 00 00 00"
                  className="h-11"
                />
              </Field>
              <Field label="WhatsApp">
                <div className="flex gap-2">
                  <div className="w-[118px] shrink-0">
                    <FilterSelect
                      value={whatsappCountry}
                      onChange={setWhatsappCountry}
                      options={COUNTRY_CODES.map((c) => [c.dial, `${c.flag} +${c.dial}`])}
                    />
                  </div>
                  <Input
                    type="tel"
                    value={whatsappLocal}
                    onChange={(e) => setWhatsappLocal(e.target.value)}
                    placeholder="07 00 00 00 00"
                    className="h-11 flex-1"
                  />
                </div>
              </Field>
            </div>
            <Field label="Secteur d'intervention">
              <Input
                value={form.intervention_area}
                onChange={(e) => setForm({ ...form, intervention_area: e.target.value })}
                placeholder="Ex : Cocody, Marcory"
                className="h-11"
              />
            </Field>
            <div>
              <Label className="mb-1.5 block">Note interne</Label>
              <Textarea
                value={form.internal_note}
                onChange={(e) => setForm({ ...form, internal_note: e.target.value.slice(0, 500) })}
                placeholder="Remarques…"
                rows={3}
                maxLength={500}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border px-3.5 py-3">
              <div>
                <p className="text-sm font-medium">Prestataire actif</p>
                <p className="text-xs text-muted-foreground">
                  Désactivez pour l'archiver sans le supprimer.
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t px-4 py-4 sm:flex-row sm:justify-end sm:gap-2 sm:px-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-11 w-full rounded-xl sm:w-auto"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={save.isPending}
              className="h-11 w-full rounded-xl sm:w-auto"
            >
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Mettre à jour" : "Enregistrer le prestataire"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
