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
            <a key={item.href} href={item.href} className="text-sm font-medium text-slate-600 transition-colors hover:text-[#0f5b4e]">
              {item.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to="/login"
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#0f5b4e] transition-colors hover:bg-[#0f5b4e]/6"
          >
            Connexion
          </Link>
          <Link
            to="/essai-gratuit"
            className="rounded-xl bg-[#0f5b4e] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#0f5b4e]/20 transition-colors hover:bg-[#0b4c41]"
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
        <div id="mobile-navigation" className="border-t border-slate-200 bg-white px-5 py-5 lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {navigationItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4">
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-700"
              >
                Connexion
              </Link>
              <Link
                to="/essai-gratuit"
                onClick={() => setIsOpen(false)}
                className="rounded-xl bg-[#0f5b4e] px-4 py-3 text-center text-sm font-semibold text-white"
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
