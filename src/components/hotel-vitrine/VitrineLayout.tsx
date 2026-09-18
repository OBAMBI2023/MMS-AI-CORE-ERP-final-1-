import { Link } from "@tanstack/react-router";
import { Hotel, MapPin, Phone, Mail } from "lucide-react";
import type { ReactNode } from "react";

export function VitrineHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B1F4D]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0B1F4D]/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/hotel-vitrine" className="flex items-center gap-2 text-white">
          <Hotel className="h-6 w-6 text-[#D4AF37]" />
          <span className="text-lg font-semibold tracking-tight">
            SAOVIA <span className="text-[#D4AF37]">Hôtel</span>
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-white/80">
          <Link
            to="/hotel-vitrine/hotels"
            className="transition-colors hover:text-white"
            activeProps={{ className: "text-white" }}
          >
            Établissements
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function VitrineFooter() {
  return (
    <footer className="border-t border-black/5 bg-[#0B1F4D] text-white/70">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <div className="flex items-center gap-2 text-white">
            <Hotel className="h-5 w-5 text-[#D4AF37]" />
            <span className="text-base font-semibold">SAOVIA Hôtel</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed">
            Découvrez et réservez des établissements hôteliers de qualité, gérés sur la
            plateforme SAOVIA.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-white">Navigation</p>
          <ul className="mt-3 space-y-2">
            <li>
              <Link to="/hotel-vitrine" className="hover:text-white">
                Accueil
              </Link>
            </li>
            <li>
              <Link to="/hotel-vitrine/hotels" className="hover:text-white">
                Établissements
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-white">Contact</p>
          <ul className="mt-3 space-y-2">
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" />
              <span>contact@saovia.net</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-6 text-center text-xs text-white/50">
        © {new Date().getFullYear()} SAOVIA Hôtel — propulsé par SAOVIA ERP.
      </div>
    </footer>
  );
}

export function VitrineAddressLine({
  city,
  address,
}: {
  city: string | null;
  address?: string | null;
}) {
  const label = [address, city].filter(Boolean).join(", ");
  if (!label) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <MapPin className="h-4 w-4 shrink-0" />
      {label}
    </span>
  );
}

export function VitrinePhoneLine({ phone }: { phone: string | null }) {
  if (!phone) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <Phone className="h-4 w-4 shrink-0" />
      {phone}
    </span>
  );
}

export function VitrinePage({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-white">{children}</div>;
}
