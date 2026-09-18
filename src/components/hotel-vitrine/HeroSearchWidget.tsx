import { useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";
import { MapPin, CalendarDays, Users, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Barre de recherche du hero. Seule la destination est réellement câblée au
// catalogue (/sitevitrine/hotels?q=...) : arrivée/départ/voyageurs restent
// des champs de confort visuel tant qu'aucun moteur de disponibilité par
// date n'existe côté back-office — on ne simule pas un filtrage qui
// n'existe pas réellement.
export function HeroSearchWidget({ destinations }: { destinations: string[] }) {
  const navigate = useNavigate();
  const listId = useId();
  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    navigate({
      to: "/sitevitrine/hotels",
      search: destination.trim() ? { q: destination.trim() } : {},
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto mt-10 grid max-w-4xl gap-2 rounded-2xl bg-white p-3 shadow-2xl sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto] lg:items-stretch lg:gap-0 lg:p-2"
    >
      <label className="flex flex-col gap-1 rounded-xl px-3 py-2 text-left lg:border-r lg:border-black/5">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#0B1F4D]/60">
          <MapPin className="h-3.5 w-3.5" />
          Destination
        </span>
        <Input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Ville, établissement…"
          list={listId}
          className="h-8 border-0 p-0 shadow-none focus-visible:ring-0"
        />
        <datalist id={listId}>
          {destinations.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>
      </label>

      <label className="flex flex-col gap-1 rounded-xl px-3 py-2 text-left lg:border-r lg:border-black/5">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#0B1F4D]/60">
          <CalendarDays className="h-3.5 w-3.5" />
          Arrivée
        </span>
        <input
          type="date"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          className="h-8 border-0 bg-transparent p-0 text-sm text-[#0B1F4D] outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 rounded-xl px-3 py-2 text-left lg:border-r lg:border-black/5">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#0B1F4D]/60">
          <CalendarDays className="h-3.5 w-3.5" />
          Départ
        </span>
        <input
          type="date"
          value={checkOut}
          min={checkIn || undefined}
          onChange={(e) => setCheckOut(e.target.value)}
          className="h-8 border-0 bg-transparent p-0 text-sm text-[#0B1F4D] outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 rounded-xl px-3 py-2 text-left">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#0B1F4D]/60">
          <Users className="h-3.5 w-3.5" />
          Voyageurs
        </span>
        <select
          value={guests}
          onChange={(e) => setGuests(e.target.value)}
          className="h-8 border-0 bg-transparent p-0 text-sm text-[#0B1F4D] outline-none"
        >
          {["1", "2", "3", "4", "5", "6+"].map((n) => (
            <option key={n} value={n}>
              {n} {n === "1" ? "voyageur" : "voyageurs"}
            </option>
          ))}
        </select>
      </label>

      <Button
        type="submit"
        size="lg"
        className="mt-1 bg-[#0B1F4D] hover:bg-[#0B1F4D]/90 sm:col-span-2 lg:col-span-1 lg:mt-0"
      >
        <Search className="h-4 w-4" />
        Rechercher
      </Button>
    </form>
  );
}
