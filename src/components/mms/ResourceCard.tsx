import type { ReactNode } from "react";
import { MoreVertical, type LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ResourceCardDetail {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  valueClassName?: string;
}

export interface ResourceCardMenuAction {
  key: string;
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  href?: string;
  destructive?: boolean;
}

export interface ResourceCardFooterAction {
  key: string;
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  href?: string;
  colorClass: string;
  disabled?: boolean;
}

export interface ResourceCardLeading {
  variant: "icon" | "avatar";
  icon?: LucideIcon;
  initials?: string;
  className: string;
}

export interface ResourceCardProps {
  leading: ResourceCardLeading;
  title: string;
  badge?: { label: string; className: string };
  headerInfo?: { value: ReactNode; className?: string };
  menuActions?: ResourceCardMenuAction[];
  menuAriaLabel?: string;
  details?: ResourceCardDetail[];
  footerActions?: ResourceCardFooterAction[];
  children?: ReactNode;
}

/**
 * Shared premium card used across Dépenses / Achats / Fournisseurs / Clients so the
 * four modules render identical cards (same radii, shadows, spacing, footer strip).
 */
export function ResourceCard({
  leading,
  title,
  badge,
  headerInfo,
  menuActions = [],
  menuAriaLabel = "Menu",
  details = [],
  footerActions = [],
  children,
}: ResourceCardProps) {
  const LeadingIcon = leading.icon;

  return (
    <div className="rounded-[18px] border border-border bg-white p-[18px] shadow-sm shadow-slate-900/[0.04] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-card dark:shadow-none">
      <div className="flex items-start gap-3">
        {leading.variant === "icon" && LeadingIcon ? (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${leading.className}`}
          >
            <LeadingIcon className="h-5 w-5" />
          </div>
        ) : (
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm ${leading.className}`}
          >
            {leading.initials}
          </div>
        )}
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="truncate text-[15px] font-bold leading-tight text-foreground">{title}</h3>
          {badge && (
            <span
              className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
            >
              {badge.label}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1 pt-0.5">
          {headerInfo && (
            <span className={`text-[15px] font-bold whitespace-nowrap ${headerInfo.className ?? ""}`}>
              {headerInfo.value}
            </span>
          )}
          {menuActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={menuAriaLabel}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {menuActions.map((action) =>
                  action.href ? (
                    <DropdownMenuItem
                      key={action.key}
                      asChild
                      className={action.destructive ? "text-destructive focus:text-destructive" : undefined}
                    >
                      <a href={action.href}>
                        <action.icon className="h-4 w-4" /> {action.label}
                      </a>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      key={action.key}
                      onClick={action.onClick}
                      className={action.destructive ? "text-destructive focus:text-destructive" : undefined}
                    >
                      <action.icon className="h-4 w-4" /> {action.label}
                    </DropdownMenuItem>
                  ),
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {details.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3.5">
          {details.map((detail, i) => (
            <div key={i}>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <detail.icon className="h-3.5 w-3.5 shrink-0" /> {detail.label}
              </p>
              <p className={`mt-1 truncate text-sm font-medium ${detail.valueClassName ?? "text-foreground"}`}>
                {detail.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {footerActions.length > 0 && (
        <div
          className="mt-3.5 grid divide-x divide-border border-t border-border pt-1"
          style={{ gridTemplateColumns: `repeat(${footerActions.length}, minmax(0, 1fr))` }}
        >
          {footerActions.map((action) =>
            action.disabled ? (
              <span key={action.key} />
            ) : action.href ? (
              <a
                key={action.key}
                href={action.href}
                className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-colors duration-200 ${action.colorClass}`}
              >
                <action.icon className="h-3.5 w-3.5" /> {action.label}
              </a>
            ) : (
              <button
                key={action.key}
                type="button"
                onClick={action.onClick}
                className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-colors duration-200 ${action.colorClass}`}
              >
                <action.icon className="h-3.5 w-3.5" /> {action.label}
              </button>
            ),
          )}
        </div>
      )}

      {children}
    </div>
  );
}
