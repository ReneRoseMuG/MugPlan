import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MembersSectionHeaderProps {
  title?: string;
  action?: ReactNode;
  className?: string;
  titleClassName?: string;
}

export function MembersSectionHeader({
  title = "Mitarbeiter",
  action,
  className,
  titleClassName,
}: MembersSectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <div
        className={cn(
          "text-xs font-semibold uppercase tracking-wide leading-tight text-slate-600 dark:text-slate-300",
          titleClassName,
        )}
      >
        {title}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
