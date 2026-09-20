import { Link } from "@tanstack/react-router";
import { Hotel, MapPin, Phone, Mail, Menu, MessageCircle } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV_LINKS: Array<{ label: string; to: string; hash?: string }> = [
  { label: "Accueil", to: "/sitevitrine" },
  { label: "Résidences", to: "/sitevitrine/hotels" },
  { label: "Destinations", to: "/sitevitrine", hash: "destinations" },
  { label: "Services", to: "/sitevitrine", hash: "services" },
  { label: "Contact", to: "/sitevitrine", hash: "contact" },
];

export function VitrineHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B1F4D]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0B1F4D]/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/sitevitrine" className="flex shrink-0 items-center gap-2 text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D4AF37]/50 bg-[#D4AF37]/10">
            <Hotel className="h-5 w-5 text-[#D4AF37]" />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            SAOVIA <span className="text-[#D4AF37]">HOTEL</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-white/75 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              hash={link.hash}
              className="transition-colors hover:text-white"
              activeOptions={{ exact: true }}
              activeProps={link.hash ? undefined : { className: "text-white" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to="/login"
            className="text-sm font-medium text-white/75 transition-colors hover:text-white"
          >
            Connexion
          </Link>
          <Button asChild size="sm" className="bg-[#D4AF37] text-[#0B1F4D] hover:bg-[#D4AF37]/90">
            <Link to="/sitevitrine/hotels">Réserver</Link>
          </Button>
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 text-white lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85vw] max-w-sm border-l-white/10 bg-[#0B1F4D] text-white">
            <div className="mt-8 flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  hash={link.hash}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-3 text-base font-medium text-white/85 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-4 border-t border-white/10 pt-4">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-3 py-3 text-base font-medium text-white/85 hover:bg-white/5 hover:text-white"
                >
                  Connexion
                </Link>
                <Button
                  asChild
                  className="mt-2 w-full bg-[#D4AF37] text-[#0B1F4D] hover:bg-[#D4AF37]/90"
                  onClick={() => setMobileOpen(false)}
                >
                  <Link to="/sitevitrine/hotels">Réserver</Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

export function VitrineFooter() {
  return (
    <footer id="contact" className="border-t border-black/5 bg-[#0B1F4D] text-white/70">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D4AF37]/50 bg-[#D4AF37]/10">
              <Hotel className="h-4 w-4 text-[#D4AF37]" />
            </span>
            <span className="text-base font-semibold">SAOVIA HOTEL</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed">
            Une sélection d'hôtels et de résidences partenaires, gérés et publiés en temps réel
            sur la plateforme SAOVIA. Confort, service et hospitalité, partout où SAOVIA opère.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold uppercase tracking-wide text-white">Navigation</p>
          <ul className="mt-4 space-y-2.5">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <Link to={link.to} hash={link.hash} className="hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold uppercase tracking-wide text-white">Contact</p>
          <ul className="mt-4 space-y-2.5">
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-[#D4AF37]" />
              <a href="mailto:contact@saovia.net" className="hover:text-white">
                contact@saovia.net
              </a>
            </li>
            <li className="flex items-start gap-2 text-white/50">
              <MessageCircle className="h-4 w-4 shrink-0" />
              <span>Chaque établissement propose sa réservation directe par WhatsApp ou téléphone.</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-6 text-center text-xs text-white/50">
        © {new Date().getFullYear()} SAOVIA HOTEL — propulsé par SAOVIA ERP.
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
  return <div className="min-h-screen overflow-x-hidden bg-white">{children}</div>;
}
