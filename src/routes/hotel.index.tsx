import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Percent,
  BedDouble,
  LogIn,
  LogOut,
  CalendarPlus,
  DoorOpen,
  Wallet,
  Sparkles,
  Building2,
} from "lucide-react";
import { HotelAppShell } from "@/components/hotel/HotelAppShell";
import { Card } from "@/components/ui/card";
import { DashboardKpiCard } from "@/components/mms/dashboard/DashboardKpiCard";
import { formatCurrency } from "@/lib/mms/format";
import { cn } from "@/lib/utils";

type ActionColor = "primary" | "emerald" | "sky" | "amber";

const ACTION_COLOR_CLASSES: Record<ActionColor, string> = {
  primary: "bg-primary/10 text-primary",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

const QUICK_ACTIONS = [
  { title: "Nouvelle réservation", icon: CalendarPlus, route: "/hotel/reservations", color: "primary" as ActionColor },
  { title: "Walk-in", icon: DoorOpen, route: "/hotel/reservations", color: "emerald" as ActionColor },
  { title: "Check-in", icon: LogIn, route: "/hotel/checkin-checkout", color: "sky" as ActionColor },
  { title: "Check-out", icon: LogOut, route: "/hotel/checkin-checkout", color: "amber" as ActionColor },
];

const TODAY_RESERVATIONS = [
  { id: 1, name: "M. Diallo Mamadou", room: "Chambre 204", time: "14:00", status: "Confirmée" as const },
  { id: 2, name: "Mme Camara Aïssatou", room: "Chambre 108", time: "15:30", status: "En attente" as const },
  { id: 3, name: "M. Traoré Ibrahim", room: "Suite 302", time: "16:00", status: "Confirmée" as const },
  { id: 4, name: "Mme Bah Fatoumata", room: "Chambre 115", time: "18:00", status: "Confirmée" as const },
];

const RESERVATION_STATUS_CLASSES: Record<(typeof TODAY_RESERVATIONS)[number]["status"], string> = {
  Confirmée: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "En attente": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

type RoomStatus = "libre" | "occupee" | "nettoyage" | "maintenance" | "reservee";

const ROOM_STATUS_META: Record<RoomStatus, { label: string; className: string }> = {
  libre: { label: "Libre", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  occupee: { label: "Occupée", className: "bg-primary/15 text-primary" },
  nettoyage: { label: "Nettoyage", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  maintenance: { label: "Maintenance", className: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
  reservee: { label: "Réservée", className: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
};

const ROOM_GRID: { number: string; status: RoomStatus }[] = [
  { number: "101", status: "occupee" }, { number: "102", status: "libre" }, { number: "103", status: "nettoyage" },
  { number: "104", status: "occupee" }, { number: "105", status: "reservee" }, { number: "106", status: "libre" },
  { number: "107", status: "occupee" }, { number: "108", status: "reservee" }, { number: "109", status: "libre" },
  { number: "110", status: "occupee" }, { number: "111", status: "maintenance" }, { number: "112", status: "libre" },
  { number: "201", status: "occupee" }, { number: "202", status: "libre" }, { number: "203", status: "occupee" },
  { number: "204", status: "reservee" }, { number: "205", status: "nettoyage" }, { number: "206", status: "libre" },
  { number: "207", status: "occupee" }, { number: "208", status: "libre" }, { number: "209", status: "occupee" },
  { number: "210", status: "libre" }, { number: "211", status: "occupee" }, { number: "212", status: "libre" },
];

const HOUSEKEEPING_TASKS = [
  { id: 1, room: "Chambre 205", task: "Nettoyage complet", progress: 100 },
  { id: 2, room: "Chambre 111", task: "Maintenance plomberie", progress: 40 },
  { id: 3, room: "Chambre 103", task: "Nettoyage complet", progress: 65 },
  { id: 4, room: "Suite 302", task: "Préparation check-in", progress: 20 },
];

const CARD_CLASS = "rounded-[24px] dark:bg-[#0F2E28] dark:border-white/5";

function HotelDashboard() {
  const occupiedRooms = ROOM_GRID.filter((r) => r.status === "occupee").length;
  const totalRooms = ROOM_GRID.length;
  const occupancyRate = Math.round((occupiedRooms / totalRooms) * 100);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [],
  );

  return (
    <HotelAppShell title="Tableau de bord" subtitle="SAOVIA HOTEL" contentClassName="bg-[#F4FAF8] dark:bg-[#07211C]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="space-y-5 pb-4 sm:space-y-6"
      >
        {/* Hero */}
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#0F4C42] via-[#0E6B58] to-[#10B981] p-6 shadow-lg shadow-emerald-950/20 sm:p-7">
          <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-14 right-16 h-32 w-32 rounded-full bg-white/10 blur-xl" />
          <Building2 className="pointer-events-none absolute right-6 top-6 h-9 w-9 text-white/25 sm:h-10 sm:w-10" />
          <div className="relative">
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
              Bienvenue sur SAOVIA HOTEL 👋
            </h1>
            <p className="mt-1.5 text-sm text-white/80 capitalize">{today}</p>

            <div className="mt-5 flex divide-x divide-white/15 overflow-hidden rounded-2xl bg-white/10">
              {[
                { key: "occupation", icon: Percent, label: "Occupation", value: `${occupancyRate}%` },
                { key: "arrivees", icon: LogIn, label: "Arrivées", value: 8 },
                { key: "departs", icon: LogOut, label: "Départs", value: 5 },
              ].map((stat) => (
                <div key={stat.key} className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 sm:px-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/15 text-white">
                    <stat.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-sm font-bold text-white">{stat.value}</p>
                    <p className="truncate text-[10px] text-white/75">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions Rapides */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold">Actions rapides</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {QUICK_ACTIONS.map((action, i) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
              >
                <Link
                  to={action.route}
                  className="flex flex-col items-center gap-1.5 rounded-[20px] border border-border bg-card p-3 shadow-sm transition-all hover:border-primary hover:shadow-md h-full sm:rounded-[24px] dark:bg-[#0F2E28] dark:border-white/5"
                >
                  <div className={cn("grid h-8 w-8 place-items-center rounded-xl", ACTION_COLOR_CLASSES[action.color])}>
                    <action.icon className="h-4 w-4" />
                  </div>
                  <span className="text-center text-[11px] font-medium leading-tight">{action.title}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <DashboardKpiCard
            index={0}
            title="Taux d'occupation"
            value={`${occupancyRate}%`}
            icon={Percent}
            route="/hotel/chambres"
            trend={4.2}
            accent="primary"
          />
          <DashboardKpiCard
            index={1}
            title="Chambres occupées"
            value={`${occupiedRooms} / ${totalRooms}`}
            icon={BedDouble}
            route="/hotel/chambres"
            trend={2.1}
            accent="emerald"
          />
          <DashboardKpiCard
            index={2}
            title="Arrivées du jour"
            value="8"
            icon={LogIn}
            route="/hotel/checkin-checkout"
            trend={null}
            accent="sky"
          />
          <DashboardKpiCard
            index={3}
            title="Départs du jour"
            value="5"
            icon={LogOut}
            route="/hotel/checkin-checkout"
            trend={null}
            accent="amber"
          />
        </div>

        {/* Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Occupation chambres */}
          <Card className={cn("p-4 sm:p-6", CARD_CLASS)}>
            <h3 className="font-bold mb-4">Occupation des chambres</h3>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold tracking-tight text-primary">{occupancyRate}%</div>
              <div className="flex-1">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow"
                    style={{ width: `${occupancyRate}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {occupiedRooms} chambres occupées sur {totalRooms}
                </p>
              </div>
            </div>
          </Card>

          {/* Revenus du jour */}
          <Card className={cn("p-4 sm:p-6", CARD_CLASS)}>
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" /> Revenus du jour
            </h3>
            <p className="text-3xl font-bold tracking-tight">{formatCurrency(1245000)}</p>
            <p className="mt-2 text-xs text-muted-foreground">Hébergement, restauration et services inclus</p>
          </Card>

          {/* Réservations du jour */}
          <Card className={cn("p-4 sm:p-6 lg:row-span-2", CARD_CLASS)}>
            <h3 className="font-bold mb-4">Réservations du jour</h3>
            <ul className="divide-y divide-border">
              {TODAY_RESERVATIONS.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.room} · {r.time}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      RESERVATION_STATUS_CLASSES[r.status],
                    )}
                  >
                    {r.status}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Statut chambres */}
          <Card className={cn("p-4 sm:p-6 lg:col-span-2", CARD_CLASS)}>
            <h3 className="font-bold mb-4">Statut des chambres</h3>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
              {ROOM_GRID.map((room) => (
                <div
                  key={room.number}
                  title={ROOM_STATUS_META[room.status].label}
                  className={cn(
                    "grid aspect-square place-items-center rounded-xl text-xs font-semibold",
                    ROOM_STATUS_META[room.status].className,
                  )}
                >
                  {room.number}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
              {(Object.keys(ROOM_STATUS_META) as RoomStatus[]).map((status) => (
                <div key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={cn("h-2.5 w-2.5 rounded-full", ROOM_STATUS_META[status].className)} />
                  {ROOM_STATUS_META[status].label}
                </div>
              ))}
            </div>
          </Card>

          {/* Housekeeping */}
          <Card className={cn("p-4 sm:p-6 lg:col-span-3", CARD_CLASS)}>
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Housekeeping
            </h3>
            <ul className="divide-y divide-border">
              {HOUSEKEEPING_TASKS.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{t.room}</p>
                    <p className="text-xs text-muted-foreground">{t.task}</p>
                  </div>
                  <div className="hidden w-32 shrink-0 sm:block">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow"
                        style={{ width: `${t.progress}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs font-semibold text-muted-foreground">
                    {t.progress}%
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </motion.div>
    </HotelAppShell>
  );
}

export const Route = createFileRoute("/hotel/")({
  component: HotelDashboard,
});
