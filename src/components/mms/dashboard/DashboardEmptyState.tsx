import type { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function DashboardEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionRoute,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionRoute?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? "py-6" : "py-12"}`}
    >
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted mb-3">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>}
      {actionLabel && actionRoute && (
        <Link
          to={actionRoute}
          preload="intent"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
