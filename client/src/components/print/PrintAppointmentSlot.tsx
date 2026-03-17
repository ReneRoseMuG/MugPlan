import React from "react";
import type { ReactNode } from "react";

type PrintAppointmentSlotProps = {
  header: ReactNode;
  body: ReactNode;
  footer?: ReactNode;
  testId?: string;
};

export function PrintAppointmentSlot({ header, body, footer, testId }: PrintAppointmentSlotProps) {
  return (
    <article
      className="rounded-lg border border-slate-300 bg-white p-2.5 shadow-sm"
      data-testid={testId}
    >
      {header}
      {body}
      {footer ? (
        <div className="mt-3 space-y-2 border-t border-slate-200 pt-2">{footer}</div>
      ) : null}
    </article>
  );
}
