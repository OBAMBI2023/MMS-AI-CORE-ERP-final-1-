import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isToday,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, BedDouble } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { BLOCKING_RESERVATION_STATUSES, periodsOverlap } from "@/lib/hotel-availability";
import { getHotelReservationStatusLabel } from "@/lib/hotel-reservation-status";

const DAY_CELL_WIDTH = 36;
const ROOM_COL_WIDTH = 168;

export type CalendarRoom = {
  id: string;
  number: string;
  typeName: string | null;
};

export type CalendarReservation = {
  id: string;
  room_id: string;
  check_in: string;
  check_out: string;
  status: string;
  guest_id: string | null;
};

export type CalendarGuest = {
  id: string;
  first_name: string;
  last_name: string;
};

interface HotelAvailabilityCalendarProps {
  rooms: CalendarRoom[];
  reservations: CalendarReservation[];
  guestsById: Map<string, CalendarGuest>;
}

type Segment = {
  reservation: CalendarReservation;
  startIdx: number;
  endIdx: number;
  truncatedStart: boolean;
  truncatedEnd: boolean;
};

export function HotelAvailabilityCalendar({ rooms, reservations, guestsById }: HotelAvailabilityCalendarProps) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));

  const monthStart = useMemo(() => startOfMonth(viewMonth), [viewMonth]);
  const monthEnd = useMemo(() => endOfMonth(viewMonth), [viewMonth]);
  const days = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);
  const rangeStartIso = format(monthStart, "yyyy-MM-dd");
  const rangeEndIso = format(addMonths(monthStart, 1), "yyyy-MM-dd");

  const segmentsByRoom = useMemo(() => {
    const map = new Map<string, Segment[]>();
    for (const reservation of reservations) {
      if (!BLOCKING_RESERVATION_STATUSES.has(reservation.status)) continue;
      if (!periodsOverlap(reservation.check_in, reservation.check_out, rangeStartIso, rangeEndIso)) continue;
      const checkIn = parseISO(reservation.check_in);
      const checkOut = parseISO(reservation.check_out);
      const rawStart = differenceInCalendarDays(checkIn, monthStart);
      const rawEnd = differenceInCalendarDays(checkOut, monthStart);
      const startIdx = Math.max(0, rawStart);
      const endIdx = Math.min(days.length, rawEnd);
      if (endIdx <= startIdx) continue;
      const segment: Segment = {
        reservation,
        startIdx,
        endIdx,
        truncatedStart: rawStart < 0,
        truncatedEnd: rawEnd > days.length,
      };
      const list = map.get(reservation.room_id) ?? [];
      list.push(segment);
      map.set(reservation.room_id, list);
    }
    return map;
  }, [reservations, rangeStartIso, rangeEndIso, monthStart, days.length]);

  const gridTemplateColumns = `${ROOM_COL_WIDTH}px repeat(${days.length}, ${DAY_CELL_WIDTH}px)`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold flex items-center gap-2">
          <BedDouble className="h-4 w-4 text-primary" /> Disponibilité des logements
        </h3>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setViewMonth(startOfMonth(new Date()))}>
            Aujourd'hui
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setViewMonth((m) => subMonths(m, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[110px] text-center text-sm font-semibold capitalize">
            {format(viewMonth, "MMMM yyyy", { locale: fr })}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setViewMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {rooms.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Aucun logement enregistré.</p>
      ) : (
        <div className="max-h-[420px] overflow-auto rounded-2xl border border-border/60 sm:max-h-[480px]">
          <div className="grid" style={{ gridTemplateColumns }}>
            {/* Header */}
            <div className="sticky left-0 top-0 z-30 border-b border-r border-border/60 bg-muted/60 px-3 py-2 text-xs font-semibold text-muted-foreground">
              Logement
            </div>
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  "sticky top-0 z-20 border-b border-r border-border/40 py-2 text-center text-[10px] font-medium text-muted-foreground",
                  isToday(day) ? "bg-primary/10 text-primary font-bold" : "bg-muted/60",
                )}
              >
                <div className="capitalize">{format(day, "EEE", { locale: fr })}</div>
                <div>{format(day, "d")}</div>
              </div>
            ))}

            {/* Rows */}
            {rooms.map((room) => {
              const segments = segmentsByRoom.get(room.id) ?? [];
              return (
                <FragmentRow
                  key={room.id}
                  room={room}
                  segments={segments}
                  days={days}
                  guestsById={guestsById}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/25 border border-emerald-500/40" />
          Disponible
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-rose-400 to-rose-500" />
          Réservé
        </div>
      </div>
    </div>
  );
}

function FragmentRow({
  room,
  segments,
  days,
  guestsById,
}: {
  room: CalendarRoom;
  segments: Segment[];
  days: Date[];
  guestsById: Map<string, CalendarGuest>;
}) {
  return (
    <>
      <div className="sticky left-0 z-10 flex flex-col justify-center border-b border-r border-border/60 bg-card px-3 py-2 dark:bg-[#0F2E28]">
        <span className="truncate text-sm font-semibold">{room.number}</span>
        {room.typeName && <span className="truncate text-[11px] text-muted-foreground">{room.typeName}</span>}
      </div>
      <div
        className="relative grid border-b border-border/40"
        style={{ gridColumn: `2 / span ${days.length}`, gridTemplateColumns: `repeat(${days.length}, ${DAY_CELL_WIDTH}px)` }}
      >
        {days.map((day, i) => (
          <div
            key={day.toISOString()}
            style={{ gridColumn: i + 1, gridRow: 1 }}
            className={cn(
              "h-11 border-r border-border/30 bg-emerald-500/[0.06]",
              isToday(day) && "bg-primary/10",
            )}
          />
        ))}
        {segments.map((segment) => {
          const guest = segment.reservation.guest_id ? guestsById.get(segment.reservation.guest_id) : null;
          const guestName = guest ? `${guest.first_name} ${guest.last_name}`.trim() : "Client de passage";
          return (
            <HoverCard key={segment.reservation.id} openDelay={100} closeDelay={80}>
              <HoverCardTrigger asChild>
                <Link
                  to="/hotel/reservations"
                  search={{ reservation: segment.reservation.id } as never}
                  style={{ gridColumn: `${segment.startIdx + 1} / ${segment.endIdx + 1}`, gridRow: 1 }}
                  className={cn(
                    "z-10 my-1.5 flex items-center truncate bg-gradient-to-r from-rose-400 to-rose-500 px-2 text-[11px] font-medium text-white shadow-sm transition-transform hover:scale-[1.02]",
                    segment.truncatedStart ? "rounded-l-none" : "rounded-l-full",
                    segment.truncatedEnd ? "rounded-r-none" : "rounded-r-full",
                  )}
                >
                  <span className="truncate">{guestName}</span>
                </Link>
              </HoverCardTrigger>
              <HoverCardContent className="w-64 text-sm">
                <p className="font-semibold">{guestName}</p>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <p>Logement : {room.number}{room.typeName ? ` · ${room.typeName}` : ""}</p>
                  <p>Arrivée : {format(parseISO(segment.reservation.check_in), "dd MMM yyyy", { locale: fr })}</p>
                  <p>Départ : {format(parseISO(segment.reservation.check_out), "dd MMM yyyy", { locale: fr })}</p>
                  <p>Statut : {getHotelReservationStatusLabel(segment.reservation.status)}</p>
                </div>
              </HoverCardContent>
            </HoverCard>
          );
        })}
      </div>
    </>
  );
}



