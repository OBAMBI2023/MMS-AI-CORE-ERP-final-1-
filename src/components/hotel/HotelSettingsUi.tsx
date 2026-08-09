import type { ReactNode } from "react";

export function Section({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="hotel-panel mb-5">
      <header className="mb-4 flex items-start gap-3">
        {icon && <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}
