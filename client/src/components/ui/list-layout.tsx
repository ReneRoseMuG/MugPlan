import { type ReactNode } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpIcon } from "@/components/ui/help/help-icon";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ListLayoutProps {
  title: string;
  icon: ReactNode;
  viewModeKey?: string;
  contentSlot: ReactNode;
  filterSlot?: ReactNode;
  viewModeToggle?: ReactNode;
  headerActions?: ReactNode;
  footerSlot?: ReactNode;
  helpKey?: string;
  isLoading?: boolean;
  onClose?: () => void;
  showCloseButton?: boolean;
  closeTestId?: string;
  className?: string;
  contentClassName?: string;
}

export function ListLayout({
  title,
  icon,
  viewModeKey,
  contentSlot,
  filterSlot,
  viewModeToggle,
  headerActions,
  footerSlot,
  helpKey,
  isLoading = false,
  onClose,
  showCloseButton = true,
  closeTestId,
  className,
  contentClassName,
}: ListLayoutProps) {
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="bg-card p-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </Card>
      </div>
    );
  }

  return (
    <Card
      className={cn("bg-card h-full flex flex-col overflow-hidden", className)}
      data-view-mode-key={viewModeKey}
    >
      <CardHeader className="pb-4 flex-shrink-0 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <CardTitle className="text-lg font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              {icon}
              {title}
            </CardTitle>
            {helpKey && <HelpIcon helpKey={helpKey} />}
          </div>

          <div className="flex items-center gap-2">
            {viewModeToggle}
            {headerActions}
            {onClose && showCloseButton && (
              <Button size="lg" variant="ghost" onClick={onClose} data-testid={closeTestId}>
                <X className="w-6 h-6" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {filterSlot && (
        <div className="flex-shrink-0 border-b border-border px-6 py-4 bg-card">
          {filterSlot}
        </div>
      )}

      <div className={cn("flex-1 min-h-0", contentClassName)}>{contentSlot}</div>

      {footerSlot && (
        <div className="flex-shrink-0 border-t border-border px-6 py-4 bg-card">
          {footerSlot}
        </div>
      )}
    </Card>
  );
}
