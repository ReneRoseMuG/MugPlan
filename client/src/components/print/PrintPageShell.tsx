import React from "react";
import type { ReactNode } from "react";

const PAGE_DIMENSIONS_MM = {
  portrait: { width: 210, height: 297 },
  landscape: { width: 297, height: 210 },
} as const;

type PrintPageShellProps = {
  orientation: "portrait" | "landscape";
  children: ReactNode;
  footer?: ReactNode;
  paddingMm?: number;
  pageGapClassName?: string;
  contentGapClassName?: string;
  testId?: string;
};

export function PrintPageShell({
  orientation,
  children,
  footer,
  paddingMm = 10,
  pageGapClassName = "gap-5",
  contentGapClassName = "gap-5",
  testId,
}: PrintPageShellProps) {
  const dimensions = PAGE_DIMENSIONS_MM[orientation];

  return (
    <section
      className={`mx-auto shrink-0 flex flex-col justify-between overflow-hidden border border-slate-300 bg-white text-slate-900 shadow-lg print:shadow-none ${pageGapClassName}`}
      data-testid={testId}
      data-print-orientation={orientation}
      style={{
        width: `${dimensions.width}mm`,
        height: `${dimensions.height}mm`,
        padding: `${paddingMm}mm`,
        boxSizing: "border-box",
      }}
    >
      <div className={`flex min-h-0 flex-1 flex-col ${contentGapClassName}`}>
        {children}
      </div>
      {footer ? <div className="shrink-0">{footer}</div> : null}
    </section>
  );
}
