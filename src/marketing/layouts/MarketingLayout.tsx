import type { ReactNode } from "react";
import { MarketingFooter } from "../components/MarketingFooter";
import { MarketingNavigation } from "../components/MarketingNavigation";
import { MarketingLanguageProvider } from "../i18n/LanguageProvider";

export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <MarketingLanguageProvider>
      <div className="min-h-screen bg-white text-slate-950">
        <MarketingNavigation />
        <main>{children}</main>
        <MarketingFooter />
      </div>
    </MarketingLanguageProvider>
  );
}
