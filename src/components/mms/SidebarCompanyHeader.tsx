import { PLATFORM_BRANDING } from "@/config/branding";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { useTenant } from "@/providers/TenantProvider";
import { cn } from "@/lib/utils";

type SidebarCompanyHeaderProps = {
  logoUrl?: string | null;
  isLoading?: boolean;
  collapsed?: boolean;
  compact?: boolean;
  className?: string;
};

type SidebarCompanyHeaderViewProps = {
  logoUrl?: string | null;
  loading: boolean;
  collapsed: boolean;
  compact: boolean;
  className?: string;
  companyName: string;
  businessActivity: string;
};

function tenantText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function shortBusinessActivity(value: unknown) {
  const activity = tenantText(value);
  const [shortActivity] = activity.split(/\s+(?:et|&)\s+/i);

  return shortActivity || activity;
}

function SidebarLogoFrame({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white p-1",
        className,
      )}
    >
      <img
        src={src || PLATFORM_BRANDING.assets.logo}
        alt={alt}
        loading="eager"
        decoding="async"
        draggable={false}
        className="h-full w-full object-contain object-center"
      />
    </div>
  );
}

export function SidebarCompanyHeader({
  logoUrl,
  isLoading = false,
  collapsed = false,
  compact = false,
  className,
}: SidebarCompanyHeaderProps) {
  const { tenant, loading: tenantLoading } = useTenant();
  const { settings, isLoading: settingsLoading } = useCompanySettings();
  const loading = isLoading || tenantLoading || settingsLoading;
  const companyName = tenantText(tenant?.name);
  const businessActivity =
    shortBusinessActivity(settings?.business_sector) || "Secteur non renseignÃ©";

  return (
    <SidebarCompanyHeaderView
      logoUrl={logoUrl}
      loading={loading}
      collapsed={collapsed}
      compact={compact}
      className={className}
      companyName={companyName}
      businessActivity={businessActivity}
    />
  );
}

export function SidebarCompanyHeaderView({
  logoUrl,
  loading,
  collapsed,
  compact,
  className,
  companyName,
  businessActivity,
}: SidebarCompanyHeaderViewProps) {
  const logoAlt = companyName ? `Logo ${companyName}` : "Logo de l'entreprise";
  const logo = loading ? (
    <Skeleton className="h-16 w-16 shrink-0 rounded-2xl border border-white/10 bg-white/10" />
  ) : (
    <SidebarLogoFrame src={logoUrl} alt={logoAlt} />
  );

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex h-[104px] shrink-0 items-center justify-center border-b border-[rgba(255,255,255,0.08)] px-2",
                className,
              )}
            >
              {logo}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-64">
            <p className="font-semibold">{companyName}</p>
            <p className="text-xs opacity-80">{businessActivity}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center border-b border-[rgba(255,255,255,0.08)]",
        compact ? "h-[72px] gap-3 px-4" : "h-[104px] gap-3.5 px-4",
        className,
      )}
    >
      {logo}
      <div className="min-w-0 flex-1">
        {loading ? (
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-[22px] w-full max-w-32" />
            <Skeleton className="h-[16px] w-full max-w-24" />
          </div>
        ) : (
          <>
            <p
              className={cn(
                "line-clamp-2 font-extrabold tracking-tight text-white",
                compact ? "text-[15px] leading-[18px]" : "text-[18px] leading-[22px]",
              )}
            >
              {companyName}
            </p>
            <p
              className={cn(
                "truncate font-medium text-[#A8B3CF]",
                compact ? "mt-0.5 text-[11px] leading-[14px]" : "mt-1.5 text-[12px] leading-[17px]",
              )}
              title={businessActivity}
            >
              {businessActivity}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
