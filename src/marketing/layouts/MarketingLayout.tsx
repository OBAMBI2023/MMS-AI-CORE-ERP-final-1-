import type { ReactNode } from "react";
import { MarketingFooter } from "../components/MarketingFooter";
import { MarketingNavigation } from "../components/MarketingNavigation";

export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <MarketingNavigation />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
