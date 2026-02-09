import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HelpIcon } from "@/components/ui/help/help-icon";
import { Plus, X } from "lucide-react";

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
  count,
  helpKey,
  headerActions,
  addAction,
  closeAction,
  footer,
}: SidebarChildPanelProps) {
  const hasCount = typeof count === "number";

  return (
    <div className="sub-panel flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center flex-wrap gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
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
        <div className="flex items-center gap-2">
          {headerActions ?? (
            <>
              {addAction && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={addAction.onClick}
                  disabled={addAction.disabled}
                  aria-label={addAction.ariaLabel ?? "Element hinzufügen"}
                  data-testid={addAction.testId}
                >
                  <Plus className="w-5 h-5" />
                </Button>
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

      <div className="space-y-3">
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
