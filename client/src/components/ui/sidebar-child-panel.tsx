import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HelpIcon } from "@/components/ui/help/help-icon";
import { X } from "lucide-react";
import { PlusActionButton } from "@/components/ui/plus-action-button";
import { cn } from "@/lib/utils";

interface SidebarChildPanelAction {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  testId?: string;
}

interface SidebarChildPanelProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
  count?: number | null;
  helpKey?: string;
  headerActions?: ReactNode;
  addAction?: SidebarChildPanelAction;
  closeAction?: SidebarChildPanelAction;
  footer?: ReactNode;
}

export function SidebarChildPanel({
  title,
  icon,
  children,
  className,
  count,
  helpKey,
  headerActions,
  addAction,
  closeAction,
  footer,
}: SidebarChildPanelProps) {
  const hasCount = typeof count === "number";

  return (
    <div className={cn("sub-panel flex min-w-0 flex-col gap-4", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center flex-wrap gap-3">
          <h3 className="text-sm font-bold tracking-wider text-primary flex items-center gap-2">
            {icon}
            {title}
          </h3>
          {hasCount && (
            <Badge variant="secondary" className="text-xs">
              {count}
            </Badge>
          )}
          {helpKey && <HelpIcon helpKey={helpKey} />}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {headerActions ?? (
            <>
              {addAction && (
                <PlusActionButton
                  onClick={addAction.onClick}
                  disabled={addAction.disabled}
                  aria-label={addAction.ariaLabel ?? "Element hinzufügen"}
                  data-testid={addAction.testId}
                />
              )}
              {closeAction && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={closeAction.onClick}
                  disabled={closeAction.disabled}
                  aria-label={closeAction.ariaLabel ?? "Panel schließen"}
                  data-testid={closeAction.testId}
                >
                  <X className="w-5 h-5" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        {children}
      </div>

      {footer && (
        <div className="border-t border-border/50 pt-3">
          {footer}
        </div>
      )}
    </div>
  );
}
