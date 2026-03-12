import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ListPagingFooterProps {
  summaryText?: string;
  page: number;
  totalPages: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  prevTestId: string;
  nextTestId: string;
  stateTestId: string;
  leadingSlot?: ReactNode;
  trailingSlot?: ReactNode;
  className?: string;
}

export function ListPagingFooter({
  summaryText,
  page,
  totalPages,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  prevTestId,
  nextTestId,
  stateTestId,
  leadingSlot,
  trailingSlot,
  className,
}: ListPagingFooterProps) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      {leadingSlot ?? <span />}

      <div className="ml-auto flex items-center justify-end gap-2">
        {summaryText ? (
          <p className="text-sm text-muted-foreground">
            {summaryText}
          </p>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={!canGoPrev}
          data-testid={prevTestId}
        >
          &lt;&lt;&lt;
        </Button>

        <span className="text-sm text-muted-foreground" data-testid={stateTestId}>
          Seite {totalPages === 0 ? 0 : page} von {totalPages}
        </span>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={!canGoNext}
          data-testid={nextTestId}
        >
          &gt;&gt;&gt;
        </Button>

        {trailingSlot}
      </div>
    </div>
  );
}
