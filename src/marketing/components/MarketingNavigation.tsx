import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/branding/BrandLogo";

const navigationItems = [
  { label: "Produits", href: "#produits" },
  { label: "Solutions", href: "#solutions" },
  { label: "Modules", href: "#modules" },
  { label: "Tarifs", href: "#tarifs" },
  { label: "Support", href: "#support" },
  { label: "Contact", href: "#contact" },
] as const;

export function MarketingNavigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <nav
        aria-label="Navigation principale"
        className="mx-auto flex min-h-[84px] max-w-7xl items-center justify-between px-5 lg:px-8"
      >
        <Link to="/" className="flex items-center" onClick={() => setIsOpen(false)}>
          <BrandLogo context="marketingHeader" className="h-[70px] w-[132px] p-0 md:h-[76px] md:w-[144px]" />
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {navigationItems.map((item) => (
            <a key={item.href} href={item.href} className="text-sm font-medium text-slate-600 transition-colors hover:text-saovia-primary">
              {item.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to="/login"
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:text-saovia-primary"
          >
            Connexion
          </Link>
          <Link
            to="/essai-gratuit"
            className="rounded-xl bg-saovia-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-saovia-primary/20 transition-colors hover:bg-saovia-primary-hover"
          >
            Essayer gratuitement
          </Link>
        </div>

        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-xl text-slate-700 hover:bg-slate-100 lg:hidden"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {isOpen && (
        <div id="mobile-navigation" className="border-t border-slate-200 bg-white px-5 py-4 lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col">
            {navigationItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-saovia-primary"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-saovia-primary"
              >
                Connexion
              </Link>
              <Link
                to="/essai-gratuit"
                onClick={() => setIsOpen(false)}
                className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl bg-saovia-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-saovia-primary-hover"
              >
                Essayer gratuitement
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
