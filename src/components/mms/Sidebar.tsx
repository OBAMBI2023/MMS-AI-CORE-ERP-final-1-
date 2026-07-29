import { SidebarContent } from "./SidebarContent";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { PLATFORM_BRANDING } from "@/config/branding";
import { Skeleton } from "@/components/ui/skeleton";

export function Sidebar() {
  const { logoUrl, settings, isLoading } = useCompanySettings();
  const companyName = settings?.company_name ?? "Mon Entreprise";

  return (
    <aside className="hidden md:flex h-full w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border overflow-hidden">
      <div className="flex h-24 shrink-0 items-center border-b border-sidebar-border px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl">
            {isLoading ? (
              <Skeleton className="h-16 w-16 rounded-2xl" />
            ) : logoUrl ? (
              <img
                src={logoUrl}
                alt={`Logo ${companyName}`}
                className="max-h-16 w-auto max-w-16 rounded-2xl object-contain"
              />
            ) : (
              <img
                src={PLATFORM_BRANDING.assets.logo}
                alt={PLATFORM_BRANDING.alt}
                className="max-h-16 w-auto max-w-16 object-contain"
              />
            )}
          </div>
          <div className="min-w-0">
            {isLoading ? (
              <Skeleton className="h-4 w-28" />
            ) : (
              <div className="truncate text-sm font-bold tracking-tight">{companyName}</div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 px-4">
        <SidebarContent />
      </div>
    </aside>
  );
}
