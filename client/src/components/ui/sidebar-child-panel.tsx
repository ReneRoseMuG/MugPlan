import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CircleHelp, Plus, X } from "lucide-react";

interface HelpText {
  helpKey: string;
  title: string;
  body: string;
}

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
  const { data: helpText, isLoading: helpTextLoading, isError: helpTextError } = useQuery<HelpText | null>({
    queryKey: ["/api/help-texts", helpKey],
    enabled: !!helpKey,
    staleTime: 5 * 60 * 1000,
  });

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
          {helpKey && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  data-testid={`button-help-${helpKey}`}
                  aria-label={`Hilfe für ${title}`}
                >
                  <CircleHelp className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96 max-h-80 overflow-y-auto" align="start">
                {helpTextLoading ? (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Hilfe: {title}</h4>
                    <p className="text-sm text-muted-foreground">Hilfetext wird geladen...</p>
                  </div>
                ) : helpTextError ? (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Hilfe: {title}</h4>
                    <p className="text-sm text-destructive">Fehler beim Laden des Hilfetexts.</p>
                  </div>
                ) : helpText ? (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">{helpText.title}</h4>
                    <div
                      className="prose prose-sm max-w-none text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: helpText.body }}
                      data-testid={`text-help-body-${helpKey}`}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Hilfe: {title}</h4>
                    <p className="text-sm text-muted-foreground">
                      Kein Hilfetext für "{helpKey}" verfügbar.
                    </p>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          )}
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
