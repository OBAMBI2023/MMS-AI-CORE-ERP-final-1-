import { Link } from "@tanstack/react-router";
import { Hotel, Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Header de la landing COMMERCIALE hotel.saovia.net/ (professionnels).
// Distinct de VitrineHeader (hotel-vitrine/VitrineLayout.tsx), qui sert les
// visiteurs sur /sitevitrine : nav et CTA différents (pas de "Réserver" ici,
// cf. consigne produit), donc pas de fusion pertinente entre les deux headers.
const NAV_LINKS: Array<{ label: string; hash: string }> = [
  { label: "Accueil", hash: "" },
  { label: "Fonctionnalités", hash: "fonctionnalites" },
  { label: "Solutions", hash: "solutions" },
  { label: "Tarifs", hash: "tarifs" },
  { label: "Contact", hash: "contact" },
];

export function HotelLandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B1F4D]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0B1F4D]/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2 text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D4AF37]/50 bg-[#D4AF37]/10">
            <Hotel className="h-5 w-5 text-[#D4AF37]" />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            SAOVIA <span className="text-[#D4AF37]">HOTEL</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-white/75 lg:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.label} href={link.hash ? `#${link.hash}` : "#"} className="transition-colors hover:text-white">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link to="/login" className="text-sm font-medium text-white/75 transition-colors hover:text-white">
            Se connecter
          </Link>
          <Button asChild size="sm" className="bg-[#D4AF37] text-[#0B1F4D] hover:bg-[#D4AF37]/90">
            <Link to="/essai-gratuit">Créer mon établissement</Link>
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
                <a
                  key={link.label}
                  href={link.hash ? `#${link.hash}` : "#"}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-3 text-base font-medium text-white/85 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-4 border-t border-white/10 pt-4">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-3 py-3 text-base font-medium text-white/85 hover:bg-white/5 hover:text-white"
                >
                  Se connecter
                </Link>
                <Button
                  asChild
                  className="mt-2 w-full bg-[#D4AF37] text-[#0B1F4D] hover:bg-[#D4AF37]/90"
                  onClick={() => setMobileOpen(false)}
                >
                  <Link to="/essai-gratuit">Créer mon établissement</Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
