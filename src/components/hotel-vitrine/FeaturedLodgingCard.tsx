import { Link } from "@tanstack/react-router";
import { BedDouble, Users, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PublicFeaturedLodging } from "@/integrations/hotel/public-directory";
import { propertyTypeLabel, lodgingWhatsappHref } from "@/lib/hotel/public-lodging-display";

export function FeaturedLodgingCard({ lodging }: { lodging: PublicFeaturedLodging }) {
  const typeLabel = propertyTypeLabel(lodging.propertyType);

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition-shadow hover:shadow-xl">
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#0B1F4D] to-[#16336e]">
        {lodging.photoUrl ? (
          <img
            src={lodging.photoUrl}
            alt={lodging.name}
            className="size-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid size-full place-items-center">
            <BedDouble className="h-12 w-12 text-white/50" />
          </div>
        )}
        <span className="absolute right-3 top-3 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[11px] font-semibold text-white">
          Disponible
        </span>
        {typeLabel && (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-[#0B1F4D]">
            {typeLabel}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-semibold text-[#0B1F4D]">{lodging.name}</h3>
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {lodging.hotelName}
          {lodging.hotelCity ? ` · ${lodging.hotelCity}` : ""}
        </span>
        {lodging.capacity !== null && (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {lodging.capacity} personne{lodging.capacity > 1 ? "s" : ""}
          </span>
        )}
        {lodging.amenities.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {lodging.amenities.slice(0, 3).map((amenity) => (
              <Badge key={amenity} variant="outline" className="text-xs font-normal">
                {amenity}
              </Badge>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          {lodging.rate !== null ? (
            <p className="text-lg font-bold text-[#0B1F4D]">
              {lodging.rate.toLocaleString("fr-FR")} F CFA
              <span className="text-sm font-normal text-muted-foreground"> / nuit</span>
            </p>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/sitevitrine/hotels/$slug" params={{ slug: lodging.hotelSlug }}>
                Détails
              </Link>
            </Button>
            {lodging.hotelWhatsapp ? (
              <Button asChild size="sm" className="bg-[#0B1F4D] hover:bg-[#0B1F4D]/90">
                <a
                  href={lodgingWhatsappHref(lodging.hotelWhatsapp, lodging.hotelName, lodging.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Réserver
                </a>
              </Button>
            ) : lodging.hotelPhone ? (
              <Button asChild size="sm" className="bg-[#0B1F4D] hover:bg-[#0B1F4D]/90">
                <a href={`tel:${lodging.hotelPhone}`}>Réserver</a>
              </Button>
            ) : (
              <Button asChild size="sm" className="bg-[#0B1F4D] hover:bg-[#0B1F4D]/90">
                <Link to="/sitevitrine/hotels/$slug" params={{ slug: lodging.hotelSlug }}>
                  Réserver
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
