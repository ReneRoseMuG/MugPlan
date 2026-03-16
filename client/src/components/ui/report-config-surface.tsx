import type { ReactNode } from "react";

type ReportConfigSurfaceProps = {
  title: string;
  description?: string;
  actions: ReactNode;
  children: ReactNode;
};

export function ReportConfigSurface({
  title,
  description,
  actions,
  children,
}: ReportConfigSurfaceProps) {
  return (
    <section className="rounded-lg border border-border/60 bg-muted/20 p-4" data-testid="report-config-surface">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <div className="flex shrink-0 items-end">{actions}</div>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}
