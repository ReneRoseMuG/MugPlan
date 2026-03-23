import type { ReactNode } from "react";

type ReportConfigSurfaceProps = {
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
};

export function ReportConfigSurface({
  title,
  description,
  footer,
  children,
}: ReportConfigSurfaceProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-border/60 bg-muted/20" data-testid="report-config-surface">
      <div className="px-4 pt-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      <div className="px-4 py-4">{children}</div>
      {footer ? (
        <div className="border-t border-border/70 bg-background/70 px-4 py-3">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
