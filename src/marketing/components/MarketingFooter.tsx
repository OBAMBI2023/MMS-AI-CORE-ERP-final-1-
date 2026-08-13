import { Facebook, Instagram, Linkedin } from "lucide-react";
import { BrandLogo } from "@/components/branding/BrandLogo";

const columns = [
  {
    title: "Solutions",
    links: [
      { label: "SAOVIA ERP", href: "/erp" },
      { label: "SAOVIA Commerce", href: "/commerce" },
      { label: "Point de vente", href: "/pos" },
      { label: "Intelligence artificielle", href: "/ai" },
    ],
  },
  {
    title: "Entreprise",
    links: [
      { label: "À propos", href: "/about" },
      { label: "Tarifs", href: "/pricing" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { label: "Centre d'aide", href: "/help" },
      { label: "Documentation", href: "/docs" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Légal",
    links: [
      { label: "Confidentialité", href: "/privacy" },
      { label: "Conditions d'utilisation", href: "/terms" },
      { label: "Cookies", href: "/cookies" },
    ],
  },
] as const;

const socials = [
  { name: "LinkedIn", href: "#", icon: Linkedin },
  { name: "Facebook", href: "#", icon: Facebook },
  { name: "Instagram", href: "#", icon: Instagram },
] as const;

export function MarketingFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-white/8 bg-[linear-gradient(180deg,#071325_0%,#050B16_100%)] text-slate-300">
      <div className="absolute inset-x-0 top-0 h-px bg-white/5" aria-hidden="true" />

      <div className="mx-auto max-w-[1360px] px-5 pb-5 pt-9 sm:px-6 sm:pt-10 lg:px-8 lg:pb-6 lg:pt-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.95fr)] lg:gap-12">
          <div className="max-w-[360px]">
            <BrandLogo
              context="marketingFooter"
              className="h-[42px] w-[110px] p-0 sm:h-[44px] sm:w-[120px] lg:h-[48px] lg:w-[130px]"
              imageClassName="object-left brightness-0 invert"
            />
            <p className="mt-4 max-w-[320px] text-[14px] leading-[1.65] text-slate-400">
              La plateforme tout-en-un pour gérer, vendre et développer votre entreprise.
            </p>
            <div className="mt-5 flex items-center gap-2.5">
              {socials.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    aria-label={social.name}
                    rel="noreferrer"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 transition duration-200 hover:-translate-y-[1px] hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-white hover:shadow-[0_0_0_1px_rgba(56,189,248,0.12),0_0_18px_rgba(56,189,248,0.12)]"
                  >
                    <Icon className="h-[17px] w-[17px]" aria-hidden="true" />
                  </a>
                );
              })}
            </div>
          </div>

          <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 xl:grid-cols-4">
            {columns.map((column) => (
              <div key={column.title}>
                <h3 className="relative pb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-sky-400">
                  {column.title}
                  <span className="absolute bottom-0 left-0 h-px w-8 bg-sky-400/80" aria-hidden="true" />
                </h3>
                <ul className="mt-4 space-y-2">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="group inline-flex items-center text-[14px] text-slate-400 transition duration-200 hover:translate-x-[2px] hover:text-white"
                      >
                        <span className="relative">
                          {link.label}
                          <span className="absolute -bottom-1 left-0 h-px w-0 bg-sky-400 transition-all duration-150 group-hover:w-full" />
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-white/6 pt-4 text-[13px] text-[#778397] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Saovia. Tous droits réservés.</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <span>Français</span>
            <span>Côte d’Ivoire</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
