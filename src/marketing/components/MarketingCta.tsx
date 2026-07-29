import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PLATFORM_BRANDING } from "@/config/branding";

export function MarketingCta() {
  return (
    <section className="px-5 py-20 lg:px-8">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-blue-600 px-6 py-14 text-center text-white shadow-2xl shadow-blue-600/20 sm:px-12">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-100">{PLATFORM_BRANDING.tagline}</p>
        <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl">
          Voyez comment {PLATFORM_BRANDING.productName} s’intègre à vos opérations.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-blue-100">
          Présentez-nous vos besoins et explorez les possibilités de la plateforme.
        </p>
        <Link
          to="/demo"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 transition-transform hover:-translate-y-0.5"
        >
          Demander une démonstration
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
