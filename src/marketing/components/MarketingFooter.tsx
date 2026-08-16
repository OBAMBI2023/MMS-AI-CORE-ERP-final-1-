import { Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { useMarketingTranslation } from "../i18n/LanguageProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function MarketingFooter() {
  const { t } = useMarketingTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-saovia-secondary text-white/70">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <BrandLogo context="marketingFooter" imageClassName="brightness-0 invert" />
          <p className="max-w-md text-sm text-white/60">{t.footer.description}</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <Link to="/fonctionnalites" className="hover:text-white">
            {t.footer.nav.features}
          </Link>
          <Link to="/tarifs" className="hover:text-white">
            {t.footer.nav.pricing}
          </Link>
          <Link to="/demo" className="hover:text-white">
            {t.footer.nav.demo}
          </Link>
          <Link to="/login" className="hover:text-white">
            {t.footer.nav.login}
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-5 py-5 text-xs text-white/60 sm:flex-row sm:justify-between lg:px-8">
          <p className="order-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center sm:justify-start sm:text-left">
            <span>{t.footer.copyright(year)}</span>
            <span aria-hidden="true" className="text-white/30">
              ·
            </span>
            <span>
              <span aria-hidden="true">🇨🇮</span> {t.footer.country}
            </span>
          </p>

          <p className="order-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:order-2">
            <Link to="/tarifs" className="hover:text-saovia-accent">
              {t.footer.legal.terms}
            </Link>
            <Link to="/tarifs" className="hover:text-saovia-accent">
              {t.footer.legal.privacy}
            </Link>
          </p>

          <div className="order-2 sm:order-3">
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}
