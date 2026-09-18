import { Link } from "@tanstack/react-router";
import { MapPin, ArrowUpRight } from "lucide-react";

// Pas de photo par ville en base : plutôt que d'illustrer avec un cliché
// générique non lié à la donnée réelle, un traitement graphique
// (dégradé + initiale) garde la carte honnête tout en restant premium.
export function DestinationCard({ city }: { city: string }) {
  return (
    <Link
      to="/sitevitrine/hotels"
      search={{ q: city }}
      className="group relative flex h-40 flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B1F4D] via-[#12295e] to-[#1c3a7a] p-5 text-white shadow-sm transition-shadow hover:shadow-xl sm:h-48"
    >
      <span
        className="pointer-events-none absolute -right-4 -top-4 text-8xl font-black text-white/5 transition-transform duration-500 group-hover:scale-110"
        aria-hidden
      >
        {city.charAt(0)}
      </span>
      <span className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors group-hover:bg-[#D4AF37] group-hover:text-[#0B1F4D]">
        <ArrowUpRight className="h-4 w-4" />
      </span>
      <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-[#D4AF37]">
        <MapPin className="h-3.5 w-3.5" />
        Destination
      </span>
      <span className="mt-1 text-xl font-semibold">{city}</span>
    </Link>
  );
}
