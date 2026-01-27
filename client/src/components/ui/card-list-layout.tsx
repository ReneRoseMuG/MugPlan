import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Plus, Loader2 } from "lucide-react";

interface CardListLayoutProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  isLoading?: boolean;
  onClose?: () => void;
  closeTestId?: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    isPending?: boolean;
    testId?: string;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    testId?: string;
  };
  gridTestId?: string;
  gridCols?: "2" | "3";
  emptyState?: ReactNode;
  isEmpty?: boolean;
}

export function CardListLayout({
  title,
  icon,
  children,
  isLoading = false,
  onClose,
  closeTestId,
  primaryAction,
  secondaryAction,
  gridTestId,
  gridCols = "3",
  emptyState,
  isEmpty = false,
}: CardListLayoutProps) {
  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="bg-card">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const gridColsClass = gridCols === "2" 
    ? "grid-cols-1 md:grid-cols-2" 
    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card className="bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              {icon}
              {title}
            </CardTitle>
            {onClose && (
              <Button size="lg" variant="ghost" onClick={onClose} data-testid={closeTestId}>
                <X className="w-6 h-6" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className={`grid ${gridColsClass} gap-4`} data-testid={gridTestId}>
            {isEmpty && emptyState ? emptyState : children}
          </div>

          {(primaryAction || secondaryAction) && (
            <div className="mt-6 flex justify-between items-center">
              {primaryAction && (
                <Button
                  variant="outline"
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.isPending}
                  className="flex items-center gap-2"
                  data-testid={primaryAction.testId}
                >
                  {primaryAction.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {primaryAction.label}
                </Button>
              )}

              {secondaryAction && (
                <Button variant="ghost" onClick={secondaryAction.onClick} data-testid={secondaryAction.testId}>
                  {secondaryAction.label}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
