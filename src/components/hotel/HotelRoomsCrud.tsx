import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  BedDouble,
  CalendarPlus,
  ChevronDown,
  Eye,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/mms/AppShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  amenities: string[];
  hotel_room_types?: { name: string; amenities: string[] } | null;
};

type Reservation = {
  id: string; room_id: string; guest_id: string | null; check_in: string; check_out: string;
  status: string; nightly_rate: number; created_at: string;
};
type Guest = { id: string; first_name: string; last_name: string };

type RoomForm = { name: string; price: string; status: RoomStatus; coverFile: File | null };
const emptyForm: RoomForm = { name: "", price: "", status: "available", coverFile: null };
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
    className:
      "bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-400/10 dark:text-amber-300",
  },
  cleaning: { label: "Nettoyage", className: "bg-sky-50 text-sky-700 ring-sky-600/15" },
  maintenance: { label: "Maintenance", className: "bg-orange-50 text-orange-700 ring-orange-600/15" },
  out_of_service: { label: "Hors service", className: "bg-slate-100 text-slate-700 ring-slate-500/15" },
};
const reservedMeta = { label: "Réservé", className: "bg-violet-50 text-violet-700 ring-violet-600/15" };

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
  const canCreate = useActionPermission("hotel.rooms.create");
  const canUpdate = useActionPermission("hotel.rooms.update");
  const canDelete = useActionPermission("hotel.rooms.delete");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | RoomStatus | "reserved">("all");
  const [type, setType] = useState("all");
  const [floor, setFloor] = useState("all");
  const [sort, setSort] = useState<"name" | "price">("name");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HotelRoom | null>(null);
  const [viewing, setViewing] = useState<HotelRoom | null>(null);
  const [deleting, setDeleting] = useState<HotelRoom | null>(null);

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

  const activeReservationRoomIds = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return new Set((contextQuery.data?.reservations ?? []).filter((r) =>
      ["pending", "confirmed"].includes(r.status) && r.check_in >= today,
    ).map((r) => r.room_id));
  }, [contextQuery.data]);
  const roomTypes = useMemo(() => Array.from(new Set((roomsQuery.data ?? []).map((r) => r.hotel_room_types?.name).filter(Boolean) as string[])).sort(), [roomsQuery.data]);
  const roomFloor = (room: HotelRoom) => room.number.match(/\d+/)?.[0]?.slice(0, -2) || "—";
  const floors = useMemo(() => Array.from(new Set((roomsQuery.data ?? []).map(roomFloor))).sort(), [roomsQuery.data]);

  const rooms = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return (roomsQuery.data ?? [])
      .filter((room) => status === "all" || (status === "reserved" ? activeReservationRoomIds.has(room.id) : room.status === status))
      .filter((room) => type === "all" || room.hotel_room_types?.name === type)
      .filter((room) => floor === "all" || roomFloor(room) === floor)
      .filter((room) => !normalized || room.number.toLocaleLowerCase("fr").includes(normalized))
      .sort((a, b) =>
        sort === "price"
          ? Number(a.rate) - Number(b.rate)
          : a.number.localeCompare(b.number, "fr", { numeric: true }),
      );
  }, [activeReservationRoomIds, floor, query, roomsQuery.data, sort, status, type]);

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

  return (
    <AppShell
      title="Logements"
      subtitle="Gérez vos chambres et résidences avec élégance."
      actions={
        canCreate ? (
          <Button
            onClick={openCreate}
            className="rounded-xl bg-[#B89236] text-white shadow-lg shadow-amber-950/10 hover:bg-[#9D7927]"
          >
            <Plus className="size-4" />
            Ajouter un logement
          </Button>
        ) : null
      }
    >
      <section className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {([
          ["Total", roomsQuery.data?.length ?? 0, BedDouble],
          ["Disponibles", (roomsQuery.data ?? []).filter((r) => r.status === "available" && !activeReservationRoomIds.has(r.id)).length, Eye],
          ["Occupés", (roomsQuery.data ?? []).filter((r) => r.status === "occupied").length, Users],
          ["Réservés", activeReservationRoomIds.size, CalendarPlus],
          ["Nettoyage", (roomsQuery.data ?? []).filter((r) => r.status === "cleaning").length, SlidersHorizontal],
          ["Maintenance", (roomsQuery.data ?? []).filter((r) => ["maintenance", "out_of_service"].includes(r.status)).length, Wrench],
        ] as const).map(([label, value, Icon]) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-[#D8C99E]/45 bg-card px-3 py-3 shadow-sm">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#102A43] text-[#E2C66E]"><Icon className="size-4" /></div>
            <div><p className="text-xl font-bold leading-none text-[#102A43] dark:text-white">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{label}</p></div>
          </div>
        ))}
      </section>

      <div className="mt-4 flex flex-wrap gap-2 rounded-xl border bg-card p-2 shadow-sm">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un logement…"
            className="h-10 w-full rounded-lg border bg-background pl-10 pr-4 text-sm outline-none focus:border-[#B89236] focus:ring-2 focus:ring-[#B89236]/15"
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
        <FilterSelect value={floor} onChange={setFloor} options={[["all", "Tous les étages"], ...floors.map((v) => [v, v === "—" ? "Étage non défini" : `Étage ${v}`])]} />
        <FilterSelect
          value={sort}
          onChange={(value) => setSort(value as typeof sort)}
          options={[
            ["name", "Trier par nom"],
            ["price", "Trier par tarif"],
          ]}
        />
      </div>

      {roomsQuery.isLoading ? (
        <div className="grid min-h-72 place-items-center">
          <Loader2 className="size-7 animate-spin text-[#B89236]" />
        </div>
      ) : rooms.length ? (
        <div className="mt-4 overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1050px] text-sm"><thead className="bg-[#102A43] text-white"><tr>{["Photo", "Nom ou numéro", "Type", "Prix par nuit", "Capacité", "Statut", "État ménage", "Actions"].map((h) => <th key={h} className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide">{h}</th>)}</tr></thead><tbody className="divide-y">
          {rooms.map((room) => (
            <RoomRow
              key={room.id}
              room={room}
              image={imageFor(room)}
              reserved={activeReservationRoomIds.has(room.id)}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onView={() => setViewing(room)}
              onEdit={() => openEdit(room)}
              onReserve={() => void navigate({ to: "/hotel/reservations" })}
              onBlock={() => changeRoomStatus.mutate({ room, status: room.status === "out_of_service" ? "available" : "out_of_service" })}
              onDelete={() => setDeleting(room)}
            />
          ))}</tbody></table></div>
          <div className="divide-y md:hidden">{rooms.map((room) => <RoomMobileCard key={room.id} room={room} image={imageFor(room)} reserved={activeReservationRoomIds.has(room.id)} canUpdate={canUpdate} canDelete={canDelete} onView={() => setViewing(room)} onEdit={() => openEdit(room)} onReserve={() => void navigate({ to: "/hotel/reservations" })} onBlock={() => changeRoomStatus.mutate({ room, status: room.status === "out_of_service" ? "available" : "out_of_service" })} onDelete={() => setDeleting(room)} />)}</div>
        </div>
      ) : (
        <EmptyState
          filtered={Boolean(query || status !== "all" || type !== "all" || floor !== "all")}
          canCreate={canCreate}
          onCreate={openCreate}
        />
      )}

      <RoomFormDialog
        open={formOpen}
        room={editing}
        image={editing ? imageFor(editing) : undefined}
        tenantId={tenantId}
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
    </AppShell>
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

function RoomThumbnail({ room, image }: { room: HotelRoom; image?: string }) {
  return image ? <img src={image} alt="" className="size-12 rounded-lg object-cover" /> : <div className="grid size-12 place-items-center rounded-lg bg-[#102A43]/10 text-[#102A43]"><BedDouble className="size-5" /></div>;
}

type ManageRoomProps = { room: HotelRoom; image?: string; reserved: boolean; canUpdate: boolean; canDelete: boolean; onView: () => void; onEdit: () => void; onReserve: () => void; onBlock: () => void; onDelete: () => void };
function RoomActions({ canUpdate, canDelete, onView, onEdit, onReserve, onDelete }: Omit<ManageRoomProps, "image" | "reserved">) {
  const button = "inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground";
  return <div className="flex flex-wrap items-center gap-1">
    <button className={button} onClick={onView}><Eye className="size-3.5" />Voir</button>
    {canUpdate && <button className={button} onClick={onEdit}><Pencil className="size-3.5" />Modifier</button>}
    <button className={button} onClick={onReserve}><CalendarPlus className="size-3.5" />Réserver</button>
    {canDelete && <button className={`${button} hover:text-destructive`} onClick={onDelete}><Trash2 className="size-3.5" />Supprimer</button>}
  </div>;
}

function RoomRow(props: ManageRoomProps) {
  const { room, image, reserved } = props; const meta = effectiveMeta(room, reserved);
  return <tr className="hover:bg-muted/30">
    <td className="px-3 py-2"><RoomThumbnail room={room} image={image} /></td>
    <td className="px-3 py-2 font-semibold text-[#102A43] dark:text-white">{room.number}</td>
    <td className="px-3 py-2 text-muted-foreground">{room.hotel_room_types?.name ?? "—"}</td>
    <td className="px-3 py-2 font-medium">{formatCurrency(Number(room.rate))}</td>
    <td className="px-3 py-2"><span className="inline-flex items-center gap-1"><Users className="size-3.5 text-muted-foreground" />{room.capacity}</span></td>
    <td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${meta.className}`}>{meta.label}</span></td>
    <td className="px-3 py-2 text-xs text-muted-foreground">{room.status === "cleaning" ? "À nettoyer" : "—"}</td>
    <td className="px-3 py-2"><RoomActions {...props} /></td>
  </tr>;
}

function RoomMobileCard(props: ManageRoomProps) {
  const { room, image, reserved } = props; const meta = effectiveMeta(room, reserved);
  return <article className="p-3"><div className="flex gap-3"><RoomThumbnail room={room} image={image} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h3 className="font-semibold text-[#102A43] dark:text-white">{room.number}</h3><p className="text-xs text-muted-foreground">{room.hotel_room_types?.name ?? "Type non défini"} · {room.capacity} pers.</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ring-1 ${meta.className}`}>{meta.label}</span></div><p className="mt-1 text-sm font-semibold text-[#9D7927]">{formatCurrency(Number(room.rate))} <span className="text-[10px] font-normal text-muted-foreground">/ nuit</span></p></div></div><div className="mt-2 border-t pt-2"><RoomActions {...props} /></div></article>;
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
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  room: HotelRoom | null;
  image?: string;
  tenantId?: string;
  onOpenChange: (open: boolean) => void;
  onSaved: (room: HotelRoom) => void;
}) {
  const [form, setForm] = useState<RoomForm>(emptyForm);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(image);
  const inputRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(room);
  const reset = () =>
    setForm(
      room
        ? {
            name: room.number,
            price: String(room.rate),
            status: room.status as RoomStatus,
            coverFile: null,
          }
        : emptyForm,
    );
  useEffect(() => {
    if (open) {
      reset();
      setPreviewUrl(image);
    }
  }, [open, room, image]);
  useEffect(
    () => () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );
  const save = useMutation({
    mutationFn: async () => {
      const name = form.name.trim();
      const price = Number(form.price);
      if (!name) throw new Error("Le nom du logement est obligatoire.");
      if (!Number.isFinite(price) || price <= 0)
        throw new Error("Le tarif doit être supérieur à 0.");
      if (!room && !form.coverFile) throw new Error("La photo de couverture est obligatoire.");
      if (!tenantId) throw new Error("Aucun établissement actif.");
      const payload = { number: name, rate: price, status: form.status };
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
        .insert({ ...payload, tenant_id: tenantId, capacity: 1 })
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
  const fileChanged = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.has(file.type))
      return toast.error("Formats acceptés : JPG, PNG et WebP.");
    if (file.size > MAX_IMAGE_SIZE) return toast.error("La photo ne doit pas dépasser 5 Mo.");
    setForm((current) => ({ ...current, coverFile: file }));
    setPreviewUrl((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[24px] p-0 sm:max-w-xl">
        <DialogHeader className="border-b p-6 pb-4">
          <DialogTitle>{isEdit ? "Modifier le logement" : "Ajouter un logement"}</DialogTitle>
          <DialogDescription>
            Renseignez les informations essentielles du logement.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
          className="space-y-5 p-6 pt-1"
        >
          <div>
            <Label text="Photo de couverture" required />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="relative mt-2 grid aspect-[16/7] w-full place-items-center overflow-hidden rounded-2xl border border-dashed bg-muted/30 text-muted-foreground transition hover:border-[#B89236] hover:bg-[#B89236]/5"
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Aperçu" className="size-full object-cover" />
              ) : (
                <div className="text-center">
                  <ImagePlus className="mx-auto size-7" />
                  <p className="mt-2 text-sm font-medium">Choisir une photo</p>
                  <p className="text-xs">JPG, PNG ou WebP · 5 Mo max.</p>
                </div>
              )}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={fileChanged}
              className="hidden"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label text="Nom du logement" required />
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Suite 201"
                className="field-input"
              />
            </div>
            <div>
              <Label text="Tarif" required />
              <div className="relative">
                <input
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0"
                  className="field-input pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  FCFA
                </span>
              </div>
            </div>
            <div>
              <Label text="Statut" required />
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as RoomStatus })}
                className="field-input"
              >
                <option value="available">Disponible</option>
                <option value="occupied">Occupé</option>
                <option value="cleaning">Nettoyage</option>
                <option value="maintenance">Maintenance</option>
                <option value="out_of_service">Hors service</option>
              </select>
            </div>
          </div>
          <DialogFooter className="border-t pt-5">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={save.isPending}
              className="rounded-xl bg-[#B89236] text-white hover:bg-[#9D7927]"
            >
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
        <div className="relative h-44 bg-gradient-to-br from-[#D8C99E] to-[#53665D]">
          {image ? (
            <img src={image} alt={room.number} className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center">
              <BedDouble className="size-16 text-white/60" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-5 left-6 text-white">
            <p className="text-xs uppercase tracking-[.2em] text-white/70">Détail du logement</p>
            <h2 className="mt-1 text-2xl font-semibold">{room.number}</h2>
          </div>
        </div>
        <div className="grid gap-5 p-6 sm:grid-cols-3">
          <Detail label="Tarif par nuit" value={formatCurrency(Number(room.rate))} />
          <Detail label="Type" value={room.hotel_room_types?.name ?? "Non défini"} />
          <Detail label="Capacité" value={`${room.capacity} personne${room.capacity > 1 ? "s" : ""}`} />
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
