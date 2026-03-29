import { forwardRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FooterChildCollectionBadgeProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  icon: ReactNode;
  label: string;
  count: number;
  testId?: string;
  onHoverStart?: () => void;
  fullWidth?: boolean;
  inactive?: boolean;
  className?: string;
}

export const FooterChildCollectionBadge = forwardRef<HTMLDivElement, FooterChildCollectionBadgeProps>(function FooterChildCollectionBadge({
  icon,
  label,
  count,
  testId,
  onHoverStart,
  fullWidth = false,
  inactive = false,
  className,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
  ...divProps
}, ref) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      ref={ref}
      className={cn(
        "group flex h-7 min-w-0 items-center rounded-md border px-2 text-[10px] font-semibold transition-all duration-200 ease-out",
        fullWidth ? "w-full" : "shrink-0",
        inactive
          ? "cursor-pointer border-slate-200/80 bg-slate-100/80 text-slate-400 hover:bg-slate-100"
          : "cursor-pointer border-slate-200/90 bg-slate-50 text-slate-700 hover:bg-slate-100",
        className,
      )}
      data-testid={testId}
      onMouseEnter={(event) => {
        setExpanded(true);
        onHoverStart?.();
        onMouseEnter?.(event);
      }}
      onMouseMove={onMouseMove}
      onMouseLeave={(event) => {
        setExpanded(false);
        onMouseLeave?.(event);
      }}
      {...divProps}
    >
      <span className="flex shrink-0 items-center text-current">{icon}</span>
      <span
        className={cn(
          "overflow-hidden whitespace-nowrap text-current transition-all duration-200 ease-out",
          expanded ? "ml-1 max-w-[7.5rem] opacity-100" : "ml-0 max-w-0 opacity-0",
        )}
      >
        {label}
      </span>
      <span className="ml-1 shrink-0 tabular-nums text-current">{count}</span>
    </div>
  );
});
