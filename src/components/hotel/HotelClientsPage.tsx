import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CalendarPlus,
  ChevronDown,
  Download,
  Eye,
  FileText,
  History,
  Loader2,
  Mail,
  MapPin,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  User,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { HotelAppShell } from "@/components/hotel/HotelAppShell";
import { ImageField } from "@/components/hotel/HotelImageField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenuSeparator,
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
import { useSignedUrl } from "@/hooks/use-signed-url";
import { useTenant } from "@/providers/TenantProvider";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { formatCurrency, formatDate } from "@/lib/mms/format";
import { createHotelListPdf } from "@/lib/mms/hotel-pdf-engine";
import { downloadFile, downloadPdf } from "@/lib/mms/download-pdf";
import { getHotelReservationStatusLabel } from "@/lib/hotel-reservation-status";

// The generated Supabase types do not include the recently provisioned hotel tables yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type ClientType = "individuel" | "entreprise" | "agence" | "comptoir";
const CLIENT_TYPES: ClientType[] = ["individuel", "entreprise", "agence", "comptoir"];
const clientTypeMeta: Record<ClientType, { label: string; className: string }> = {
  individuel: {
    label: "Individuel",
    className:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-400/10 dark:text-emerald-300",
  },
  entreprise: {
    label: "Entreprise",
    className: "bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-400/10 dark:text-sky-300",
  },
  agence: {
    label: "Agence",
    className:
      "bg-violet-50 text-violet-700 ring-violet-600/15 dark:bg-violet-400/10 dark:text-violet-300",
  },
  comptoir: {
    label: "Client comptoir",
    className: "bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-400/10 dark:text-amber-300",
  },
};
type SortBy = "recent" | "name" | "stays";
const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: "recent", label: "Plus récents" },
  { key: "name", label: "Nom (A→Z)" },
  { key: "stays", label: "Nombre de séjours" },
];
const CLIENTS_PAGE_SIZE = 10;

type Guest = {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  client_type: ClientType | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  identity_type?: string | null;
  identity_number?: string | null;
  identity_document_path?: string | null;
  nationality: string | null;
  created_at: string;
  updated_at: string;
};
type HotelGuestInsertResult = Guest;
type GuestIdentity = Guest & {
  identity_type: string | null;
  identity_number: string | null;
  identity_document_path: string | null;
};
type Stay = {
  id: string;
  guest_id: string;
  room_id: string;
  check_in: string;
  check_out: string;
  status: string;
  nights: number;
  grand_total: number;
  paid_total: number;
  balance_due: number;
};
type Room = { id: string; number: string };

type GuestForm = {
  full_name: string;
  client_type: ClientType;
  company: string;
  phone: string;
  email: string;
  nationality: string;
  address: string;
  identity_type: string;
  identity_number: string;
  identity_document_path: string;
  notes: string;
};
type IdentityDocumentSource = {
  first_name: string;
  last_name: string;
  identity_document_path: string | null;
};
const emptyForm: GuestForm = {
  full_name: "",
  client_type: "individuel",
  company: "",
  phone: "",
  email: "",
  nationality: "",
  address: "",
  identity_type: "",
  identity_number: "",
  identity_document_path: "",
  notes: "",
};

// Backstop for the "hotel_guests" table: if the pre-submit duplicate check
// (RPC check_hotel_guest_duplicate) is bypassed by a race condition, the
// per-tenant unique index (hotel_guests_tenant_email_key /
// hotel_guests_tenant_phone_key) still rejects the write with a 23505.
// Surface that as the same friendly message instead of a raw Postgres error.
function toHotelGuestDuplicateError(error: { code?: string; message?: string }): Error {
  if (error.code !== "23505") return error as Error;
  const message = error.message ?? "";
  if (message.includes("hotel_guests_tenant_email_key")) {
    return new Error("Un client avec cette adresse email existe déjà.");
  }
  if (message.includes("hotel_guests_tenant_phone_key")) {
    return new Error("Un client avec ce numéro de téléphone existe déjà.");
  }
  return new Error("Ce client existe déjà.");
}

function splitFullName(fullName: string): { first_name: string; last_name: string } {
  const [firstName = "", ...rest] = fullName.trim().replace(/\s+/g, " ").split(" ");
  return { first_name: firstName, last_name: rest.join(" ") };
}

function guestName(g: Guest) {
  return `${g.first_name} ${g.last_name}`.trim();
}

const IDENTITY_DOCUMENTS_BUCKET = "hotel-identity-documents";

function slugifyForFilename(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "client";
}

function extensionFromMimeType(mimeType: string): string {
  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}

function initials(g: Guest) {
  const name = guestName(g);
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function HotelClientsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { profile } = useTenant();
  const tenantId = profile?.tenant_id;
  const { settings, logoUrl } = useCompanySettings(tenantId);
  const canCreate = useActionPermission("hotel.guests.create");
  const canUpdate = useActionPermission("hotel.guests.update");
  const canDelete = useActionPermission("hotel.guests.delete");
  const canViewIdentity = useActionPermission("hotel.guests.identity_view");
  const canManageIdentity = useActionPermission("hotel.guests.identity_manage");
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | ClientType>("all");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(CLIENTS_PAGE_SIZE);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Guest | null>(null);
  const [viewing, setViewing] = useState<Guest | null>(null);
  const [deleting, setDeleting] = useState<Guest | null>(null);

  const guestsQuery = useQuery({
    queryKey: ["hotel-clients", tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await db.rpc("hotel_guest_list_for_ui");
      if (error) throw error;
      return (data ?? []) as Guest[];
    },
  });

  const guestIdentityQuery = useQuery({
    queryKey: ["hotel-client-identity", tenantId, viewing?.id],
    enabled: Boolean(tenantId && viewing?.id && canViewIdentity),
    queryFn: async () => {
      const { data, error } = await db.rpc("hotel_guest_identity_for_ui", { p_guest_id: viewing?.id });
      if (error) throw error;
      return (data?.[0] ?? null) as GuestIdentity | null;
    },
  });

  const contextQuery = useQuery({
    queryKey: ["hotel-clients-context", tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const [stays, rooms] = await Promise.all([
        db
          .from("hotel_reservation_balances")
          .select("id,guest_id,room_id,check_in,check_out,status,nights,grand_total,paid_total,balance_due")
          .eq("tenant_id", tenantId)
          .order("check_in", { ascending: false }),
        db.from("hotel_rooms").select("id,number").eq("tenant_id", tenantId),
      ]);
      if (stays.error) throw stays.error;
      if (rooms.error) throw rooms.error;
      return { stays: (stays.data ?? []) as Stay[], rooms: (rooms.data ?? []) as Room[] };
    },
  });

  const staysByGuest = useMemo(() => {
    const map = new Map<string, Stay[]>();
    for (const stay of contextQuery.data?.stays ?? []) {
      const list = map.get(stay.guest_id) ?? [];
      list.push(stay);
      map.set(stay.guest_id, list);
    }
    return map;
  }, [contextQuery.data]);
  const roomsById = useMemo(
    () => new Map((contextQuery.data?.rooms ?? []).map((r) => [r.id, r])),
    [contextQuery.data],
  );

  const clients = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    const filtered = (guestsQuery.data ?? [])
      .filter((g) => type === "all" || (g.client_type ?? "individuel") === type)
      .filter(
        (g) =>
          !normalized ||
          `${guestName(g)} ${g.phone ?? ""} ${g.email ?? ""} ${g.company ?? ""}`
            .toLocaleLowerCase("fr")
            .includes(normalized),
      );
    if (sortBy === "name") {
      return [...filtered].sort((a, b) => guestName(a).localeCompare(guestName(b), "fr"));
    }
    if (sortBy === "stays") {
      return [...filtered].sort(
        (a, b) => (staysByGuest.get(b.id)?.length ?? 0) - (staysByGuest.get(a.id)?.length ?? 0),
      );
    }
    return [...filtered].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || b.id.localeCompare(a.id),
    );
  }, [guestsQuery.data, query, type, sortBy, staysByGuest]);

  useEffect(() => {
    setVisibleCount(CLIENTS_PAGE_SIZE);
  }, [query, type, sortBy]);

  const mobileClients = useMemo(() => clients.slice(0, visibleCount), [clients, visibleCount]);
  const hasMoreMobileClients = visibleCount < clients.length;

  const now = new Date();
  const totalClients = guestsQuery.data?.length ?? 0;
  const individualCount = (guestsQuery.data ?? []).filter(
    (g) => (g.client_type ?? "individuel") === "individuel",
  ).length;
  const businessCount = (guestsQuery.data ?? []).filter((g) =>
    ["entreprise", "agence"].includes(g.client_type ?? ""),
  ).length;
  const newThisMonthCount = (guestsQuery.data ?? []).filter((g) => {
    const created = new Date(g.created_at);
    return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
  }).length;
  const hasActiveFilters = Boolean(query || type !== "all");
  const hasActiveMobileFilters = type !== "all" || sortBy !== "recent";

  const deleteGuest = useMutation({
    mutationFn: async (guest: Guest) => {
      if (!tenantId) throw new Error("Établissement introuvable.");
      const { data, error } = await db.rpc("hotel_guest_delete_for_ui", { p_guest_id: guest.id });
      if (error) throw error;
      if (!data) throw new Error("Aucune ligne n’a été supprimée.");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["hotel-clients", tenantId] });
      setDeleting(null);
      toast.success("Client supprimé");
    },
    onError: (error: { code?: string; message: string }) => {
      toast.error(
        error.code === "23503"
          ? "Ce client a des réservations associées : impossible de le supprimer."
          : error.message,
      );
    },
  });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (guest: Guest) => {
    setEditing(guest);
    setFormOpen(true);
  };
  const startReservation = () => {
    void navigate({ to: "/hotel/reservations" });
  };
  const exportClients = async () => {
    const pdf = await createHotelListPdf({
      title: "Liste des clients",
      filename: `clients-${new Date().toISOString().slice(0, 10)}.pdf`,
      head: ["Client", "Type", "Téléphone", "Email", "Nationalité", "Séjours"],
      body: clients.map((g) => [
        guestName(g),
        clientTypeMeta[g.client_type ?? "individuel"].label,
        g.phone,
        g.email,
        g.nationality,
        String((staysByGuest.get(g.id) ?? []).length),
      ]),
      settings,
      logoUrl,
    });
    await downloadPdf(pdf.doc, pdf.filename);
  };
  const resetFilters = () => {
    setQuery("");
    setType("all");
    setSortBy("recent");
  };

  return (
    <HotelAppShell
      title="Clients"
      subtitle="Fiches clients, historique des séjours et coordonnées."
      actions={
        <>
          <div className="hidden items-center gap-2 sm:flex">
            <Button variant="outline" disabled={!clients.length} onClick={() => void exportClients()} className="rounded-xl">
              <FileText className="size-4" /> Exporter PDF
            </Button>
            {canCreate ? (
              <Button onClick={openCreate} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="size-4" />
                Ajouter un client
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-2 sm:hidden">
            {canCreate ? (
              <Button size="icon" onClick={openCreate} aria-label="Ajouter un client" className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="size-4" />
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-xl" aria-label="Plus d’actions">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                <DropdownMenuItem disabled={!clients.length} onSelect={() => void exportClients()}>
                  <FileText className="size-4" /> Exporter en PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      }
    >
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(
          [
            ["Total clients", totalClients, Users, false],
            ["Individuels", individualCount, User, false],
            ["Entreprises & agences", businessCount, Building2, true],
            ["Nouveaux ce mois", newThisMonthCount, Sparkles, true],
          ] as const
        ).map(([label, value, Icon, hideOnMobile]) => (
          <div
            key={label}
            className={`group items-center gap-3 rounded-2xl border border-primary/25 bg-card px-4 py-3.5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
              hideOnMobile ? "hidden sm:flex" : "flex"
            }`}
          >
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#102A43] text-hotel-petrol-accent transition-transform duration-300 group-hover:scale-105">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold leading-none text-[#102A43] dark:text-white sm:text-xl">{value}</p>
              <p className="mt-1.5 truncate text-[11px] text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="mt-4 rounded-2xl border bg-card p-3 shadow-sm">
        {/* Mobile (<640px): full-width search + filter/sort bottom sheet trigger */}
        <div className="flex items-center gap-2 sm:hidden">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nom, téléphone, email ou entreprise…"
              className="h-11 w-full rounded-xl border bg-background pl-10 pr-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Effacer la recherche"
                className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
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
            aria-label="Filtres et tri"
            className="relative h-11 w-11 shrink-0 rounded-xl"
          >
            <SlidersHorizontal className="size-4" />
            {hasActiveMobileFilters && (
              <span className="absolute right-2 top-2 size-2 rounded-full bg-primary" />
            )}
          </Button>
        </div>

        {/* Desktop / tablet (>=640px): unchanged inline filters */}
        <div className="hidden sm:grid sm:grid-cols-2 sm:gap-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto]">
          <div className="relative min-w-0">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nom, téléphone, email ou entreprise…"
              className="h-11 w-full rounded-xl border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <FilterSelect
            value={type}
            onChange={(value) => setType(value as typeof type)}
            options={[["all", "Tous les types"], ...CLIENT_TYPES.map((t) => [t, clientTypeMeta[t].label])]}
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
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-[24px] sm:hidden">
          <SheetHeader>
            <SheetTitle>Filtrer les clients</SheetTitle>
            <SheetDescription>Affinez la liste par type de client ou par tri.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Type de client
              </p>
              <div className="flex flex-wrap gap-2">
                {(
                  [["all", "Tous les types"], ...CLIENT_TYPES.map((t) => [t, clientTypeMeta[t].label])] as [
                    "all" | ClientType,
                    string,
                  ][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setType(key)}
                    className={`h-11 rounded-xl px-3.5 text-sm font-medium ring-1 transition-colors ${
                      type === key
                        ? "bg-primary text-primary-foreground ring-primary"
                        : "bg-background text-foreground ring-border hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Trier par
              </p>
              <div className="flex flex-col gap-2">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setSortBy(option.key)}
                    className={`flex h-11 items-center justify-between rounded-xl border px-3.5 text-sm font-medium transition-colors ${
                      sortBy === option.key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {option.label}
                    {sortBy === option.key && <span className="size-2 rounded-full bg-primary" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <SheetFooter className="mt-6 flex-row gap-2">
            <Button type="button" variant="ghost" onClick={resetFilters} className="flex-1 rounded-xl">
              Réinitialiser
            </Button>
            <Button
              type="button"
              onClick={() => setFilterSheetOpen(false)}
              className="flex-1 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Voir {clients.length} client{clients.length > 1 ? "s" : ""}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {guestsQuery.isLoading ? (
        <>
          <div className="hidden min-h-72 place-items-center md:grid">
            <Loader2 className="size-7 animate-spin text-primary" />
          </div>
          <div className="mt-4 space-y-3 md:hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-sm">
                <Skeleton className="size-11 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : guestsQuery.isError ? (
        <div className="mt-4 grid min-h-72 place-items-center rounded-[24px] border border-dashed bg-muted/20 p-8 text-center">
          <div>
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <Users className="size-7" />
            </div>
            <h3 className="mt-4 font-semibold">Impossible de charger les clients</h3>
            <p className="mt-1 text-sm text-muted-foreground">Vérifiez votre connexion puis réessayez.</p>
            <Button variant="outline" onClick={() => void guestsQuery.refetch()} className="mt-5 rounded-xl">
              Réessayer
            </Button>
          </div>
        </div>
      ) : clients.length ? (
        <div className="mt-4 overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-[#102A43] text-white">
                <tr>
                  {["Client", "Type", "Contact", "Nationalité", "Séjours", "Actions"].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {clients.map((guest) => (
                  <ClientRow
                    key={guest.id}
                    guest={guest}
                    stays={staysByGuest.get(guest.id) ?? []}
                    canViewIdentity={canViewIdentity}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                    onView={() => setViewing(guest)}
                    onHistory={() => setViewing(guest)}
                    onEdit={() => openEdit(guest)}
                    onReserve={() => startReservation()}
                    onDelete={() => setDeleting(guest)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y md:hidden">
            {mobileClients.map((guest) => (
              <ClientMobileCard
                key={guest.id}
                guest={guest}
                stays={staysByGuest.get(guest.id) ?? []}
                canViewIdentity={canViewIdentity}
                canUpdate={canUpdate}
                canDelete={canDelete}
                onView={() => setViewing(guest)}
                onHistory={() => setViewing(guest)}
                onEdit={() => openEdit(guest)}
                onReserve={() => startReservation()}
                onDelete={() => setDeleting(guest)}
              />
            ))}
            {hasMoreMobileClients && (
              <div className="p-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVisibleCount((count) => count + CLIENTS_PAGE_SIZE)}
                  className="h-11 w-full rounded-xl"
                >
                  Charger plus ({clients.length - mobileClients.length} restants)
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <EmptyState filtered={hasActiveFilters} canCreate={canCreate} onCreate={openCreate} />
      )}

      <ClientFormDialog
        open={formOpen}
        guest={editing}
        tenantId={tenantId}
        canViewIdentity={canViewIdentity}
        canManageIdentity={canManageIdentity}
        onOpenChange={setFormOpen}
        onSaved={() => void qc.invalidateQueries({ queryKey: ["hotel-clients", tenantId] })}
      />
      <ClientDetails
        guest={viewing}
        stays={viewing ? (staysByGuest.get(viewing.id) ?? []) : []}
        roomsById={roomsById}
        canViewIdentity={canViewIdentity}
        onClose={() => setViewing(null)}
        onEdit={
          canUpdate && viewing
            ? () => {
                const guest = viewing;
                setViewing(null);
                openEdit(guest);
              }
            : undefined
        }
        onReserve={
          viewing
            ? () => {
                setViewing(null);
                startReservation();
              }
            : undefined
        }
      />
      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment supprimer{" "}
              <span className="font-medium text-foreground">{deleting ? guestName(deleting) : ""}</span> ? Cette
              action est irréversible et n’est possible que si le client n’a plus de réservation associée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteGuest.mutate(deleting)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteGuest.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
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

function ClientAvatar({ guest, size = "size-10" }: { guest: Guest; size?: string }) {
  return (
    <div
      className={`grid ${size} shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-xs font-semibold text-white shadow-sm shadow-emerald-500/30`}
    >
      {initials(guest)}
    </div>
  );
}

function TypeBadge({ type }: { type: ClientType | null }) {
  const meta = clientTypeMeta[type ?? "individuel"];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${meta.className}`}>
      {meta.label}
    </span>
  );
}

type ManageClientProps = {
  guest: Guest;
  stays: Stay[];
  canViewIdentity: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onView: () => void;
  onHistory: () => void;
  onEdit: () => void;
  onReserve: () => void;
  onDelete: () => void;
};

function ClientActions({
  guest,
  canViewIdentity,
  canUpdate,
  canDelete,
  onView,
  onHistory,
  onEdit,
  onReserve,
  onDelete,
}: Omit<ManageClientProps, "stays">) {
  const { downloadIdentityDocument, downloadingIdentity, canDownloadIdentityDocument } =
    useIdentityDocumentDownload(guest, canViewIdentity);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="size-11 text-[#102A43] hover:bg-primary/10 hover:text-primary dark:text-hotel-petrol-accent md:size-8" aria-label="Plus d’actions">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuItem onSelect={onView}>
          <Eye className="size-4" /> Voir la fiche
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onHistory}>
          <History className="size-4" /> Historique du client
        </DropdownMenuItem>
        {canDownloadIdentityDocument && (
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              void downloadIdentityDocument();
            }}
            disabled={downloadingIdentity}
          >
            {downloadingIdentity ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Télécharger la pièce d’identité
          </DropdownMenuItem>
        )}
        {canUpdate && (
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil className="size-4" /> Modifier
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={onReserve}>
          <CalendarPlus className="size-4" /> Nouvelle réservation
        </DropdownMenuItem>
        {guest.phone && (
          <DropdownMenuItem asChild>
            <a href={`tel:${guest.phone}`}>
              <Phone className="size-4" /> Appeler
            </a>
          </DropdownMenuItem>
        )}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDelete}>
              <Trash2 className="size-4" /> Supprimer
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ClientRow(props: ManageClientProps) {
  const { guest, stays } = props;
  return (
    <tr className="hover:bg-muted/30">
      <td className="px-3 py-2">
        <div className="flex items-center gap-2.5">
          <ClientAvatar guest={guest} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-[#102A43] dark:text-white">{guestName(guest)}</p>
            {guest.company && <p className="truncate text-xs text-muted-foreground">{guest.company}</p>}
          </div>
        </div>
      </td>
      <td className="px-3 py-2">
        <TypeBadge type={guest.client_type} />
      </td>
      <td className="px-3 py-2 text-muted-foreground">
        <p>{guest.phone ?? "?"}</p>
        {guest.email && <p className="text-xs">{guest.email}</p>}
      </td>
      <td className="px-3 py-2 text-muted-foreground">{guest.nationality?.trim() ? guest.nationality : "—"}</td>
      <td className="px-3 py-2 font-medium">{stays.length}</td>
      <td className="px-3 py-2">
        <ClientActions {...props} />
      </td>
    </tr>
  );
}

function ClientMobileCard(props: ManageClientProps) {
  const { guest, stays, onView } = props;
  const lastStayDate = stays.length
    ? stays.reduce((latest, s) => (s.check_in > latest ? s.check_in : latest), stays[0].check_in)
    : null;
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onView}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onView();
        }
      }}
      className="flex cursor-pointer items-center gap-3 p-3.5 text-left transition-colors active:bg-muted/20"
    >
      <ClientAvatar guest={guest} size="size-11" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-sm font-semibold text-[#102A43] dark:text-white">{guestName(guest)}</h3>
          <TypeBadge type={guest.client_type} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
            <span className="truncate">{guest.phone ?? "Sans téléphone"}</span>
          <span>•</span>
          <span className="shrink-0">
            {stays.length} séjour{stays.length > 1 ? "s" : ""}
          </span>
        </div>
        {lastStayDate && (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            Dernier séjour : {formatDate(lastStayDate)}
          </p>
        )}
      </div>
      <div onClick={(event) => event.stopPropagation()} className="shrink-0">
        <ClientActions {...props} />
      </div>
    </article>
  );
}

function EmptyState({ filtered, canCreate, onCreate }: { filtered: boolean; canCreate: boolean; onCreate: () => void }) {
  return (
    <div className="mt-6 grid min-h-72 place-items-center rounded-[24px] border border-dashed bg-muted/20 p-8 text-center">
      <div>
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Users className="size-7" />
        </div>
        <h3 className="mt-4 font-semibold">{filtered ? "Aucun client trouvé" : "Aucun client enregistré"}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {filtered ? "Essayez de modifier vos critères." : "Ajoutez votre premier client pour commencer."}
        </p>
        {canCreate && !filtered && (
          <Button onClick={onCreate} className="mt-5 rounded-xl">
            <Plus className="size-4" />
            Ajouter un client
          </Button>
        )}
      </div>
    </div>
  );
}

function ClientFormDialog({
  open,
  guest,
  tenantId,
  canViewIdentity,
  canManageIdentity,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  guest: Guest | null;
  tenantId?: string;
  canViewIdentity: boolean;
  canManageIdentity: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<GuestForm>(emptyForm);
  const [identityLoadedForGuestId, setIdentityLoadedForGuestId] = useState<string | null>(null);
  const isEdit = Boolean(guest);
  const formIdentitySource: IdentityDocumentSource = {
    ...splitFullName(form.full_name),
    identity_document_path: form.identity_document_path || null,
  };
  const { downloadIdentityDocument, downloadingIdentity, canDownloadIdentityDocument } =
    useIdentityDocumentDownload(formIdentitySource, canViewIdentity);
  const formFromGuest = (currentGuest: Guest): GuestForm => ({
    full_name: guestName(currentGuest),
    client_type: currentGuest.client_type ?? "individuel",
    company: currentGuest.company ?? "",
    phone: currentGuest.phone ?? "",
    email: currentGuest.email ?? "",
    nationality: currentGuest.nationality ?? "",
    address: currentGuest.address ?? "",
    identity_type: currentGuest.identity_type ?? "",
    identity_number: currentGuest.identity_number ?? "",
    identity_document_path: currentGuest.identity_document_path ?? "",
    notes: currentGuest.notes ?? "",
  });

  useEffect(() => {
    if (!open) return;
    if (!guest) {
      setForm(emptyForm);
      setIdentityLoadedForGuestId(null);
      return;
    }
    setForm(formFromGuest(guest));
    setIdentityLoadedForGuestId(null);
  }, [open, guest?.id]);

  useEffect(() => {
    if (!open || !guest || !canViewIdentity) return;
    let cancelled = false;
    const loadIdentity = async () => {
      const { data, error } = await db.rpc("hotel_guest_identity_for_ui", { p_guest_id: guest.id });
      if (cancelled) return;
      if (error) {
        toast.error("Impossible de charger les informations d’identité du client.");
        return;
      }
      const identityGuest = (data?.[0] ?? null) as GuestIdentity | null;
      if (!identityGuest) return;
      setForm((current) => ({
        ...current,
        identity_type: identityGuest.identity_type ?? "",
        identity_number: identityGuest.identity_number ?? "",
        identity_document_path: identityGuest.identity_document_path ?? "",
      }));
      setIdentityLoadedForGuestId(guest.id);
    };
    void loadIdentity();
    return () => {
      cancelled = true;
    };
  }, [open, guest?.id, canViewIdentity]);

  const save = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!tenantId) throw new Error("Aucun établissement actif.");
      const { first_name, last_name } = splitFullName(form.full_name);
      if (!first_name || !last_name) {
        throw new Error("Merci d’indiquer le prénom et le nom (ex : Awa Diallo).");
      }
      const phone = form.phone.trim();
      if (!phone) throw new Error("Le téléphone est obligatoire.");
      const email = form.email.trim();
      if (phone || email) {
        const { data: dup, error: dupError } = await db.rpc("check_hotel_guest_duplicate", {
          p_tenant_id: tenantId,
          p_email: email,
          p_phone: phone,
          p_exclude_id: guest ? guest.id : undefined,
        });
        if (dupError) throw dupError;
        const result = dup?.[0];
        if (result?.duplicate_phone) throw new Error("Un client avec ce numéro de téléphone existe déjà.");
        if (result?.duplicate_email) throw new Error("Un client avec cette adresse email existe déjà.");
      }
      const commonPayload = {
        first_name,
        last_name,
        client_type: form.client_type,
        company: form.company.trim() || null,
        phone,
        email: email || null,
        nationality: form.nationality.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      };
      const identityPayload =
        canManageIdentity && (identityLoadedForGuestId === guest?.id || !guest)
          ? {
              identity_type: form.identity_type.trim() || null,
              identity_number: form.identity_number.trim() || null,
              identity_document_path: form.identity_document_path || null,
            }
          : {};
      const payload = { ...commonPayload, ...identityPayload };
      if (guest) {
        const { data, error } = await db.rpc("hotel_guest_update_for_ui", {
          p_guest_id: guest.id,
          p_first_name: payload.first_name,
          p_last_name: payload.last_name,
          p_client_type: payload.client_type,
          p_company: payload.company,
          p_phone: payload.phone,
          p_email: payload.email,
          p_nationality: payload.nationality,
          p_address: payload.address,
          p_notes: payload.notes,
          ...(canManageIdentity
            ? {
                p_identity_type: payload.identity_type,
                p_identity_number: payload.identity_number,
                p_identity_document_path: payload.identity_document_path,
              }
            : {}),
        });
        if (error) throw toHotelGuestDuplicateError(error);
        if (!data) throw new Error("Aucune ligne n’a été modifiée.");
        return;
      }
      const { error } = await db.from("hotel_guests").insert(payload);
      if (error) throw toHotelGuestDuplicateError(error);
      return;
    },
    onSuccess: () => {
      toast.success(isEdit ? "Client mis à jour" : "Client ajouté");
      onSaved();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      if (import.meta.env.DEV) {
        console.error("[hotel.clients] save failed", error);
      }
      toast.error(`Impossible d'enregistrer le client : ${error.message}`);
    },
  });
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="flex w-[calc(100vw-24px)] max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-[20px] p-0 sm:w-full sm:max-w-[520px]">
        <DialogHeader className="shrink-0 border-b px-4 py-4 sm:px-6">
          <DialogTitle>{isEdit ? "Modifier le client" : "Nouveau client"}</DialogTitle>
          <DialogDescription>Renseignez les informations essentielles du client.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!save.isPending) save.mutate();
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
            <Field label="Nom complet" required>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Ex : Awa Diallo"
                className="h-11"
                autoFocus
              />
            </Field>
            <Field label="Téléphone" required>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+225 07 00 00 00 00"
                className="h-11"
              />
            </Field>
            {canManageIdentity ? (
              <>
                <Field label="Type de pièce d’identité">
                  <Input
                    value={form.identity_type}
                    onChange={(e) => setForm({ ...form, identity_type: e.target.value })}
                    placeholder="CNI, passeport, permis..."
                    className="h-11"
                  />
                </Field>
                <Field label="Numéro de pièce d’identité">
                  <Input
                    value={form.identity_number}
                    onChange={(e) => setForm({ ...form, identity_number: e.target.value })}
                    placeholder="Numéro du document"
                    className="h-11"
                  />
                </Field>
                <div>
                  <Label className="mb-1.5 block">Pièce d’identité</Label>
                  <ImageField
                    value={form.identity_document_path}
                    onChange={(v) => setForm({ ...form, identity_document_path: v })}
                  />
                  {canViewIdentity && canDownloadIdentityDocument ? (
                    <div className="mt-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void downloadIdentityDocument()}
                        disabled={downloadingIdentity}
                        className="gap-2 rounded-xl"
                      >
                        {downloadingIdentity ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Download className="size-4" />
                        )}
                        Télécharger la pièce d’identité
                      </Button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : canViewIdentity && (guest || identityLoadedForGuestId) ? (
              <div className="rounded-2xl border bg-muted/30 p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Pièce d’identité consultable</p>
                <p className="mt-1">
                  {form.identity_type || form.identity_number
                    ? `${form.identity_type || "Type non renseigné"}${form.identity_number ? ` · ${form.identity_number}` : ""}`
                    : "Aucune donnée sensible disponible."}
                </p>
              </div>
            ) : null}
            <div>
              <Label className="mb-1.5 block">Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value.slice(0, 500) })}
                placeholder="Préférences, remarques…"
                rows={3}
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t px-4 py-4 sm:flex-row sm:justify-end sm:gap-2 sm:px-6">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-11 w-full rounded-xl sm:w-auto">
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={save.isPending}
              className="h-11 w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
            >
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Mettre à jour" : "Enregistrer le client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
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

function ClientDetails({
  guest,
  stays,
  roomsById,
  canViewIdentity,
  onClose,
  onEdit,
  onReserve,
}: {
  guest: Guest | null;
  stays: Stay[];
  roomsById: Map<string, Room>;
  canViewIdentity: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onReserve?: () => void;
}) {
  const { downloadIdentityDocument, downloadingIdentity, canDownloadIdentityDocument } =
    useIdentityDocumentDownload(guest, canViewIdentity);

  if (!guest) return null;
  const totalSpent = stays.reduce((sum, s) => sum + Number(s.paid_total ?? 0), 0);
  const sortedStays = [...stays].sort((a, b) => b.check_in.localeCompare(a.check_in));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[24px] p-0 sm:max-w-3xl">
        <div className="relative bg-gradient-to-br from-[#102A43] to-[#1B4B3A] px-6 py-7 text-white">
          <div className="flex items-center gap-4">
            <div className="grid size-16 shrink-0 place-items-center rounded-full bg-white/15 text-xl font-semibold backdrop-blur">
              {initials(guest)}
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[.2em] text-white/70">Fiche client</p>
              <h2 className="mt-1 truncate text-2xl font-semibold">{guestName(guest)}</h2>
              {guest.company && <p className="mt-0.5 text-sm text-white/80">{guest.company}</p>}
            </div>
            <div className="ml-auto">
              <TypeBadge type={guest.client_type} />
            </div>
          </div>
        </div>
        <div className="grid gap-5 p-6 sm:grid-cols-3">
          <Detail icon={Phone} label="Téléphone" value={guest.phone ?? "—"} />
          <Detail icon={Mail} label="Email" value={guest.email ?? "—"} />
          <Detail icon={MapPin} label="Adresse" value={guest.address ?? "—"} />
          <Detail icon={UserCheck} label="Nationalité" value={guest.nationality ?? "—"} />
          {canViewIdentity && (guest.identity_type || guest.identity_number) ? (
            <Detail
              label="Pièce d’identité"
              value={guest.identity_type ? `${guest.identity_type}${guest.identity_number ? ` · ${guest.identity_number}` : ""}` : "—"}
            />
          ) : null}
          <Detail label="Client depuis" value={formatDate(guest.created_at)} />
        </div>
        {canViewIdentity && guest.identity_document_path && (
          <div className="px-6 pb-2">
            <DetailSection
              title="Pièce d’identité"
              actions={
                canDownloadIdentityDocument ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void downloadIdentityDocument()}
                    disabled={downloadingIdentity}
                    className="gap-2 rounded-xl"
                  >
                    {downloadingIdentity ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Download className="size-4" />
                    )}
                    Télécharger la pièce d’identité
                  </Button>
                ) : null
              }
            >
              <div className="space-y-3">
                {guest.identity_document_path?.startsWith("data:image/") ? (
                  <img
                    src={guest.identity_document_path}
                    alt="Pièce d’identité"
                    className="max-h-56 rounded-xl border object-contain"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{guest.identity_document_path}</p>
                )}
              </div>
            </DetailSection>
          </div>
        )}
        <div className="space-y-5 border-t px-6 py-5">
          {guest.notes && (
            <DetailSection title="Notes">
              <p className="text-sm text-muted-foreground">{guest.notes}</p>
            </DetailSection>
          )}
          <DetailSection title={`Historique des séjours (${stays.length})`}>
            {sortedStays.length ? (
              <div className="divide-y rounded-lg border">
                {sortedStays.map((stay) => (
                  <div key={stay.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs">
                    <div className="min-w-0">
                      <p className="font-medium">
                        Chambre {roomsById.get(stay.room_id)?.number ?? "—"} · {getHotelReservationStatusLabel(stay.status)}
                      </p>
                      <p className="text-muted-foreground">
                        {formatDate(stay.check_in)} → {formatDate(stay.check_out)} · {stay.nights} nuit(s)
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold">{formatCurrency(Number(stay.grand_total))}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun séjour enregistré pour ce client.</p>
            )}
            {stays.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">Total réglé sur l’historique : {formatCurrency(totalSpent)}</p>
            )}
          </DetailSection>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t p-5">
          <Button variant="ghost" onClick={onClose}>
            Fermer
          </Button>
          {onReserve && (
            <Button variant="outline" onClick={onReserve} className="rounded-xl">
              <CalendarPlus className="size-4" />
              Nouvelle réservation
            </Button>
          )}
          {onEdit && (
            <Button onClick={onEdit} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
              <Pencil className="size-4" />
              Modifier
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailSection({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#102A43] dark:text-white">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  );
}

function Detail({ icon: Icon, label, value }: { icon?: typeof Phone; label: string; value: string }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </p>
      <p className="mt-1 truncate font-semibold">{value}</p>
    </div>
  );
}

function useIdentityDocumentDownload(
  source: Pick<IdentityDocumentSource, "first_name" | "last_name" | "identity_document_path"> | Guest | null,
  canViewIdentity = true,
) {
  const identityDocumentPath = source?.identity_document_path ?? null;
  const isIdentityDataUri = identityDocumentPath?.startsWith("data:") ?? false;
  const identityStoragePath =
    source && canViewIdentity && !isIdentityDataUri ? identityDocumentPath : null;
  const identitySignedUrl = useSignedUrl(identityStoragePath, IDENTITY_DOCUMENTS_BUCKET);
  const [downloadingIdentity, setDownloadingIdentity] = useState(false);

  const canDownloadIdentityDocument = Boolean(
    source && canViewIdentity && identityDocumentPath && (isIdentityDataUri || identitySignedUrl),
  );

  const downloadIdentityDocument = async () => {
    if (!identityDocumentPath || !canViewIdentity) return;
    const sourceUrl = isIdentityDataUri ? identityDocumentPath : identitySignedUrl;
    if (!sourceUrl) return;
    setDownloadingIdentity(true);
    try {
      const response = await fetch(sourceUrl);
      if (!response.ok) throw new Error("download_failed");
      const blob = await response.blob();
      const pathExtension = identityStoragePath?.split(".").pop()?.toLowerCase();
      const extension = pathExtension && /^[a-z0-9]{2,4}$/.test(pathExtension)
        ? pathExtension
        : extensionFromMimeType(blob.type);
      const firstName = source && "first_name" in source ? source.first_name : "";
      const lastName = source && "last_name" in source ? source.last_name : "";
      const filename = `piece-identite-${slugifyForFilename(`${firstName} ${lastName}`.trim() || "client")}.${extension}`;
      downloadFile(new File([blob], filename, { type: blob.type || "application/octet-stream" }));
    } catch {
      toast.error("Impossible de télécharger la pièce d’identité.");
    } finally {
      setDownloadingIdentity(false);
    }
  };

  return { downloadIdentityDocument, downloadingIdentity, canDownloadIdentityDocument };
}


