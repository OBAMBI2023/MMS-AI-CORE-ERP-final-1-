import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <div>
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="h-5 w-5 text-blue-400" aria-hidden="true" />
            <span className="font-bold">MMS AI CORE</span>
          </div>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            Un espace de gestion centralisé pour piloter les opérations de votre entreprise.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <Link to="/fonctionnalites" className="hover:text-white">
            Fonctionnalités
          </Link>
          <Link to="/tarifs" className="hover:text-white">
            Tarifs
          </Link>
          <Link to="/demo" className="hover:text-white">
            Démonstration
          </Link>
          <Link to="/login" className="hover:text-white">
            Connexion
          </Link>
        </div>
      </div>
    </footer>
  );
}
