import { Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";

export function HotelLandingFooter() {
  return (
    <footer id="contact" className="border-t border-black/5 bg-[#0B1F4D] text-white/70">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 text-white">
            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white">
              <img
                src="/branding/hotel/saovia-hotel-icon.png"
                alt="SAOVIA HOTEL"
                className="h-full w-full object-contain p-1"
              />
            </span>
            <span className="text-base font-semibold">SAOVIA HOTEL</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed">
            La plateforme SAOVIA pour piloter chambres, logements, réservations, clients et
            revenus d'un établissement hôtelier — et donner de la visibilité à vos logements
            auprès des voyageurs.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold uppercase tracking-wide text-white">Professionnels</p>
          <ul className="mt-4 space-y-2.5">
            <li>
              <a href="#fonctionnalites" className="hover:text-white">
                Fonctionnalités
              </a>
            </li>
            <li>
              <Link to="/essai-gratuit" className="hover:text-white">
                Créer mon établissement
              </Link>
            </li>
            <li>
              <Link to="/login" className="hover:text-white">
                Se connecter
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold uppercase tracking-wide text-white">Visiteurs</p>
          <ul className="mt-4 space-y-2.5">
            <li>
              <Link to="/sitevitrine/hotels" className="hover:text-white">
                Découvrir les établissements
              </Link>
            </li>
            <li>
              <Link to="/sitevitrine" hash="destinations" className="hover:text-white">
                Destinations
              </Link>
            </li>
            <li>
              <Link to="/sitevitrine/hotels" className="hover:text-white">
                Demandes de réservation
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-6 text-center text-xs text-white/50 sm:px-6 lg:px-8">
        <span className="inline-flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5" />
          <a href="mailto:contact@saovia.net" className="hover:text-white">
            contact@saovia.net
          </a>
        </span>
        <span className="mx-2">·</span>
        © {new Date().getFullYear()} SAOVIA HOTEL — propulsé par SAOVIA ERP.
      </div>
    </footer>
  );
}
