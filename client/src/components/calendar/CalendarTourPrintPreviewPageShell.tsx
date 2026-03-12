import React from "react";
import type { ReactNode } from "react";

type CalendarTourPrintPreviewPageShellProps = {
  orientation: "portrait" | "landscape";
  children: ReactNode;
  testId?: string;
};

export function CalendarTourPrintPreviewPageShell({
  orientation,
  children,
  testId,
}: CalendarTourPrintPreviewPageShellProps) {
  const orientationClass =
    orientation === "portrait"
      ? "tour-print-page--portrait w-[720px] min-h-[1020px]"
      : "tour-print-page--landscape w-[1080px] min-h-[720px]";

  return (
    <section
      className={`tour-print-page ${orientationClass} mx-auto flex flex-col gap-5 border border-slate-300 bg-white p-8 shadow-lg`}
      data-testid={testId}
      data-print-orientation={orientation}
    >
      {children}
    </section>
  );
}
