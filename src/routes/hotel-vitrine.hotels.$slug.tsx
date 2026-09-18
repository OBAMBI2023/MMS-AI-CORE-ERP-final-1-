import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users, ArrowLeft, BedDouble, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  VitrineAddressLine,
  VitrinePhoneLine,
} from "@/components/hotel-vitrine/VitrineLayout";
import {
  fetchPublicHotelBySlug,
  type PublicHotelLodging,
} from "@/integrations/hotel/public-directory";

export const Route = createFileRoute("/hotel-vitrine/hotels/$slug")({
  component: HotelVitrineDetail,
});

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  studio: "Studio",
  chambre: "Chambre",
  appartement: "Appartement",
  suite: "Suite",
  villa: "Villa",
  maison: "Maison",
  autre: "Logement",
};

function whatsappHref(whatsapp: string, hotelName: string, lodgingName?: string) {
  const digits = whatsapp.replace(/[^\d]/g, "");
  const message = lodgingName
    ? `Bonjour, je souhaite réserver "${lodgingName}" à ${hotelName}.`
    : `Bonjour, je souhaite obtenir des informations sur ${hotelName}.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function HotelVitrineDetail() {
  const { slug } = Route.useParams();
  const { data: hotel, isPending } = useQuery({
    queryKey: ["public-hotel", slug],
    queryFn: () => fetchPublicHotelBySlug(slug),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!hotel) return;
    document.title = `${hotel.name} — Hébergement${hotel.city ? ` à ${hotel.city}` : ""}`;
    const description =
      hotel.description ?? `Découvrez ${hotel.name} et ses logements disponibles sur SAOVIA Hôtel.`;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", description);
  }, [hotel]);

  if (isPending) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="mt-6 h-8 w-1/2" />
        <Skeleton className="mt-3 h-4 w-1/3" />
      </main>
    );
  }

  if (!hotel) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <h1 className="mt-4 text-2xl font-bold text-[#0B1F4D]">
          Établissement introuvable
        </h1>
        <p className="mt-2 text-muted-foreground">
          Cet établissement n'existe pas ou n'est pas publié pour le moment.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/hotel-vitrine/hotels">
            <ArrowLeft className="h-4 w-4" />
            Retour aux établissements
          </Link>
        </Button>
      </main>
    );
  }

  return (
    <main>
      <section className="relative flex h-64 items-center justify-center overflow-hidden bg-gradient-to-br from-[#0B1F4D] to-[#16336e] sm:h-80">
        {hotel.logoUrl ? (
          <img
            src={hotel.logoUrl}
            alt={`Logo ${hotel.name}`}
            className="h-28 w-28 rounded-2xl bg-white/95 object-contain p-3 shadow-xl sm:h-32 sm:w-32"
          />
        ) : (
          <Building2 className="h-20 w-20 text-white/40" />
        )}
      </section>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          to="/hotel-vitrine/hotels"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-[#0B1F4D]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour aux établissements
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#0B1F4D] sm:text-4xl">{hotel.name}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <VitrineAddressLine city={hotel.city} address={hotel.address} />
              <VitrinePhoneLine phone={hotel.phone} />
            </div>
          </div>
          {hotel.businessSector && <Badge variant="secondary">{hotel.businessSector}</Badge>}
        </div>

        <p className="mt-6 max-w-3xl leading-relaxed text-muted-foreground">
          {hotel.description ||
            `${hotel.name} est un établissement hôtelier partenaire, géré sur la plateforme SAOVIA. Contactez directement l'établissement pour toute demande de réservation.`}
        </p>

        {hotel.whatsapp && (
          <Button asChild size="lg" className="mt-6 bg-[#25D366] text-white hover:bg-[#25D366]/90">
            <a
              href={whatsappHref(hotel.whatsapp, hotel.name)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-4 w-4" />
              Contacter sur WhatsApp
            </a>
          </Button>
        )}

        <section className="mt-12">
          <h2 className="text-xl font-bold text-[#0B1F4D]">Logements</h2>
          {hotel.lodgings.length > 0 ? (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {hotel.lodgings.map((lodging) => (
                <LodgingCard
                  key={lodging.id}
                  lodging={lodging}
                  hotelName={hotel.name}
                  hotelPhone={hotel.phone}
                  hotelWhatsapp={hotel.whatsapp}
                />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-black/10 bg-slate-50 p-10 text-center text-muted-foreground">
              Aucun logement publié pour le moment. Revenez bientôt.
            </div>
          )}
        </section>

        <div className="mt-12 rounded-2xl bg-slate-50 p-8 text-center">
          <h2 className="text-xl font-bold text-[#0B1F4D]">Envie de séjourner ici ?</h2>
          <p className="mt-2 text-muted-foreground">
            Contactez l'établissement directement pour finaliser votre réservation.
          </p>
          {hotel.phone ? (
            <Button asChild size="lg" className="mt-6 bg-[#0B1F4D] hover:bg-[#0B1F4D]/90">
              <a href={`tel:${hotel.phone}`}>Réserver — {hotel.phone}</a>
            </Button>
          ) : (
            <Button size="lg" className="mt-6 bg-[#0B1F4D] hover:bg-[#0B1F4D]/90" disabled>
              Coordonnées de réservation à venir
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}

function LodgingCard({
  lodging,
  hotelName,
  hotelPhone,
  hotelWhatsapp,
}: {
  lodging: PublicHotelLodging;
  hotelName: string;
  hotelPhone: string | null;
  hotelWhatsapp: string | null;
}) {
  const typeLabel = lodging.propertyType
    ? PROPERTY_TYPE_LABELS[lodging.propertyType] ?? lodging.propertyType
    : null;
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition-shadow hover:shadow-lg">
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300">
        {lodging.photoUrl ? (
          <img
            src={lodging.photoUrl}
            alt={lodging.name}
            className="size-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid size-full place-items-center">
            <BedDouble className="h-12 w-12 text-white/70" />
          </div>
        )}
        <span
          className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            lodging.availability === "available"
              ? "bg-emerald-500/90 text-white"
              : "bg-slate-500/90 text-white"
          }`}
        >
          {lodging.availability === "available" ? "Disponible" : "Indisponible"}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-[#0B1F4D]">{lodging.name}</h3>
          {typeLabel && (
            <Badge variant="outline" className="shrink-0 text-xs font-normal">
              {typeLabel}
            </Badge>
          )}
        </div>
        {lodging.capacity !== null && (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {lodging.capacity} personne{lodging.capacity > 1 ? "s" : ""}
          </span>
        )}
        {lodging.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{lodging.description}</p>
        )}
        {lodging.amenities.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {lodging.amenities.slice(0, 4).map((amenity) => (
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
          {hotelWhatsapp ? (
            <Button asChild size="sm" className="bg-[#0B1F4D] hover:bg-[#0B1F4D]/90">
              <a
                href={whatsappHref(hotelWhatsapp, hotelName, lodging.name)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Réserver
              </a>
            </Button>
          ) : hotelPhone ? (
            <Button asChild size="sm" className="bg-[#0B1F4D] hover:bg-[#0B1F4D]/90">
              <a href={`tel:${hotelPhone}`}>Réserver</a>
            </Button>
          ) : (
            <Button size="sm" disabled>
              Voir
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
