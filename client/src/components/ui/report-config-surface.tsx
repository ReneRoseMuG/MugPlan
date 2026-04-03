import type { ReactNode } from "react";
import { HelpIcon } from "@/components/ui/help/help-icon";

type ReportConfigSurfaceProps = {
  title: string;
  helpKey?: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
};

export function ReportConfigSurface({
  title,
  helpKey,
  description,
  footer,
  children,
}: ReportConfigSurfaceProps) {
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-lg border border-border/60 bg-muted/20" data-testid="report-config-surface">
      <div className="px-4 pt-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            {helpKey ? <HelpIcon helpKey={helpKey} size="sm" /> : null}
          </div>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-4 py-4">{children}</div>
      {footer ? (
        <div className="border-t border-border/70 bg-background/70 px-4 py-3">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
