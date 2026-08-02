import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  ChevronsUpDown,
  Download,
  FileText,
  List,
  Plus,
  Printer,
  Search,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { createHotelInvoicePdf, type HotelInvoiceData } from "@/lib/mms/hotel-invoice-pdf";
import { downloadPdf } from "@/lib/mms/download-pdf";

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
  status: "confirmed",
  notes: "",
};

export function HotelReservationsPage() {
  const qc = useQueryClient();
  const { profile } = useTenant();
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const { settings, logoUrl } = useCompanySettings();
  const [invoicePreview, setInvoicePreview] = useState<{
    url: string;
    pdf: Awaited<ReturnType<typeof createHotelInvoicePdf>>;
  } | null>(null);

  const { data } = useQuery({
    queryKey: ["hotel-reservations"],
    queryFn: async () => {
      const [r, g, rooms] = await Promise.all([
        db.from("hotel_reservation_balances").select("*").order("check_in", { ascending: false }),
        db.from("hotel_guests").select("id,first_name,last_name,phone,email"),
        db.from("hotel_rooms").select("id,number,rate,status"),
      ]);
      for (const result of [r, g, rooms]) if (result.error) throw result.error;
      return { reservations: r.data ?? [], guests: g.data ?? [], rooms: rooms.data ?? [] };
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["hotel-reservations"] });
    qc.invalidateQueries({ queryKey: ["hotel-overview"] });
  };
  const save = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id) throw new Error("Tenant introuvable");
      if (!form.guest_id)
        throw new Error("Sélectionnez un client existant ou créez un nouveau client.");
      const payload = {
        ...form,
        tenant_id: profile.tenant_id,
        nightly_rate: Number(form.nightly_rate),
        discount: Number(form.discount),
        notes: form.notes || null,
      };
      const result = editingId
        ? await db.from("hotel_reservations").update(payload).eq("id", editingId)
        : await db.from("hotel_reservations").insert(payload);
      if (result.error) throw result.error;
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
      const { error } = await db.from("hotel_reservations").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Statut mis à jour");
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
  const edit = (r: any) => {
    setEditingId(r.id);
    setForm({
      guest_id: r.guest_id ?? "",
      room_id: r.room_id,
      check_in: r.check_in,
      check_out: r.check_out,
      nightly_rate: String(r.nightly_rate),
      discount: String(r.discount ?? 0),
      status: r.status,
      notes: r.notes ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const previewInvoice = async (r: any) => {
    const guest: any = guests.get(r.guest_id),
      room: any = rooms.get(r.room_id);
    const value: HotelInvoiceData = {
      ...r,
      guestName: guest ? `${guest.first_name} ${guest.last_name}` : WALK_IN_LABEL,
      guestPhone: guest?.phone,
      roomNumber: String(room?.number ?? "—"),
      nights: Number(r.nights),
      nightly_rate: Number(r.nightly_rate),
      discount: Number(r.discount ?? 0),
      grand_total: Number(r.grand_total ?? 0),
      paid_total: Number(r.paid_total ?? 0),
      balance_due: Number(r.balance_due ?? 0),
    };
    const pdf = await createHotelInvoicePdf(value, settings, logoUrl);
    setInvoicePreview({ pdf, url: URL.createObjectURL(pdf.doc.output("blob")) });
  };
  const closeInvoice = () => {
    if (invoicePreview) URL.revokeObjectURL(invoicePreview.url);
    setInvoicePreview(null);
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
              disabled={save.isPending || !form.room_id || nights < 1}
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
            invoice={previewInvoice}
            changeStatus={(id: string, status: string) => changeStatus.mutate({ id, status })}
          />
        )}
      </section>
      <Dialog
        open={!!invoicePreview}
        onOpenChange={(open) => {
          if (!open) closeInvoice();
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Aperçu de la facture</DialogTitle>
          </DialogHeader>
          {invoicePreview && (
            <>
              <iframe
                title="Aperçu de la facture PDF"
                src={invoicePreview.url}
                className="h-[65vh] w-full rounded-md border"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    invoicePreview.pdf.doc.autoPrint();
                    window.open(invoicePreview.pdf.doc.output("bloburl"), "_blank");
                  }}
                >
                  <Printer className="mr-2 size-4" />
                  Imprimer
                </Button>
                <Button
                  onClick={() =>
                    void downloadPdf(invoicePreview.pdf.doc, invoicePreview.pdf.filename)
                  }
                >
                  <Download className="mr-2 size-4" />
                  Télécharger PDF
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
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
function ReservationTable({ rows, guests, rooms, edit, invoice, changeStatus }: any) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-slate-400">
            <th className="p-3">Client</th>
            <th>Chambre</th>
            <th>Séjour</th>
            <th>Statut</th>
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
                <td className="p-3 font-medium">
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
                <td className="font-medium">{formatCurrency(Number(r.balance_due ?? 0))}</td>
                <td>
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="outline" onClick={() => void invoice(r)}>
                      <FileText className="mr-1 size-4" /> Facture PDF
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => edit(r)}>
                      Modifier
                    </Button>
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
              <td colSpan={6} className="py-12 text-center text-slate-400">
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
