import type { ReactNode } from "react";

interface FilterPanelProps {
  title: string;
  layout?: "row" | "stack";
  children: ReactNode;
}

export function FilterPanel({
  title,
  layout = "row",
  children,
}: FilterPanelProps) {
  const layoutClassName = layout === "stack"
    ? "flex flex-col gap-4"
    : "flex flex-col gap-4 sm:flex-row sm:items-end";

  return (
    <div className="flex flex-col gap-2">
      <span className="sr-only">{title}</span>
      <div className={layoutClassName}>
        {children}
      </div>
    </div>
  );
}
