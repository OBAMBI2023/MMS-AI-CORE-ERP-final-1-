import { Link } from "@tanstack/react-router";
import { Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VitrineAddressLine } from "./VitrineLayout";
import type { PublicHotelSummary } from "@/integrations/hotel/public-directory";

export function HotelCard({ hotel }: { hotel: PublicHotelSummary }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition-shadow hover:shadow-lg">
      <div className="relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-[#0B1F4D] to-[#16336e]">
        {hotel.logoUrl ? (
          <img
            src={hotel.logoUrl}
            alt={`Logo ${hotel.name}`}
            className="h-20 w-20 rounded-xl object-contain bg-white/95 p-2 shadow"
          />
        ) : (
          <Building2 className="h-14 w-14 text-white/40" />
        )}
        {hotel.businessSector && (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[#0B1F4D]">
            {hotel.businessSector}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-lg font-semibold text-[#0B1F4D]">{hotel.name}</h3>
        <VitrineAddressLine city={hotel.city} />
        <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">
          Un établissement hôtelier partenaire SAOVIA, prêt à vous accueillir.
        </p>
        <Button asChild variant="outline" className="mt-2 w-full justify-between">
          <Link to="/hotel-vitrine/hotels/$slug" params={{ slug: hotel.slug }}>
            Découvrir
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
