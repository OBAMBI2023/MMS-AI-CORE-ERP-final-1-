import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  ChevronsUpDown,
  FileDown,
  List,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  MessageSquareText,
  X,
} from "lucide-react";
import { AppShell } from "@/components/mms/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";
import { formatCurrency, formatDate } from "@/lib/mms/format";
import { hotelStayTotals } from "@/lib/hotel-calculations";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ImageField } from "@/components/mms/ResourceTable";
import { cn } from "@/lib/utils";
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
import { useActionPermission } from "@/hooks/use-action-permission";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { createHotelInvoicePdf } from "@/lib/mms/hotel-invoice-pdf";
import { downloadPdf } from "@/lib/mms/download-pdf";
import { HotelSmsDialog } from "@/components/hotel/HotelSmsDialog";
import { useTenantModules } from "@/hooks/use-tenant-modules";

const db = supabase as any;
const statuses = [
  "pending",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
  "no_show",
] as const;
const statusLabel: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  checked_in: "En séjour",
  checked_out: "Terminée",
  cancelled: "Annulée",
  no_show: "Non présenté",
};
const WALK_IN_LABEL = "Client de passage";
const emptyForm = {
  guest_id: "",
  room_id: "",
  check_in: "",
  check_out: "",
  nightly_rate: "",
  discount: "0",
  advance: "0",
  status: "confirmed",
  notes: "",
};

export function HotelReservationsPage() {
  const qc = useQueryClient();
  const { profile } = useTenant();
  const { settings, logoUrl } = useCompanySettings(profile?.tenant_id);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<any | null>(null);
  const [smsReservation, setSmsReservation] = useState<any | null>(null);
  const canUpdate = useActionPermission("hotel.reservations.update");
  const canDelete = useActionPermission("hotel.reservations.delete");
  const canSendSms = useActionPermission("hotel.sms.send");
  const modulesQuery = useTenantModules();
  const smsModuleEnabled = modulesQuery.data?.has("hotel_sms") === true;

  const { data } = useQuery({
    queryKey: ["hotel-reservations", profile?.tenant_id],
    enabled: Boolean(profile?.tenant_id),
    queryFn: async () => {
      const tenantId = profile!.tenant_id;
      const [r, g, rooms, companions] = await Promise.all([
        db
          .from("hotel_reservation_balances")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("check_in", { ascending: false }),
        db
          .from("hotel_guests")
          .select("id,first_name,last_name,phone,email,identity_document_path,identity_number,identity_type")
          .eq("tenant_id", tenantId),
        db.from("hotel_rooms").select("id,number,rate,status").eq("tenant_id", tenantId),
        db
          .from("hotel_guest_companions")
          .select("reservation_id,full_name")
          .eq("tenant_id", tenantId),
      ]);
      for (const result of [r, g, rooms, companions]) if (result.error) throw result.error;
      return { reservations: r.data ?? [], guests: g.data ?? [], rooms: rooms.data ?? [], companions: companions.data ?? [] };
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["hotel-reservations", profile?.tenant_id] });
    qc.invalidateQueries({ queryKey: ["hotel-overview"] });
  };
  const save = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id) throw new Error("Tenant introuvable");
      if (!form.guest_id)
        throw new Error("Sélectionnez un client existant ou créez un nouveau client.");
      const advance = Number(form.advance || 0);
      const totals = hotelStayTotals(
        form.check_in,
        form.check_out,
        Number(form.nightly_rate),
        Number(form.discount),
      );
      if (!Number.isFinite(advance) || advance < 0)
        throw new Error("L’avance ne peut pas être négative.");
      if (advance > totals.grandTotal)
        throw new Error("L’avance ne peut pas dépasser le montant total.");
      const previousAdvance = editingId
        ? Number(data?.reservations.find((r: any) => r.id === editingId)?.paid_total ?? 0)
        : 0;
      if (advance < previousAdvance)
        throw new Error(
          "L’avance ne peut pas être réduite afin de conserver l’historique des paiements.",
        );
      const { advance: _advance, ...reservationForm } = form;
      const payload = {
        ...reservationForm,
        tenant_id: profile.tenant_id,
        nightly_rate: Number(form.nightly_rate),
        discount: Number(form.discount),
        notes: form.notes || null,
      };
      const result = editingId
        ? await db
            .from("hotel_reservations")
            .update(payload)
            .eq("tenant_id", profile.tenant_id)
            .eq("id", editingId)
            .select("id")
            .single()
        : await db.from("hotel_reservations").insert(payload).select("id").single();
      if (result.error) throw result.error;
      const paymentToAdd = advance - previousAdvance;
      if (paymentToAdd > 0) {
        const payment = await db
          .from("hotel_reservation_payments")
          .insert({
            tenant_id: profile.tenant_id,
            reservation_id: result.data.id,
            amount: paymentToAdd,
            method: "Avance",
            notes: editingId
              ? "Complément d’avance depuis la réservation"
              : "Avance à la réservation",
          });
        if (payment.error) throw payment.error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Réservation mise à jour" : "Réservation créée");
      setEditingId(null);
      setForm(emptyForm);
      refresh();
    },
    onError: (e: Error) =>
      toast.error(
        e.message.includes("hotel_reservations_no_overlap")
          ? "Ce logement est déjà réservé sur cette période."
          : e.message,
      ),
  });

  const changeStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      if (!profile?.tenant_id) throw new Error("Tenant introuvable");
      const { error } = await db
        .from("hotel_reservations")
        .update({ status })
        .eq("tenant_id", profile.tenant_id)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Statut mis à jour");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteReservation = useMutation({
    mutationFn: async (id: string) => {
      if (!profile?.tenant_id) throw new Error("Tenant introuvable");
      const { error } = await db
        .from("hotel_reservations")
        .delete()
        .eq("tenant_id", profile.tenant_id)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Réservation supprimée");
      setDeleting(null);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const guests = new Map((data?.guests ?? []).map((g: any) => [g.id, g]));
  const rooms = new Map((data?.rooms ?? []).map((r: any) => [r.id, r]));
  const filtered = useMemo(
    () =>
      (data?.reservations ?? []).filter((r: any) => {
        const guest: any = guests.get(r.guest_id);
        const room: any = rooms.get(r.room_id);
        const haystack =
          `${guest ? `${guest.first_name} ${guest.last_name} ${guest.phone ?? ""}` : WALK_IN_LABEL} ${room?.number ?? ""}`.toLowerCase();
        return (filter === "all" || r.status === filter) && haystack.includes(query.toLowerCase());
      }),
    [data, query, filter],
  );
  const { nights, grandTotal: total } = hotelStayTotals(
    form.check_in,
    form.check_out,
    Number(form.nightly_rate || 0),
    Number(form.discount || 0),
  );
  const advance = Number(form.advance || 0);
  const remainingBalance = total - advance;
  const invalidAdvance = !Number.isFinite(advance) || advance < 0 || advance > total;
  const edit = (r: any) => {
    setEditingId(r.id);
    setForm({
      guest_id: r.guest_id ?? "",
      room_id: r.room_id,
      check_in: r.check_in,
      check_out: r.check_out,
      nightly_rate: String(r.nightly_rate),
      discount: String(r.discount ?? 0),
      advance: String(r.paid_total ?? 0),
      status: r.status,
      notes: r.notes ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const downloadReservationPdf = async (reservation: any) => {
    try {
      const guest: any = guests.get(reservation.guest_id);
      const room: any = rooms.get(reservation.room_id);
      const pdf = await createHotelInvoicePdf(
        {
          id: reservation.id,
          check_in: reservation.check_in,
          check_out: reservation.check_out,
          nights: Number(reservation.nights ?? 0),
          nightly_rate: Number(reservation.nightly_rate ?? 0),
          discount: Number(reservation.discount ?? 0),
          grand_total: Number(reservation.grand_total ?? 0),
          paid_total: Number(reservation.paid_total ?? 0),
          balance_due: Number(reservation.balance_due ?? 0),
          status: reservation.status,
          guestName: guest ? `${guest.first_name} ${guest.last_name}` : WALK_IN_LABEL,
          guestPhone: guest?.phone,
          companions: (data?.companions ?? [])
            .filter((companion: any) => companion.reservation_id === reservation.id)
            .map((companion: any) => companion.full_name),
          identityProvided: Boolean(
            guest?.identity_document_path || guest?.identity_number || guest?.identity_type,
          ),
          roomNumber: room?.number ?? "—",
          notes: reservation.notes,
        },
        settings,
        logoUrl,
      );
      await downloadPdf(pdf.doc, pdf.filename);
      toast.success("Fiche de réservation téléchargée.");
    } catch (error) {
      console.error("Échec de la génération de la fiche de réservation PDF", error);
      toast.error("Impossible de générer la fiche PDF de cette réservation.");
    }
  };
  return (
    <AppShell title="Réservations" subtitle="Liste, planning, arrivées et départs">
      <section className="hotel-panel mb-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">
              {editingId ? "Modifier la réservation" : "Nouvelle réservation"}
            </h2>
            <p className="text-xs text-slate-400">Renseignez le séjour et le tarif appliqué.</p>
          </div>
          {editingId && (
            <Button
              variant="ghost"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Annuler
            </Button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label className="mb-1.5 block">Client *</Label>
            <GuestPicker
              guests={data?.guests ?? []}
              value={form.guest_id}
              tenantId={profile?.tenant_id}
              onChange={(guestId) => setForm({ ...form, guest_id: guestId })}
              onCreated={refresh}
            />
          </div>
          <Field label="Chambre">
            <Select
              value={form.room_id}
              onValueChange={(v) => {
                const room = data?.rooms.find((r: any) => r.id === v);
                setForm({ ...form, room_id: v, nightly_rate: String(room?.rate ?? "") });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {data?.rooms.map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>
                    N° {r.number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Arrivée">
            <Input
              type="date"
              value={form.check_in}
              onChange={(e) => setForm({ ...form, check_in: e.target.value })}
            />
          </Field>
          <Field label="Départ">
            <Input
              type="date"
              value={form.check_out}
              onChange={(e) => setForm({ ...form, check_out: e.target.value })}
            />
          </Field>
          <Field label="Tarif / nuit">
            <Input
              type="number"
              min="0"
              value={form.nightly_rate}
              onChange={(e) => setForm({ ...form, nightly_rate: e.target.value })}
            />
          </Field>
          <Field label="Remise">
            <Input
              type="number"
              min="0"
              value={form.discount}
              onChange={(e) => setForm({ ...form, discount: e.target.value })}
            />
          </Field>
          <Field label="Avance versée">
            <Input
              type="number"
              min="0"
              max={total}
              value={form.advance}
              onChange={(e) => setForm({ ...form, advance: e.target.value })}
            />
          </Field>
          <div className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Total</span>
            <b className="block">{formatCurrency(total)}</b>
          </div>
          <div className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Solde restant</span>
            <b className="block">{formatCurrency(Math.max(0, remainingBalance))}</b>
          </div>
          <Field label="Statut">
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabel[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-end">
            <Button
              className="w-full"
              disabled={save.isPending || !form.room_id || nights < 1 || invalidAdvance}
              onClick={() => save.mutate()}
            >
              {save.isPending
                ? "Enregistrement…"
                : `${editingId ? "Enregistrer" : "Créer"} · ${formatCurrency(total)}`}
            </Button>
          </div>
        </div>
      </section>
      <section className="hotel-panel">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <Input
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Voyageur, téléphone ou chambre…"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border p-1">
            <Button
              size="sm"
              variant={view === "list" ? "default" : "ghost"}
              onClick={() => setView("list")}
            >
              <List className="mr-1 size-4" />
              Liste
            </Button>
            <Button
              size="sm"
              variant={view === "calendar" ? "default" : "ghost"}
              onClick={() => setView("calendar")}
            >
              <CalendarDays className="mr-1 size-4" />
              Planning
            </Button>
          </div>
        </div>
        {view === "calendar" ? (
          <Planning rows={filtered} guests={guests} rooms={rooms} />
        ) : (
          <ReservationTable
            rows={filtered}
            guests={guests}
            rooms={rooms}
            edit={edit}
            requestDelete={setDeleting}
            canUpdate={canUpdate}
            canDelete={canDelete}
            downloadPdf={downloadReservationPdf}
            sendSms={setSmsReservation}
            canSendSms={canSendSms && smsModuleEnabled}
            changeStatus={(id: string, status: string) => changeStatus.mutate({ id, status })}
          />
        )}
      </section>
      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette réservation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La réservation et ses données associées seront supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteReservation.isPending}
              onClick={() => deleting && deleteReservation.mutate(deleting.id)}
            >
              <Trash2 className="size-4" />
              {deleteReservation.isPending ? "Suppression…" : "Supprimer définitivement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {smsReservation && <HotelSmsDialog open={Boolean(smsReservation)} onOpenChange={(open: boolean) => !open && setSmsReservation(null)} reservation={smsReservation} guest={guests.get(smsReservation.guest_id)} room={rooms.get(smsReservation.room_id)} tenantId={profile?.tenant_id} />}
    </AppShell>
  );
}

type Guest = { id: string; first_name: string; last_name: string; phone: string | null };

function GuestPicker({
  guests,
  value,
  tenantId,
  onChange,
  onCreated,
}: {
  guests: Guest[];
  value: string;
  tenantId?: string;
  onChange: (id: string) => void;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [photo, setPhoto] = useState("");
  const selected = guests.find((guest) => guest.id === value);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredGuests = guests.filter((guest) =>
    `${guest.first_name} ${guest.last_name} ${guest.phone ?? ""}`
      .toLowerCase()
      .includes(normalizedSearch),
  );
  const normalizePhone = (input: string) => input.replace(/[^\d+]/g, "");
  const createGuest = useMutation({
    mutationFn: async () => {
      const name = fullName.trim().replace(/\s+/g, " ");
      const normalizedPhone = normalizePhone(phone);
      if (!name || !normalizedPhone)
        throw new Error("Le nom complet et le téléphone sont obligatoires.");
      if (!tenantId) throw new Error("Tenant introuvable");
      const duplicate = guests.find(
        (guest) => normalizePhone(guest.phone ?? "") === normalizedPhone,
      );
      if (duplicate) return duplicate.id;
      const [firstName, ...lastParts] = name.split(" ");
      const { data, error } = await db
        .from("hotel_guests")
        .insert({
          tenant_id: tenantId,
          first_name: firstName,
          last_name: lastParts.join(" ") || firstName,
          phone: phone.trim(),
          identity_document_path: photo || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id: string) => {
      onChange(id);
      onCreated();
      setCreating(false);
      setOpen(false);
      setFullName("");
      setPhone("");
      setPhoto("");
      toast.success("Client créé et associé à la réservation");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className={cn("truncate", !selected && "text-muted-foreground")}>
              {selected
                ? `${selected.first_name} ${selected.last_name} · ${selected.phone ?? "—"}`
                : "Rechercher ou ajouter un client"}
            </span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder="Nom complet ou téléphone…"
            />
            <CommandList>
              {!filteredGuests.length && <CommandEmpty>Aucun client trouvé.</CommandEmpty>}
              <CommandGroup>
                {filteredGuests.map((guest) => (
                  <CommandItem
                    key={guest.id}
                    value={guest.id}
                    onSelect={() => {
                      onChange(guest.id);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        value === guest.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span>
                      {guest.first_name} {guest.last_name}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">{guest.phone}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup>
                <CommandItem
                  value="ajouter-nouveau-client"
                  onSelect={() => {
                    setFullName(search);
                    setCreating(true);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Plus className="mr-2 size-4" />
                  Ajouter un nouveau client
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {creating && (
        <div className="col-span-full rounded-xl border bg-muted/20 p-4">
          <div className="mb-3 flex items-center justify-between">
            <b className="text-sm">Nouveau client</b>
            <Button type="button" size="icon" variant="ghost" onClick={() => setCreating(false)}>
              <X className="size-4" />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nom complet *">
              <Input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Ex. Awa Diallo"
              />
            </Field>
            <Field label="Téléphone *">
              <Input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Ex. +225 07 00 00 00 00"
              />
            </Field>
            <div className="sm:col-span-2">
              <Label className="mb-1.5 block">Photo de la pièce d’identité (optionnelle)</Label>
              <ImageField value={photo} onChange={setPhoto} />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button
                type="button"
                disabled={createGuest.isPending || !fullName.trim() || !phone.trim()}
                onClick={() => createGuest.mutate()}
              >
                {createGuest.isPending ? "Création…" : "Créer et sélectionner"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
function ReservationTable({
  rows,
  guests,
  rooms,
  edit,
  requestDelete,
  canUpdate,
  canDelete,
  downloadPdf,
  sendSms,
  canSendSms,
  changeStatus,
}: any) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] table-fixed text-sm">
        <colgroup>
          <col className="w-[18%]" />
          <col className="w-[10%]" />
          <col className="w-[21%]" />
          <col className="w-[12%]" />
          <col className="w-[13%]" />
          <col className="w-[13%]" />
          <col className="w-[13%]" />
        </colgroup>
        <thead>
          <tr className="border-b text-left text-xs uppercase text-slate-400">
            <th className="p-3">Client</th>
            <th>Chambre</th>
            <th>Séjour</th>
            <th>Statut</th>
            <th>Avance</th>
            <th>Solde</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any) => {
            const g = guests.get(r.guest_id),
              room = rooms.get(r.room_id);
            return (
              <tr key={r.id} className="border-b">
                <td className="truncate p-3 font-medium">
                  {g ? `${g.first_name} ${g.last_name}` : WALK_IN_LABEL}
                </td>
                <td>N° {room?.number ?? "—"}</td>
                <td>
                  {formatDate(r.check_in)} → {formatDate(r.check_out)}
                </td>
                <td>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-white/10">
                    {statusLabel[r.status] ?? r.status}
                  </span>
                </td>
                <td className="font-medium">{formatCurrency(Number(r.paid_total ?? 0))}</td>
                <td className="font-medium">{formatCurrency(Number(r.balance_due ?? 0))}</td>
                <td className="text-right">
                  <div className="flex justify-end gap-1">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            aria-label="Plus d’actions"
                          >
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-56">
                          {canUpdate && (
                            <DropdownMenuItem onSelect={() => edit(r)}>
                              <Pencil /> Modifier la réservation
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onSelect={() => void downloadPdf(r)}>
                            <FileDown /> Télécharger la fiche PDF
                          </DropdownMenuItem>
                          {canSendSms && (
                            <DropdownMenuItem onSelect={() => sendSms(r)} disabled={!g?.phone}>
                              <MessageSquareText /> Envoyer un SMS
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() => requestDelete(r)}
                              >
                                <Trash2 /> Supprimer la réservation
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    {["pending", "confirmed"].includes(r.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => changeStatus(r.id, "checked_in")}
                      >
                        Check-in
                      </Button>
                    )}
                    {r.status === "checked_in" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => changeStatus(r.id, "checked_out")}
                      >
                        Check-out
                      </Button>
                    )}
                    {!["cancelled", "checked_out"].includes(r.status) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => changeStatus(r.id, "cancelled")}
                      >
                        Annuler
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {!rows.length && (
            <tr>
              <td colSpan={7} className="py-12 text-center text-slate-400">
                Aucune réservation trouvée.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function Planning({ rows, guests, rooms }: any) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {rows
        .slice()
        .sort((a: any, b: any) => a.check_in.localeCompare(b.check_in))
        .map((r: any) => {
          const g = guests.get(r.guest_id),
            room = rooms.get(r.room_id);
          return (
            <article
              key={r.id}
              className="rounded-xl border border-slate-200 p-4 dark:border-white/10"
            >
              <div className="flex justify-between gap-3">
                <b>{formatDate(r.check_in)}</b>
                <span className="text-xs text-slate-400">{r.nights} nuit(s)</span>
              </div>
              <p className="mt-3 font-medium">
                {g ? `${g.first_name} ${g.last_name}` : WALK_IN_LABEL}
              </p>
              <p className="text-sm text-slate-500">
                Chambre {room?.number ?? "—"} · jusqu’au {formatDate(r.check_out)}
              </p>
              <div className="mt-3 h-1.5 rounded-full bg-[#C9A227]" />
            </article>
          );
        })}
      {!rows.length && <p className="py-10 text-center text-slate-400">Aucun séjour à afficher.</p>}
    </div>
  );
}
