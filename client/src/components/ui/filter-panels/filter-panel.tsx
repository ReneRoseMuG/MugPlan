import type { ReactNode } from "react";

interface FilterPanelProps {
  title: string;
  layout?: "row" | "stack";
  showTitle?: boolean;
  children: ReactNode;
}

export function FilterPanel({
  title,
  layout = "row",
  showTitle = false,
  children,
}: FilterPanelProps) {
  const layoutClassName = layout === "stack"
    ? "flex flex-col gap-1"
    : "flex flex-col gap-2 sm:flex-row sm:items-end";

  return (
    <div className="flex flex-col gap-1">
      {showTitle ? (
        <p className="text-xs font-semibold tracking-wide text-muted-foreground">
          {title}
        </p>
      ) : (
        <span className="sr-only">{title}</span>
      )}
      <div className={layoutClassName}>
        {children}
      </div>
    </div>
  );
}
