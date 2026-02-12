import { type ReactNode } from "react";
import { useSetting } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";

export interface BoardViewProps {
  children: ReactNode;
  gridCols?: "2" | "3";
  toolbar?: ReactNode;
  emptyState?: ReactNode;
  isEmpty?: boolean;
  gridTestId?: string;
  className?: string;
  containerClassName?: string;
}

export function BoardView({
  children,
  gridCols = "3",
  toolbar,
  emptyState,
  isEmpty = false,
  gridTestId,
  className,
  containerClassName,
}: BoardViewProps) {
  const preferredCardListColumns = useSetting("cardListColumns");

  const resolvedDynamicGridCols =
    typeof preferredCardListColumns === "number"
    && Number.isInteger(preferredCardListColumns)
    && preferredCardListColumns >= 2
    && preferredCardListColumns <= 6
      ? preferredCardListColumns
      : 4;

  const gridColsClass = (() => {
    if (gridCols === "2") return "grid-cols-1 md:grid-cols-2";

    const classByCols: Record<number, string> = {
      2: "grid-cols-1 md:grid-cols-2",
      3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
      5: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
      6: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6",
    };

    return classByCols[resolvedDynamicGridCols] ?? classByCols[4];
  })();

  return (
    <div className={cn("h-full overflow-auto p-6", containerClassName)}>
      {toolbar && <div className="mb-4">{toolbar}</div>}
      <div className={cn("grid gap-4", gridColsClass, className)} data-testid={gridTestId}>
        {isEmpty && emptyState ? emptyState : children}
      </div>
    </div>
  );
}
