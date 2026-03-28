import React from "react";
import type { ReactNode } from "react";

const PAGE_DIMENSIONS_MM = {
  portrait: { width: 210, height: 297 },
  landscape: { width: 297, height: 210 },
} as const;

type PrintPageShellProps = {
  orientation: "portrait" | "landscape";
  children: ReactNode;
  paddingMm?: number;
  testId?: string;
};

export function PrintPageShell({ orientation, children, paddingMm = 10, testId }: PrintPageShellProps) {
  const dimensions = PAGE_DIMENSIONS_MM[orientation];

  return (
    <section
      className="mx-auto flex flex-col gap-5 border border-slate-300 bg-white text-slate-900 shadow-lg print:shadow-none"
      data-testid={testId}
      data-print-orientation={orientation}
      style={{
        width: `${dimensions.width}mm`,
        minHeight: `${dimensions.height}mm`,
        padding: `${paddingMm}mm`,
        boxSizing: "border-box",
      }}
    >
      {children}
    </section>
  );
}
