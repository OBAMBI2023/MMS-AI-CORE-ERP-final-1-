import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { PLATFORM_BRANDING } from "@/config/branding";

const navigationItems = [
  { label: "Accueil", to: "/" },
  { label: "Fonctionnalités", to: "/fonctionnalites" },
  { label: "Tarifs", to: "/tarifs" },
  { label: "Démonstration", to: "/demo" },
] as const;

export function MarketingNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <nav
        aria-label="Navigation principale"
        className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8"
      >
        <Link to="/" className="flex items-center" onClick={() => setIsOpen(false)}>
          <img
            src={PLATFORM_BRANDING.assets.logo}
            alt={PLATFORM_BRANDING.alt}
            className="h-11 w-auto max-w-[180px]"
          />
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {navigationItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                pathname === item.to ? "text-blue-600" : "text-slate-600"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to="/login"
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            Connexion
          </Link>
          <Link
            to="/essai-gratuit"
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700"
          >
            Essai gratuit
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
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setIsOpen(false)}
                className={`rounded-xl px-3 py-3 text-sm font-semibold ${
                  pathname === item.to
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </Link>
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
                className="rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white"
              >
                Essai gratuit
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
