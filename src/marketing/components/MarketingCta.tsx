import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PLATFORM_BRANDING } from "@/config/branding";

export function MarketingCta({ ctaHref = "/essai-gratuit" }: { ctaHref?: string }) {
  return (
    <section className="px-5 py-20 lg:px-8">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-[#0f5b4e] px-6 py-14 text-center text-white shadow-2xl shadow-[#0f5b4e]/20 sm:px-12">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/70">{PLATFORM_BRANDING.tagline}</p>
        <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl">
          Voyez comment {PLATFORM_BRANDING.productName} s’intègre à vos opérations.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-white/80">
          Présentez-nous vos besoins et explorez les possibilités de la plateforme.
        </p>
        <Link
          to={ctaHref}
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#0f5b4e] transition-transform hover:-translate-y-0.5"
        >
          Essayer gratuitement
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
