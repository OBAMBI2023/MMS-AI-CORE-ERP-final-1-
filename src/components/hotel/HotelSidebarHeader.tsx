import { Building2 } from "lucide-react";
import { useTenant } from "@/providers/TenantProvider";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function HotelSidebarHeader({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { profile, loading: tenantLoading } = useTenant();
  const { settings, logoUrl, isLoading: settingsLoading } = useCompanySettings(profile?.tenant_id);
  const resolving = tenantLoading || settingsLoading;
  // Only fall back to the generic brand name once loading has genuinely
  // settled and there is still no configured company name — never while
  // profile/settings are still resolving, otherwise every establishment
  // flashes "SAOVIA HOTEL" for a beat before its real name appears.
  const establishmentName = resolving ? null : settings?.company_name?.trim() || "SAOVIA HOTEL";

  if (resolving) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center gap-3 border-b border-[rgba(255,255,255,0.08)]",
          compact ? "h-[68px] px-4" : "h-[100px] gap-4 px-4",
        )}
      >
        <Skeleton className={cn("shrink-0 rounded-2xl bg-white/10", compact ? "size-11" : "size-16")} />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-32 bg-white/10" />
          <Skeleton className="h-3 w-24 bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center border-b border-[rgba(255,255,255,0.08)]",
        compact ? "h-[68px] gap-3 px-4" : "h-[100px] gap-4 px-4",
        className,
      )}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`Logo ${establishmentName}`}
          className={cn("shrink-0 rounded-xl object-contain", compact ? "size-10" : "size-11")}
        />
      ) : (
        <div
          className={cn(
            "grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-white shadow-[0_6px_18px_rgba(0,0,0,0.25)]",
            compact ? "size-11" : "size-16",
          )}
        >
          <Building2 className={compact ? "h-5 w-5" : "h-7 w-7"} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate font-bold text-white",
            compact ? "text-[15px] leading-[18px]" : "text-[18px] leading-[22px]",
          )}
        >
          {establishmentName}
        </p>
        <p
          className={cn(
            "truncate text-[#A8CFC4]",
            compact ? "mt-0.5 text-[11px] leading-[14px]" : "mt-1 text-[13px] leading-[18px]",
          )}
        >
          Hôtellerie &amp; Hébergement
        </p>
      </div>
    </div>
  );
}
