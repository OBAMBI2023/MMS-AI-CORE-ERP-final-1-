import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, addMonths, addWeeks, format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { BedDouble, CalendarDays, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/mms/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";
import { calendarPeriod, isoDay, periodTitle, reservationForDay, type CalendarReservation, type HotelCalendarView } from "@/lib/hotel-calendar";

const db = supabase as any;
const IMAGE_BUCKET = "hotel-room-images";
type Room = { id: string; tenant_id: string; number: string; status: string; cover_image_path: string | null; hotel_room_types?: { name: string } | null };
type Reservation = CalendarReservation & { guest?: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null };
const statusStyle: Record<string, string> = { confirmed: "bg-blue-500", pending: "bg-orange-500", checked_in: "bg-emerald-500", completed: "bg-slate-400", checked_out: "bg-slate-400" };
const statusLabel: Record<string, string> = { confirmed: "Confirmée", pending: "En attente", checked_in: "En séjour", completed: "Séjour terminé — Logement disponible", checked_out: "Séjour terminé — Logement disponible" };

function guestName(reservation: Reservation) {
  const guest = Array.isArray(reservation.guest) ? reservation.guest[0] : reservation.guest;
  return guest ? `${guest.first_name} ${guest.last_name}` : "Client de passage";
}

export function HotelCalendarPage() {
  const { profile } = useTenant();
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [view, setView] = useState<HotelCalendarView>("month");
  const [date, setDate] = useState(() => new Date());
  const [type, setType] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [search, setSearch] = useState("");
  const [viewingRoom, setViewingRoom] = useState<Room | null>(null);
  const period = useMemo(() => calendarPeriod(date, view), [date, view]);
  const start = isoDay(period.start);
  const end = isoDay(period.endExclusive);

  const roomsQuery = useQuery({
    queryKey: ["hotel-calendar-rooms", tenantId], enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await db.from("hotel_rooms").select("id,tenant_id,number,status,cover_image_path,hotel_room_types(name)").eq("tenant_id", tenantId).order("number");
      if (error) throw error;
      return (data ?? []) as Room[];
    },
  });
  const reservationsQuery = useQuery({
    queryKey: ["hotel-calendar-reservations", tenantId, start, end], enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await db.from("hotel_reservations")
        .select("id,tenant_id,room_id,guest_id,check_in,check_out,status,guest:hotel_guests!hotel_reservations_guest_id_tenant_id_fkey(first_name,last_name)")
        .eq("tenant_id", tenantId).lt("check_in", end).gt("check_out", start)
        .in("status", ["pending", "confirmed", "checked_in"]);
      if (error) throw error;
      return (data ?? []) as Reservation[];
    },
  });
  const imageQuery = useQuery({
    queryKey: ["hotel-calendar-cover-urls", tenantId, roomsQuery.data?.map((room) => room.cover_image_path)],
    enabled: Boolean(tenantId && roomsQuery.data),
    queryFn: async () => {
      const paths = (roomsQuery.data ?? []).map((room) => room.cover_image_path).filter((path): path is string => Boolean(path));
      if (!paths.length) return {} as Record<string, string>;
      const signed = await Promise.all(paths.map(async (path) => {
        const { data, error } = await supabase.storage.from(IMAGE_BUCKET).createSignedUrl(path, 3600, { transform: { width: 160, height: 160, resize: "cover" } });
        if (error) throw error;
        return [path, data.signedUrl] as const;
      }));
      return Object.fromEntries(signed) as Record<string, string>;
    },
  });

  useEffect(() => {
    if (!tenantId) return;
    const refresh = () => void qc.invalidateQueries({ queryKey: ["hotel-calendar-reservations", tenantId] });
    const channel = supabase.channel(`hotel-calendar-${tenantId}`).on("postgres_changes", { event: "*", schema: "public", table: "hotel_reservations", filter: `tenant_id=eq.${tenantId}` }, refresh).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [qc, tenantId]);

  const reservations = reservationsQuery.data ?? [];
  const normalized = search.trim().toLocaleLowerCase("fr");
  const types = useMemo(() => Array.from(new Set((roomsQuery.data ?? []).map((room) => room.hotel_room_types?.name).filter(Boolean) as string[])).sort(), [roomsQuery.data]);
  const rooms = (roomsQuery.data ?? []).filter((room) => {
    const roomReservations = reservations.filter((reservation) => reservation.room_id === room.id);
    const haystack = `${room.number} ${room.hotel_room_types?.name ?? ""} ${roomReservations.map(guestName).join(" ")}`.toLocaleLowerCase("fr");
    const occupied = roomReservations.length > 0;
    return (type === "all" || room.hotel_room_types?.name === type) && (availability === "all" || (availability === "occupied") === occupied) && haystack.includes(normalized);
  });
  const imageFor = (room: Room) => room.cover_image_path ? imageQuery.data?.[room.cover_image_path] : undefined;
  const move = (amount: number) => setDate((current) => view === "month" ? addMonths(current, amount) : addWeeks(current, amount));
  const openReservation = (reservation: Reservation) => void navigate({ to: "/hotel/reservations", search: { reservation: reservation.id } as never });
  const createReservation = (room: Room, day: string) => void navigate({ to: "/hotel/reservations", search: { room: room.id, date: day } as never });

  return <AppShell title="Calendrier" subtitle="Occupation et disponibilités par logement">
    <section className="hotel-panel space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="icon" variant="outline" onClick={() => move(-1)} aria-label="Période précédente"><ChevronLeft className="size-4" /></Button>
        <Button variant="outline" onClick={() => setDate(new Date())}>Aujourd’hui</Button>
        <Button size="icon" variant="outline" onClick={() => move(1)} aria-label="Période suivante"><ChevronRight className="size-4" /></Button>
        <h2 className="min-w-52 flex-1 font-semibold capitalize">{periodTitle(date, view)}</h2>
        <div className="flex rounded-lg border p-1"><Button size="sm" variant={view === "month" ? "default" : "ghost"} onClick={() => setView("month")}>Mois</Button><Button size="sm" variant={view === "week" ? "default" : "ghost"} onClick={() => setView("week")}>Semaine</Button></div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-[180px_180px_1fr]">
        <select className="field-input" value={type} onChange={(event) => setType(event.target.value)}><option value="all">Tous les logements</option>{types.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <select className="field-input" value={availability} onChange={(event) => setAvailability(event.target.value)}><option value="all">Toute disponibilité</option><option value="available">Disponible</option><option value="occupied">Occupé</option></select>
        <label className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input className="field-input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un logement ou un client" /></label>
      </div>
      <div className="hidden overflow-x-auto rounded-xl border md:block">
        <div className="min-w-max" style={{ display: "grid", gridTemplateColumns: `240px repeat(${period.days.length}, 42px)` }}>
          <div className="sticky left-0 z-20 border-b border-r bg-card p-3 text-xs font-semibold">Logement</div>
          {period.days.map((day) => <div key={isoDay(day)} className={`border-b border-r p-1 text-center text-[10px] ${isSameDay(day, new Date()) ? "bg-primary/10 font-bold" : "bg-muted/30"}`}><span className="block capitalize">{format(day, "EE", { locale: fr }).slice(0, 2)}</span><span className="text-xs">{format(day, "d")}</span></div>)}
          {rooms.map((room) => <Row key={room.id} room={room} days={period.days} reservations={reservations} image={imageFor(room)} onRoom={() => setViewingRoom(room)} onReservation={openReservation} onAvailable={createReservation} />)}
        </div>
      </div>
      <div className="space-y-3 md:hidden">{rooms.map((room) => <MobileCard key={room.id} room={room} days={period.days} reservations={reservations} image={imageFor(room)} onRoom={() => setViewingRoom(room)} onReservation={openReservation} onAvailable={createReservation} />)}</div>
      {(roomsQuery.isLoading || reservationsQuery.isLoading) && <p className="py-8 text-center text-sm text-muted-foreground">Chargement du calendrier…</p>}
      {!roomsQuery.isLoading && !rooms.length && <p className="py-8 text-center text-sm text-muted-foreground">Aucun logement ne correspond aux filtres.</p>}
    </section>
    <Dialog open={Boolean(viewingRoom)} onOpenChange={(open) => !open && setViewingRoom(null)}><DialogContent className="overflow-hidden p-0 sm:max-w-lg"><DialogHeader className="sr-only"><DialogTitle>Détail du logement</DialogTitle></DialogHeader>{viewingRoom && <><div className="relative h-64 bg-muted">{imageFor(viewingRoom) ? <img src={imageFor(viewingRoom)} alt={viewingRoom.number} className="size-full object-cover" /> : <div className="grid size-full place-items-center"><BedDouble className="size-16 text-muted-foreground" /></div>}<button className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white" onClick={() => setViewingRoom(null)} aria-label="Fermer"><X className="size-4" /></button></div><div className="p-5"><h3 className="text-xl font-semibold">{viewingRoom.number}</h3><p className="text-sm text-muted-foreground">{viewingRoom.hotel_room_types?.name ?? "Type non défini"}</p></div></>}</DialogContent></Dialog>
  </AppShell>;
}

type RowProps = { room: Room; days: Date[]; reservations: Reservation[]; image?: string; onRoom: () => void; onReservation: (reservation: Reservation) => void; onAvailable: (room: Room, day: string) => void };
function Row({ room, days, reservations, image, onRoom, onReservation, onAvailable }: RowProps) {
  return <><button onClick={onRoom} className="sticky left-0 z-10 flex items-center gap-3 border-b border-r bg-card p-2 text-left"><RoomImage room={room} image={image} /><span><strong className="block text-sm">{room.number}</strong><small className="block max-w-32 truncate text-muted-foreground">{room.hotel_room_types?.name ?? "Type non défini"}</small></span></button>{days.map((date) => { const day = isoDay(date); const reservation = reservationForDay(reservations, room.id, day) as Reservation | undefined; return <button key={day} onClick={() => reservation ? onReservation(reservation) : onAvailable(room, day)} title={reservation ? `${guestName(reservation)} · ${reservation.check_in} → ${reservation.check_out} · ${statusLabel[reservation.status]}` : `Disponible le ${day}`} className={`h-16 border-b border-r ${reservation ? `${statusStyle[reservation.status]} text-white` : "bg-emerald-50/40 hover:bg-emerald-100 dark:bg-emerald-950/10"}`} aria-label={reservation ? `Réservation de ${guestName(reservation)}` : `${room.number} disponible le ${day}`}>{reservation && day === reservation.check_in && <span className="block truncate px-1 text-[9px] font-semibold">{guestName(reservation)}</span>}</button>; })}</>;
}
function MobileCard(props: RowProps) {
  return <article className="rounded-xl border bg-card p-3"><button onClick={props.onRoom} className="flex w-full items-center gap-3 text-left"><RoomImage room={props.room} image={props.image} /><span><strong className="block">{props.room.number}</strong><small className="text-muted-foreground">{props.room.hotel_room_types?.name ?? "Type non défini"}</small></span></button><div className="mt-3 flex gap-1 overflow-x-auto pb-1">{props.days.map((date) => { const day = isoDay(date); const reservation = reservationForDay(props.reservations, props.room.id, day) as Reservation | undefined; return <button key={day} onClick={() => reservation ? props.onReservation(reservation) : props.onAvailable(props.room, day)} className={`grid min-w-11 place-items-center rounded-lg px-1 py-2 text-xs ${reservation ? `${statusStyle[reservation.status]} text-white` : "bg-emerald-50 text-emerald-800"}`} title={reservation ? guestName(reservation) : "Disponible"}><span>{format(date, "EE", { locale: fr }).slice(0, 2)}</span><strong>{format(date, "d")}</strong></button>; })}</div></article>;
}
function RoomImage({ room, image }: { room: Room; image?: string }) { return image ? <img src={image} alt="" loading="lazy" width={48} height={48} className="size-12 shrink-0 rounded-lg object-cover" /> : <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-muted"><BedDouble className="size-5 text-muted-foreground" /></span>; }
