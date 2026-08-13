import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import {
  BedDouble,
  CalendarDays,
  CalendarPlus,
  ChartPie,
  ChevronDown,
  Eye,
  ImagePlus,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Users,
  FileText,
  Wallet,
  X,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HotelAppShell } from "@/components/hotel/HotelAppShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { supabase } from "@/integrations/supabase/client";
import { useActionPermission } from "@/hooks/use-action-permission";
import { useTenant } from "@/providers/TenantProvider";
import { formatCurrency, formatDate } from "@/lib/mms/format";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { createHotelListPdf, formatHotelPdfAmount } from "@/lib/mms/hotel-pdf-engine";
import { downloadPdf } from "@/lib/mms/download-pdf";

type RoomStatus = "available" | "occupied" | "cleaning" | "maintenance" | "out_of_service";
type HotelRoom = {
  id: string;
  tenant_id: string;
  number: string;
  rate: number;
  capacity: number;
  status: string;
  created_at: string;
  updated_at: string;
  cover_image_path: string | null;
  room_type_id: string | null;
  property_type: string | null;
  room_count: number | null;
  amenities: string[];
  hotel_room_types?: { name: string; amenities: string[] } | null;
};

type Reservation = {
  id: string; room_id: string; guest_id: string | null; check_in: string; check_out: string;
  status: string; nightly_rate: number; created_at: string;
};
type Guest = { id: string; first_name: string; last_name: string };

type RoomForm = {
  name: string;
  price: string;
  status: RoomStatus;
  roomTypeId: string;
  propertyType: string;
  roomCount: string;
  capacity: string;
  coverFile: File | null;
};
const emptyForm: RoomForm = {
  name: "",
  price: "",
  status: "available",
  roomTypeId: "",
  propertyType: "",
  roomCount: "",
  capacity: "1",
  coverFile: null,
};
// Broad property category — independent from the free-form room count and from the
// tenant-defined hotel_room_types catalog (e.g. "Suite Deluxe"). Studio always has 1 room.
const PROPERTY_TYPE_OPTIONS: [string, string][] = [
  ["studio", "Studio"],
  ["chambre", "Chambre"],
  ["appartement", "Appartement"],
  ["suite", "Suite"],
  ["villa", "Villa"],
  ["maison", "Maison"],
  ["autre", "Autre"],
];
const PROPERTY_TYPE_LABELS: Record<string, string> = Object.fromEntries(PROPERTY_TYPE_OPTIONS);
// Studio is always a single room; other property types take a free room count (1-99).
function resolveRoomCount(propertyType: string, roomCountInput: string): number | null {
  if (propertyType === "studio") return 1;
  const value = Number(roomCountInput);
  return Number.isInteger(value) && value >= 1 && value <= 99 ? value : null;
}
// The generated Supabase types do not include the recently provisioned hotel tables yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
const IMAGE_BUCKET = "hotel-room-images";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const statusMeta: Record<RoomStatus, { label: string; className: string }> = {
  available: {
    label: "Disponible",
    className:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-400/10 dark:text-emerald-300",
  },
  occupied: {
    label: "Occupé",
    className: "bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-400/10 dark:text-sky-300",
  },
  cleaning: {
    label: "Nettoyage",
    className: "bg-violet-50 text-violet-700 ring-violet-600/15 dark:bg-violet-400/10 dark:text-violet-300",
  },
  maintenance: { label: "Maintenance", className: "bg-orange-50 text-orange-700 ring-orange-600/15" },
  out_of_service: { label: "Hors service", className: "bg-slate-100 text-slate-700 ring-slate-500/15" },
};
const reservedMeta = { label: "Réservé", className: "bg-amber-50 text-amber-700 ring-amber-600/15" };
const STATUS_OPTIONS: [RoomStatus, string][] = [
  ["available", "Disponible"],
  ["occupied", "Occupé"],
  ["cleaning", "Nettoyage"],
  ["maintenance", "Maintenance"],
  ["out_of_service", "Hors service"],
];

function shortDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function assertRoomTenant(room: HotelRoom, tenantId?: string): asserts tenantId is string {
  if (!tenantId || room.tenant_id !== tenantId) throw new Error("Accès inter-tenant refusé.");
}

function assertTenantImagePath(path: string, tenantId: string, roomId: string) {
  if (!path.startsWith(`${tenantId}/${roomId}/cover.`))
    throw new Error("Chemin de photo invalide pour cet établissement.");
}

async function uploadCover(file: File, tenantId: string, roomId: string, replace: boolean) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_SIZE)
    throw new Error("Photo invalide. Utilisez un JPG, PNG ou WebP de 5 Mo maximum.");
  const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `${tenantId}/${roomId}/cover.${extension}`;
  assertTenantImagePath(path, tenantId, roomId);
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: replace,
  });
  if (error) throw error;
  return path;
}

export function HotelRoomsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { profile } = useTenant();
  const tenantId = profile?.tenant_id;
  const { settings, logoUrl } = useCompanySettings(tenantId);
  const canCreate = useActionPermission("hotel.rooms.create");
  const canUpdate = useActionPermission("hotel.rooms.update");
  const canDelete = useActionPermission("hotel.rooms.delete");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | RoomStatus | "reserved">("all");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState<"name" | "price">("name");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HotelRoom | null>(null);
  const [viewing, setViewing] = useState<HotelRoom | null>(null);
  const [deleting, setDeleting] = useState<HotelRoom | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    if (tenantId) localStorage.removeItem(`saovia:hotel-room-covers:${tenantId}`);
  }, [tenantId]);
  const roomsQuery = useQuery({
    queryKey: ["hotel_rooms", tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await db
        .from("hotel_rooms")
        .select("*,hotel_room_types(name,amenities)")
        .eq("tenant_id", tenantId)
        .order("number", { ascending: true });
      if (error) throw error;
      return (data ?? []) as HotelRoom[];
    },
  });

  const contextQuery = useQuery({
    queryKey: ["hotel-room-management-context", tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const [reservations, guests] = await Promise.all([
        db.from("hotel_reservations").select("id,room_id,guest_id,check_in,check_out,status,nightly_rate,created_at").eq("tenant_id", tenantId).order("check_in"),
        db.from("hotel_guests").select("id,first_name,last_name").eq("tenant_id", tenantId),
      ]);
      if (reservations.error) throw reservations.error;
      if (guests.error) throw guests.error;
      return { reservations: (reservations.data ?? []) as Reservation[], guests: (guests.data ?? []) as Guest[] };
    },
  });

  const roomTypesQuery = useQuery({
    queryKey: ["hotel-room-types-catalog", tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await db
        .from("hotel_room_types")
        .select("id,name")
        .eq("tenant_id", tenantId)
        .order("name");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const imageUrlsQuery = useQuery({
    queryKey: ["hotel-room-cover-urls", tenantId, roomsQuery.data],
    enabled: Boolean(tenantId && roomsQuery.data),
    queryFn: async () => {
      const paths = (roomsQuery.data ?? [])
        .map((room) => room.cover_image_path)
        .filter((path): path is string => Boolean(path));
      if (!paths.length) return {} as Record<string, string>;
      const { data, error } = await supabase.storage
        .from(IMAGE_BUCKET)
        .createSignedUrls(paths, 60 * 60);
      if (error) throw error;
      return Object.fromEntries(
        (data ?? []).filter((item) => item.signedUrl).map((item) => [item.path, item.signedUrl]),
      ) as Record<string, string>;
    },
  });

  const imageFor = (room: HotelRoom) =>
    room.cover_image_path ? imageUrlsQuery.data?.[room.cover_image_path] : undefined;

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const activeReservationRoomIds = useMemo(() => {
    return new Set((contextQuery.data?.reservations ?? []).filter((r) =>
      ["pending", "confirmed"].includes(r.status) && r.check_in >= today,
    ).map((r) => r.room_id));
  }, [contextQuery.data, today]);
  const nextBookingByRoom = useMemo(() => {
    const reservations = contextQuery.data?.reservations ?? [];
    const map = new Map<string, string>();
    for (const room of roomsQuery.data ?? []) {
      const roomReservations = reservations.filter((r) => r.room_id === room.id);
      if (roomReservations.some((r) => r.status === "checked_in")) {
        map.set(room.id, "En séjour");
        continue;
      }
      const upcoming = roomReservations
        .filter((r) => ["pending", "confirmed"].includes(r.status) && r.check_out >= today)
        .sort((a, b) => a.check_in.localeCompare(b.check_in))[0];
      map.set(
        room.id,
        upcoming
          ? `${upcoming.check_in === today ? "Aujourd’hui" : shortDate(upcoming.check_in)} → ${shortDate(upcoming.check_out)}`
          : "Aucune réservation",
      );
    }
    return map;
  }, [contextQuery.data, roomsQuery.data, today]);
  const roomTypes = useMemo(() => Array.from(new Set((roomsQuery.data ?? []).map((r) => r.hotel_room_types?.name).filter(Boolean) as string[])).sort(), [roomsQuery.data]);

  const rooms = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return (roomsQuery.data ?? [])
      .filter((room) => status === "all" || (status === "reserved" ? activeReservationRoomIds.has(room.id) : room.status === status))
      .filter((room) => type === "all" || room.hotel_room_types?.name === type)
      .filter((room) => !normalized || room.number.toLocaleLowerCase("fr").includes(normalized))
      .sort((a, b) =>
        sort === "price"
          ? Number(a.rate) - Number(b.rate)
          : a.number.localeCompare(b.number, "fr", { numeric: true }),
      );
  }, [activeReservationRoomIds, query, roomsQuery.data, sort, status, type]);

  const changeRoomStatus = useMutation({
    mutationFn: async ({ room, status }: { room: HotelRoom; status: RoomStatus }) => {
      assertRoomTenant(room, tenantId);
      const { error } = await db.from("hotel_rooms").update({ status }).eq("tenant_id", tenantId).eq("id", room.id);
      if (error) throw error;
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["hotel_rooms", tenantId] }); toast.success("Statut du logement mis à jour"); },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteRoom = useMutation({
    mutationFn: async (room: HotelRoom) => {
      assertRoomTenant(room, tenantId);
      if (room.cover_image_path) {
        assertTenantImagePath(room.cover_image_path, tenantId, room.id);
        const { error: storageError } = await supabase.storage
          .from(IMAGE_BUCKET)
          .remove([room.cover_image_path]);
        if (storageError) throw storageError;
      }
      const { error } = await db.from("hotel_rooms").delete().eq("tenant_id", tenantId).eq("id", room.id);
      if (error) throw error;
      return room;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["hotel_rooms", tenantId] });
      setDeleting(null);
      toast.success("Logement supprimé");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (room: HotelRoom) => {
    setEditing(room);
    setFormOpen(true);
  };
  const exportRooms = async () => {
    const pdf = await createHotelListPdf({
      title: "Liste des logements",
      filename: `logements-${new Date().toISOString().slice(0, 10)}.pdf`,
      head: ["Logement", "Type", "Capacité", "Tarif / nuit", "Statut"],
      body: rooms.map((room) => [
        room.number,
        room.hotel_room_types?.name,
        room.capacity,
        formatHotelPdfAmount(room.rate),
        activeReservationRoomIds.has(room.id) ? "Réservé" : (statusMeta[room.status as RoomStatus]?.label ?? room.status),
      ]),
      settings,
      logoUrl,
    });
    await downloadPdf(pdf.doc, pdf.filename);
  };

  const totalRooms = roomsQuery.data?.length ?? 0;
  const occupiedCount = (roomsQuery.data ?? []).filter((r) => r.status === "occupied").length;
  const occupancyRate = totalRooms ? Math.round((occupiedCount / totalRooms) * 100) : 0;
  const estimatedRevenue = (roomsQuery.data ?? [])
    .filter((r) => r.status === "occupied")
    .reduce((sum, r) => sum + Number(r.rate || 0), 0);
  const hasActiveFilters = Boolean(query || status !== "all" || type !== "all");
  const hasFilterSelections = status !== "all" || type !== "all" || sort !== "name";
  const resetFilters = () => {
    setQuery("");
    setStatus("all");
    setType("all");
    setSort("name");
  };

  return (
    <HotelAppShell
      title="Chambres / Logements"
      subtitle="Gérez vos chambres, studios et logements"
      actions={
        <>
          {/* Desktop / tablette : boutons complets, jamais masqués */}
          <div className="hidden items-center gap-2 sm:flex">
            <Button variant="outline" disabled={!rooms.length} onClick={() => void exportRooms()} className="rounded-xl">
              <FileText className="size-4" /> Exporter PDF
            </Button>
            {canCreate ? (
              <Button
                onClick={openCreate}
                className="rounded-xl bg-[#B89236] text-white shadow-lg shadow-amber-950/10 hover:bg-[#9D7927]"
              >
                <Plus className="size-4" />
                Ajouter un logement
              </Button>
            ) : null}
          </div>
          {/* Mobile : rien n'est caché, tout reste accessible via un menu compact */}
          <div className="flex items-center gap-2 sm:hidden">
            {canCreate ? (
              <Button
                size="icon"
                onClick={openCreate}
                aria-label="Ajouter un logement"
                className="rounded-xl bg-[#B89236] text-white shadow-lg shadow-amber-950/10 hover:bg-[#9D7927]"
              >
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
                <DropdownMenuItem disabled={!rooms.length} onSelect={() => void exportRooms()}>
                  <FileText className="size-4" /> Exporter en PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      }
    >
      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {([
          ["Total", totalRooms, BedDouble],
          ["Réservés", activeReservationRoomIds.size, CalendarDays],
          ["Taux d’occupation", `${occupancyRate}%`, ChartPie],
          ["Revenu estimé", formatCurrency(estimatedRevenue), Wallet],
        ] as const).map(([label, value, Icon]) => (
          <KpiTile key={label} label={label} value={value} Icon={Icon} />
        ))}
      </section>

      <div className="mt-3 rounded-2xl border bg-card p-3 shadow-sm sm:mt-4">
        {/* Mobile : recherche + bouton Filtres compacts sur une seule ligne */}
        <div className="flex items-center gap-2 sm:hidden">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un logement…"
              className="h-11 w-full rounded-xl border bg-background pl-10 pr-4 text-sm outline-none focus:border-[#B89236] focus:ring-2 focus:ring-[#B89236]/15"
            />
          </div>
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative h-11 shrink-0 rounded-xl px-3.5">
                <SlidersHorizontal className="size-4" />
                Filtres
                {hasFilterSelections && (
                  <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-[#B89236]" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
              <SheetHeader>
                <SheetTitle>Filtres</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                <FilterSelect value={type} onChange={setType} options={[["all", "Tous les types"], ...roomTypes.map((v) => [v, v])]} />
                <FilterSelect
                  icon={<SlidersHorizontal className="size-4" />}
                  value={status}
                  onChange={(value) => setStatus(value as typeof status)}
                  options={[
                    ["all", "Tous les statuts"],
                    ["available", "Disponible"],
                    ["occupied", "Occupé"],
                    ["reserved", "Réservé"],
                    ["cleaning", "Nettoyage"],
                    ["maintenance", "Maintenance"],
                    ["out_of_service", "Hors service"],
                  ]}
                />
                <FilterSelect
                  value={sort}
                  onChange={(value) => setSort(value as typeof sort)}
                  options={[
                    ["name", "Trier par nom"],
                    ["price", "Trier par tarif"],
                  ]}
                />
              </div>
              <SheetFooter className="mt-5">
                {hasActiveFilters && (
                  <Button variant="ghost" onClick={resetFilters} className="rounded-xl">
                    <X className="size-4" /> Réinitialiser
                  </Button>
                )}
                <SheetClose asChild>
                  <Button className="rounded-xl bg-[#B89236] text-white hover:bg-[#9D7927]">
                    Appliquer
                  </Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>

        {/* Tablette / desktop : disposition inchangée */}
        <div className="hidden sm:grid sm:grid-cols-2 sm:gap-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
          <div className="relative min-w-0 sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un logement…"
              className="h-11 w-full rounded-xl border bg-background pl-10 pr-4 text-sm outline-none focus:border-[#B89236] focus:ring-2 focus:ring-[#B89236]/15"
            />
          </div>
          <FilterSelect value={type} onChange={setType} options={[["all", "Tous les types"], ...roomTypes.map((v) => [v, v])]} />
          <FilterSelect
            icon={<SlidersHorizontal className="size-4" />}
            value={status}
            onChange={(value) => setStatus(value as typeof status)}
            options={[
              ["all", "Tous les statuts"],
              ["available", "Disponible"],
              ["occupied", "Occupé"],
              ["reserved", "Réservé"],
              ["cleaning", "Nettoyage"],
              ["maintenance", "Maintenance"],
              ["out_of_service", "Hors service"],
            ]}
          />
          <div className="flex items-center gap-2">
            <FilterSelect
              value={sort}
              onChange={(value) => setSort(value as typeof sort)}
              options={[
                ["name", "Trier par nom"],
                ["price", "Trier par tarif"],
              ]}
            />
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="icon"
                onClick={resetFilters}
                aria-label="Réinitialiser les filtres"
                className="h-11 w-11 shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {roomsQuery.isLoading ? (
        <div className="grid min-h-72 place-items-center">
          <Loader2 className="size-7 animate-spin text-[#B89236]" />
        </div>
      ) : rooms.length ? (
        <div className="mt-3 overflow-hidden rounded-xl border bg-card shadow-sm sm:mt-4">
          <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[960px] text-sm"><thead className="bg-[#102A43] text-white"><tr>{["Photo", "Logement", "Type", "Prix / nuit", "Statut", "Prochaine réservation", "Actions"].map((h) => <th key={h} className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide">{h}</th>)}</tr></thead><tbody className="divide-y">
          {rooms.map((room) => (
            <RoomRow
              key={room.id}
              room={room}
              image={imageFor(room)}
              reserved={activeReservationRoomIds.has(room.id)}
              nextBooking={nextBookingByRoom.get(room.id) ?? "Aucune réservation"}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onView={() => setViewing(room)}
              onEdit={() => openEdit(room)}
              onReserve={() => void navigate({ to: "/hotel/reservations" })}
              onCalendar={() => void navigate({ to: "/hotel" })}
              onBlock={() => changeRoomStatus.mutate({ room, status: room.status === "out_of_service" ? "available" : "out_of_service" })}
              onSetStatus={(newStatus) => changeRoomStatus.mutate({ room, status: newStatus })}
              onDelete={() => setDeleting(room)}
            />
          ))}</tbody></table></div>
          <div className="divide-y md:hidden">{rooms.map((room) => <RoomMobileCard key={room.id} room={room} image={imageFor(room)} reserved={activeReservationRoomIds.has(room.id)} nextBooking={nextBookingByRoom.get(room.id) ?? "Aucune réservation"} canUpdate={canUpdate} canDelete={canDelete} onView={() => setViewing(room)} onEdit={() => openEdit(room)} onReserve={() => void navigate({ to: "/hotel/reservations" })} onCalendar={() => void navigate({ to: "/hotel" })} onBlock={() => changeRoomStatus.mutate({ room, status: room.status === "out_of_service" ? "available" : "out_of_service" })} onSetStatus={(newStatus) => changeRoomStatus.mutate({ room, status: newStatus })} onDelete={() => setDeleting(room)} />)}</div>
        </div>
      ) : (
        <EmptyState
          filtered={Boolean(query || status !== "all" || type !== "all")}
          canCreate={canCreate}
          onCreate={openCreate}
        />
      )}

      <RoomFormDialog
        open={formOpen}
        room={editing}
        image={editing ? imageFor(editing) : undefined}
        tenantId={tenantId}
        roomTypeOptions={roomTypesQuery.data ?? []}
        onOpenChange={setFormOpen}
        onSaved={() => {
          void qc.invalidateQueries({ queryKey: ["hotel_rooms", tenantId] });
          void qc.invalidateQueries({ queryKey: ["hotel-room-cover-urls", tenantId] });
        }}
      />
      <RoomDetails
        room={viewing}
        image={viewing ? imageFor(viewing) : undefined}
        reservations={contextQuery.data?.reservations ?? []}
        guests={contextQuery.data?.guests ?? []}
        onClose={() => setViewing(null)}
        onEdit={
          canUpdate && viewing
            ? () => {
                const room = viewing;
                setViewing(null);
                openEdit(room);
              }
            : undefined
        }
      />
      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce logement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment supprimer ce logement ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteRoom.mutate(deleting)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRoom.isPending ? (
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

function KpiTile({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string | number;
  Icon: (props: { className?: string }) => ReactNode;
}) {
  return (
    <div className="group flex items-center gap-2.5 rounded-2xl border border-[#D8C99E]/40 bg-card px-3 py-2.5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:gap-3 sm:px-4 sm:py-3.5">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#102A43] text-[#E2C66E] transition-transform duration-300 group-hover:scale-105 sm:size-10">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-base font-bold leading-none text-[#102A43] dark:text-white sm:text-lg lg:text-xl">{value}</p>
        <p className="mt-1 truncate text-[10px] text-muted-foreground sm:mt-1.5 sm:text-[11px]">{label}</p>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-28 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
      <b className="text-2xl text-[#E2C66E]">{value}</b>
      <p className="text-xs text-slate-300">{label}</p>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  icon,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[][];
  icon?: ReactNode;
}) {
  return (
    <label className="relative flex h-11 items-center rounded-xl border bg-background px-3 text-sm">
      <span className="mr-2 text-muted-foreground">{icon}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="appearance-none bg-transparent pr-7 outline-none"
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

function effectiveMeta(room: HotelRoom, reserved: boolean) {
  return reserved && room.status === "available"
    ? reservedMeta
    : statusMeta[room.status as RoomStatus] ?? { label: room.status, className: "bg-slate-100 text-slate-600 ring-slate-500/15" };
}

function RoomThumbnail({ room, image, size = "sm" }: { room: HotelRoom; image?: string; size?: "sm" | "lg" }) {
  // Uniform 16:9 crop everywhere a room photo appears (table, mobile card, detail banner).
  const dims = size === "lg" ? "aspect-video h-16" : "aspect-video h-10";
  const iconSize = size === "lg" ? "size-6" : "size-4";
  return image ? (
    <img src={image} alt="" className={`${dims} rounded-lg object-cover`} />
  ) : (
    <div className={`grid ${dims} shrink-0 place-items-center rounded-lg bg-[#102A43]/10 text-[#102A43]`}>
      <BedDouble className={iconSize} />
    </div>
  );
}

type ManageRoomProps = {
  room: HotelRoom;
  image?: string;
  reserved: boolean;
  nextBooking: string;
  canUpdate: boolean;
  canDelete: boolean;
  onView: () => void;
  onEdit: () => void;
  onReserve: () => void;
  onCalendar: () => void;
  onBlock: () => void;
  onSetStatus: (status: RoomStatus) => void;
  onDelete: () => void;
};
function RoomActions({
  room,
  canUpdate,
  canDelete,
  onView,
  onEdit,
  onReserve,
  onCalendar,
  onSetStatus,
  onDelete,
}: Omit<ManageRoomProps, "image" | "reserved" | "nextBooking" | "onBlock">) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="size-8 text-[#102A43] hover:bg-[#B89236]/10 hover:text-[#9D7927] dark:text-[#E2C66E]"
          aria-label="Plus d’actions"
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        {canUpdate && (
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil className="size-4" /> Modifier
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={onReserve}>
          <CalendarPlus className="size-4" /> Réserver
        </DropdownMenuItem>
        {canUpdate && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <SlidersHorizontal className="size-4" /> Changer le statut
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {STATUS_OPTIONS.filter(([key]) => key !== room.status).map(([key, label]) => (
                <DropdownMenuItem key={key} onSelect={() => onSetStatus(key)}>
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        <DropdownMenuItem onSelect={onCalendar}>
          <CalendarDays className="size-4" /> Voir le calendrier
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onView}>
          <Eye className="size-4" /> Historique
        </DropdownMenuItem>
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={onDelete}
            >
              <Trash2 className="size-4" /> Supprimer
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RoomRow(props: ManageRoomProps) {
  const { room, image, reserved, nextBooking, onView } = props; const meta = effectiveMeta(room, reserved);
  return <tr className="hover:bg-muted/30">
    <td className="px-3 py-2"><RoomThumbnail room={room} image={image} /></td>
    <td className="min-w-[160px] px-3 py-2 font-semibold text-[#102A43] dark:text-white">{room.number}</td>
    <td className="min-w-[140px] px-3 py-2 text-muted-foreground">{room.hotel_room_types?.name ?? "—"}</td>
    <td className="px-3 py-2 font-medium">{formatCurrency(Number(room.rate))}</td>
    <td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${meta.className}`}>{meta.label}</span></td>
    <td className="min-w-[150px] px-3 py-2 text-muted-foreground">{nextBooking}</td>
    <td className="px-3 py-2">
      <div className="flex items-center justify-end gap-1.5">
        <Button size="sm" variant="outline" onClick={onView} className="h-8 rounded-lg px-2.5 text-xs">
          <Eye className="size-3.5" /> Voir
        </Button>
        <RoomActions {...props} />
      </div>
    </td>
  </tr>;
}

function RoomMobileCard(props: ManageRoomProps) {
  const { room, image, reserved, nextBooking, onView } = props;
  const meta = effectiveMeta(room, reserved);
  return (
    <article className="p-3.5 transition-colors active:bg-muted/20">
      <div className="flex gap-3">
        <div className="shrink-0 overflow-hidden rounded-xl">
          <RoomThumbnail room={room} image={image} size="lg" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-[#102A43] dark:text-white">{room.number}</h3>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {room.hotel_room_types?.name ?? "Type non défini"}
              </p>
              <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="size-3.5" />
                {room.capacity} pers.
              </span>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ${meta.className}`}>
              {meta.label}
            </span>
          </div>
          <p className="mt-1.5 truncate text-xs text-muted-foreground">{nextBooking}</p>
          <div className="mt-2 flex items-center justify-between border-t pt-2">
            <p className="text-sm font-semibold text-[#9D7927] dark:text-[#E2C66E]">
              {formatCurrency(Number(room.rate))}{" "}
              <span className="text-[10px] font-normal text-muted-foreground">/ nuit</span>
            </p>
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="outline" onClick={onView} className="h-8 rounded-lg px-2.5 text-xs">
                <Eye className="size-3.5" /> Voir
              </Button>
              <RoomActions {...props} />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function RoomCard({
  room,
  image,
  index,
  canUpdate,
  canDelete,
  onView,
  onEdit,
  onDelete,
}: {
  room: HotelRoom;
  image?: string;
  index: number;
  canUpdate: boolean;
  canDelete: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = statusMeta[room.status as RoomStatus] ?? {
    label: room.status,
    className: "bg-slate-100 text-slate-600 ring-slate-500/15",
  };
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.2) }}
      className="group overflow-hidden rounded-[22px] border bg-card shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-950/5"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#D8C99E] via-[#AEB9AD] to-[#53665D]">
        {image ? (
          <img
            src={image}
            alt={room.number}
            className="size-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid size-full place-items-center">
            <BedDouble className="size-14 text-white/60" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <span
          className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${meta.className}`}
        >
          {meta.label}
        </span>
        <p className="absolute bottom-3 left-4 text-xs font-medium uppercase tracking-[.18em] text-white/80">
          Logement
        </p>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">{room.number}</h3>
            <p className="mt-1 text-sm text-muted-foreground">Tarif par nuit</p>
          </div>
          <p className="text-right font-semibold text-[#9D7927] dark:text-[#E2C66E]">
            {formatCurrency(Number(room.rate))}
          </p>
        </div>
        <div className="mt-4 flex items-center justify-between border-t pt-3">
          <button
            onClick={onView}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            <Eye className="size-3.5" />
            Voir
          </button>
          <div className="flex gap-1">
            {canUpdate && (
              <button
                onClick={onEdit}
                aria-label="Modifier"
                className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Pencil className="size-4" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={onDelete}
                aria-label="Supprimer"
                className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function EmptyState({
  filtered,
  canCreate,
  onCreate,
}: {
  filtered: boolean;
  canCreate: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="mt-6 grid min-h-72 place-items-center rounded-[24px] border border-dashed bg-muted/20 p-8 text-center">
      <div>
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#B89236]/10 text-[#9D7927]">
          <BedDouble className="size-7" />
        </div>
        <h3 className="mt-4 font-semibold">
          {filtered ? "Aucun logement trouvé" : "Votre collection est vide"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {filtered
            ? "Essayez de modifier vos critères."
            : "Ajoutez votre premier logement pour commencer."}
        </p>
        {canCreate && !filtered && (
          <Button onClick={onCreate} className="mt-5 rounded-xl">
            <Plus className="size-4" />
            Ajouter un logement
          </Button>
        )}
      </div>
    </div>
  );
}

function RoomFormDialog({
  open,
  room,
  image,
  tenantId,
  roomTypeOptions,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  room: HotelRoom | null;
  image?: string;
  tenantId?: string;
  roomTypeOptions: { id: string; name: string }[];
  onOpenChange: (open: boolean) => void;
  onSaved: (room: HotelRoom) => void;
}) {
  const [form, setForm] = useState<RoomForm>(emptyForm);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(image);
  const [attempted, setAttempted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(room);
  const reset = () =>
    setForm(
      room
        ? {
            name: room.number,
            price: String(room.rate),
            status: room.status as RoomStatus,
            roomTypeId: room.room_type_id ?? "",
            propertyType: room.property_type ?? "",
            roomCount: room.room_count != null ? String(room.room_count) : "",
            capacity: String(room.capacity ?? 1),
            coverFile: null,
          }
        : emptyForm,
    );
  useEffect(() => {
    if (open) {
      reset();
      setPreviewUrl(image);
      setAttempted(false);
    }
  }, [open, room, image]);
  useEffect(
    () => () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );
  const errors = useMemo(() => {
    const e: Partial<Record<"name" | "price" | "capacity" | "photo" | "propertyType" | "roomCount", string>> = {};
    if (!form.name.trim()) e.name = "Le nom du logement est obligatoire.";
    const price = Number(form.price);
    if (!form.price.trim() || !Number.isFinite(price) || price <= 0)
      e.price = "Le tarif doit être supérieur à 0.";
    const capacity = Number(form.capacity);
    if (!form.capacity.trim() || !Number.isInteger(capacity) || capacity <= 0)
      e.capacity = "Indiquez un nombre entier de personnes supérieur à 0.";
    if (!form.propertyType) e.propertyType = "Le type de logement est obligatoire.";
    else if (resolveRoomCount(form.propertyType, form.roomCount) === null)
      e.roomCount = "Indiquez un nombre de pièces entre 1 et 99.";
    if (!room && !form.coverFile) e.photo = "La photo de couverture est obligatoire.";
    return e;
  }, [form, room]);
  const save = useMutation({
    mutationFn: async () => {
      const name = form.name.trim();
      const price = Number(form.price);
      const capacity = Number(form.capacity);
      if (!name) throw new Error("Le nom du logement est obligatoire.");
      if (!Number.isFinite(price) || price <= 0)
        throw new Error("Le tarif doit être supérieur à 0.");
      if (!Number.isInteger(capacity) || capacity <= 0)
        throw new Error("Le nombre de personnes doit être un entier supérieur à 0.");
      if (!form.propertyType) throw new Error("Le type de logement est obligatoire.");
      const roomCount = resolveRoomCount(form.propertyType, form.roomCount);
      if (roomCount === null) throw new Error("Indiquez un nombre de pièces entre 1 et 99.");
      if (!room && !form.coverFile) throw new Error("La photo de couverture est obligatoire.");
      if (!tenantId) throw new Error("Aucun établissement actif.");
      const payload = {
        number: name,
        rate: price,
        status: form.status,
        capacity,
        room_type_id: form.roomTypeId || null,
        property_type: form.propertyType,
        room_count: roomCount,
      };
      if (room) {
        assertRoomTenant(room, tenantId);
        const newPath = form.coverFile
          ? await uploadCover(form.coverFile, tenantId, room.id, true)
          : null;
        const { data, error } = await db
          .from("hotel_rooms")
          .update({ ...payload, ...(newPath ? { cover_image_path: newPath } : {}) })
          .eq("id", room.id)
          .select("*")
          .single();
        if (error) {
          if (newPath && newPath !== room.cover_image_path)
            await supabase.storage.from(IMAGE_BUCKET).remove([newPath]);
          throw error;
        }
        if (newPath && room.cover_image_path && room.cover_image_path !== newPath) {
          assertTenantImagePath(room.cover_image_path, tenantId, room.id);
          const { error: removeError } = await supabase.storage
            .from(IMAGE_BUCKET)
            .remove([room.cover_image_path]);
          if (removeError)
            toast.warning(
              "La nouvelle photo est enregistrée, mais l’ancienne n’a pas pu être nettoyée.",
            );
        }
        return data as HotelRoom;
      }
      const { data: created, error } = await db
        .from("hotel_rooms")
        .insert({ ...payload, tenant_id: tenantId })
        .select("*")
        .single();
      if (error) throw error;
      const createdRoom = created as HotelRoom;
      let coverPath: string | null = null;
      try {
        coverPath = await uploadCover(form.coverFile!, tenantId, createdRoom.id, false);
        const { data: completed, error: updateError } = await db
          .from("hotel_rooms")
          .update({ cover_image_path: coverPath })
          .eq("id", createdRoom.id)
          .select("*")
          .single();
        if (updateError) throw updateError;
        return completed as HotelRoom;
      } catch (uploadError) {
        if (coverPath) await supabase.storage.from(IMAGE_BUCKET).remove([coverPath]);
        await db.from("hotel_rooms").delete().eq("id", createdRoom.id);
        throw uploadError;
      }
    },
    onSuccess: (savedRoom) => {
      onSaved(savedRoom);
      toast.success(isEdit ? "Logement mis à jour" : "Logement ajouté");
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const applyFile = (file: File) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.type))
      return toast.error("Formats acceptés : JPG, PNG et WebP.");
    if (file.size > MAX_IMAGE_SIZE) return toast.error("La photo ne doit pas dépasser 5 Mo.");
    setForm((current) => ({ ...current, coverFile: file }));
    setPreviewUrl((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  };
  const fileChanged = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) applyFile(file);
    event.target.value = "";
  };
  const removeFile = () => {
    setForm((current) => ({ ...current, coverFile: null }));
    setPreviewUrl((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return image;
    });
  };
  const [dragActive, setDragActive] = useState(false);
  const dropzoneKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  };
  const dropFile = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) applyFile(file);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (Object.keys(errors).length) return;
    save.mutate();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="grid h-[calc(100dvh-1.5rem)] max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.25rem)] max-w-[calc(100vw-1.25rem)] grid-rows-[auto_1fr] gap-0 overflow-hidden rounded-2xl p-0 sm:h-auto sm:max-h-[min(640px,90vh)] sm:w-full sm:max-w-lg sm:rounded-[24px]">
        <DialogHeader className="border-b p-3.5 pb-3 sm:p-5 sm:pb-3">
          <DialogTitle>{isEdit ? "Modifier le logement" : "Ajouter un logement"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-rows-[1fr_auto] overflow-hidden">
          <div className="space-y-3.5 overflow-y-auto p-3.5 sm:p-5">
            <div>
              <Label text="Photo de couverture" required />
              <div
                role="button"
                tabIndex={save.isPending ? -1 : 0}
                aria-label="Sélectionner une photo de couverture"
                onClick={() => !save.isPending && inputRef.current?.click()}
                onKeyDown={dropzoneKeyDown}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!save.isPending) setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(event) => (save.isPending ? event.preventDefault() : dropFile(event))}
                className={cn(
                  "group relative mt-1.5 flex aspect-video w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed text-muted-foreground transition",
                  dragActive
                    ? "border-[#B89236] bg-[#B89236]/10"
                    : "border-border bg-muted/30 hover:border-[#B89236] hover:bg-[#B89236]/5",
                  save.isPending && "pointer-events-none opacity-60",
                )}
              >
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="Aperçu" className="size-full object-cover" />
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeFile();
                      }}
                      disabled={save.isPending}
                      aria-label="Supprimer la photo sélectionnée"
                      className="absolute right-2.5 top-2.5 grid size-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80"
                    >
                      <X className="size-4" />
                    </button>
                    <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                      <ImagePlus className="size-3.5" />
                      Changer la photo
                    </span>
                  </>
                ) : (
                  <div className="px-4 text-center">
                    <div className="mx-auto grid size-11 place-items-center rounded-full bg-[#B89236]/10 text-[#B89236]">
                      <ImagePlus className="size-6" />
                    </div>
                    <p className="mt-2.5 text-sm font-semibold text-foreground">
                      Glissez-déposez une photo ou cliquez pour sélectionner
                    </p>
                    <p className="mt-1 text-[11px]">Formats acceptés : JPG, PNG, WebP</p>
                    <p className="text-[11px]">Taille max. 5 Mo · Ratio recommandé 16:9 (ex. 1600×900)</p>
                  </div>
                )}
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={fileChanged}
                className="hidden"
              />
              {form.coverFile && (
                <p className="mt-1.5 truncate text-[11px] text-muted-foreground">
                  Fichier sélectionné : {form.coverFile.name}
                </p>
              )}
              {attempted && errors.photo && <FieldError text={errors.photo} />}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label text="Nom du logement" required />
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Suite 201"
                  disabled={save.isPending}
                  className={fieldClass(attempted && Boolean(errors.name))}
                />
                {attempted && errors.name && <FieldError text={errors.name} />}
              </div>
              <div>
                <Label text="Tarif par nuit" required />
                <div className="relative">
                  <input
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0"
                    disabled={save.isPending}
                    className={cn(fieldClass(attempted && Boolean(errors.price)), "pr-16")}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                    FCFA
                  </span>
                </div>
                {attempted && errors.price && <FieldError text={errors.price} />}
              </div>
              <div>
                <Label text="Statut" required />
                <FormSelect
                  value={form.status}
                  onChange={(value) => setForm({ ...form, status: value as RoomStatus })}
                  disabled={save.isPending}
                  options={STATUS_OPTIONS}
                />
              </div>
              <div>
                <Label text="Type de logement" required />
                <FormSelect
                  value={form.propertyType}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      propertyType: value,
                      roomCount: value === "studio" ? "1" : form.roomCount,
                    })
                  }
                  disabled={save.isPending}
                  options={[["", "Sélectionner…"], ...PROPERTY_TYPE_OPTIONS]}
                />
                {attempted && errors.propertyType && <FieldError text={errors.propertyType} />}
              </div>
              <div>
                <Label text="Nombre de pièces" required />
                <input
                  value={form.roomCount}
                  onChange={(e) => setForm({ ...form, roomCount: e.target.value })}
                  type="number"
                  min="1"
                  max="99"
                  step="1"
                  placeholder="Ex : 10"
                  disabled={save.isPending || form.propertyType === "studio"}
                  className={fieldClass(attempted && Boolean(errors.roomCount))}
                />
                {attempted && errors.roomCount && <FieldError text={errors.roomCount} />}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 border-t p-3.5 sm:p-5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={save.isPending}
              className="w-full rounded-xl sm:w-auto"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={save.isPending}
              className="w-full rounded-xl bg-[#B89236] text-white hover:bg-[#9D7927] sm:w-auto"
            >
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Mettre à jour" : "Ajouter le logement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function fieldClass(hasError: boolean) {
  return cn(
    "mt-2 h-11 w-full rounded-xl border bg-background px-3.5 text-sm outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60",
    hasError
      ? "border-destructive focus:border-destructive focus:ring-destructive/15"
      : "focus:border-[#B89236] focus:ring-[#B89236]/15",
  );
}

function FieldError({ text }: { text: string }) {
  return <p className="mt-1.5 text-xs text-destructive">{text}</p>;
}

function FormSelect({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(fieldClass(false), "appearance-none pr-9")}
      >
        {options.map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <label className="text-xs font-semibold text-foreground">
      {text}
      {required && <span className="ml-1 text-destructive">*</span>}
    </label>
  );
}

function RoomDetails({
  room,
  image,
  reservations,
  guests,
  onClose,
  onEdit,
}: {
  room: HotelRoom | null;
  image?: string;
  reservations: Reservation[];
  guests: Guest[];
  onClose: () => void;
  onEdit?: () => void;
}) {
  if (!room) return null;
  const meta = statusMeta[room.status as RoomStatus] ?? {
    label: room.status,
    className: "bg-muted text-muted-foreground",
  };
  const today = new Date().toISOString().slice(0, 10);
  const roomReservations = reservations.filter((r) => r.room_id === room.id);
  const upcoming = roomReservations.filter((r) => r.check_out >= today && !["cancelled", "no_show", "checked_out"].includes(r.status));
  const history = roomReservations.filter((r) => r.check_out < today || r.status === "checked_out").sort((a, b) => b.check_out.localeCompare(a.check_out));
  const guestName = (id: string | null) => { const guest = guests.find((g) => g.id === id); return guest ? `${guest.first_name} ${guest.last_name}` : "Client de passage"; };
  const amenities = Array.from(new Set([...(room.hotel_room_types?.amenities ?? []), ...(room.amenities ?? [])]));
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[24px] p-0 sm:max-w-3xl">
        <div className="relative aspect-[21/9] overflow-hidden rounded-t-[24px] bg-gradient-to-br from-[#D8C99E] to-[#53665D]">
          {image ? (
            <img src={image} alt={room.number} className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center">
              <BedDouble className="size-16 text-white/60" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute bottom-5 left-6 text-white">
            <p className="text-xs uppercase tracking-[.2em] text-white/70">Détail du logement</p>
            <h2 className="mt-1 text-2xl font-semibold">{room.number}</h2>
          </div>
        </div>
        <div className="grid gap-5 p-6 sm:grid-cols-3">
          <Detail label="Tarif par nuit" value={formatCurrency(Number(room.rate))} />
          <Detail label="Type" value={room.hotel_room_types?.name ?? "Non défini"} />
          <Detail label="Capacité" value={`${room.capacity} personne${room.capacity > 1 ? "s" : ""}`} />
          {room.property_type && (
            <Detail label="Type de logement" value={PROPERTY_TYPE_LABELS[room.property_type] ?? room.property_type} />
          )}
          {room.room_count != null && (
            <Detail label="Nombre de pièces" value={`${room.room_count} pièce${room.room_count > 1 ? "s" : ""}`} />
          )}
          <div>
            <p className="text-xs text-muted-foreground">Statut</p>
            <span
              className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${meta.className}`}
            >
              {meta.label}
            </span>
          </div>
          <Detail label="Date de création" value={formatDate(room.created_at)} />
          <Detail label="Dernière modification" value={formatDate(room.updated_at)} />
        </div>
        <div className="space-y-5 border-t px-6 py-5">
          <DetailSection title="Description"><p className="text-sm text-muted-foreground">Aucune description enregistrée.</p></DetailSection>
          <DetailSection title="Équipements">{amenities.length ? <div className="flex flex-wrap gap-2">{amenities.map((item) => <span key={item} className="rounded-md bg-muted px-2 py-1 text-xs">{item}</span>)}</div> : <p className="text-sm text-muted-foreground">Aucun équipement enregistré.</p>}</DetailSection>
          <ReservationList title="Prochaines réservations" rows={upcoming} guestName={guestName} empty="Aucune réservation à venir." />
          <ReservationList title="Historique des séjours" rows={history} guestName={guestName} empty="Aucun séjour antérieur." />
          <DetailSection title="Maintenance et nettoyage"><p className="text-sm text-muted-foreground">Aucun historique dédié n’est disponible dans les données existantes.</p></DetailSection>
        </div>
        <div className="flex justify-end gap-2 border-t p-5">
          <Button variant="ghost" onClick={onClose}>
            Fermer
          </Button>
          {onEdit && (
            <Button
              onClick={onEdit}
              className="rounded-xl bg-[#B89236] text-white hover:bg-[#9D7927]"
            >
              <Pencil className="size-4" />
              Modifier
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
function DetailSection({ title, children }: { title: string; children: ReactNode }) { return <section><h3 className="mb-2 text-sm font-semibold text-[#102A43] dark:text-white">{title}</h3>{children}</section>; }
function ReservationList({ title, rows, guestName, empty }: { title: string; rows: Reservation[]; guestName: (id: string | null) => string; empty: string }) { return <DetailSection title={title}>{rows.length ? <div className="divide-y rounded-lg border">{rows.slice(0, 6).map((r) => <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs"><div><p className="font-medium">{guestName(r.guest_id)}</p><p className="text-muted-foreground">{formatDate(r.check_in)} → {formatDate(r.check_out)}</p></div><span className="font-semibold">{formatCurrency(Number(r.nightly_rate))}</span></div>)}</div> : <p className="text-sm text-muted-foreground">{empty}</p>}</DetailSection>; }
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
