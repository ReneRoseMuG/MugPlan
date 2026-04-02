import React from "react";
import type { ReactNode } from "react";

/**
 * @deprecated Use PrintSlimHeader plus PrintSlimFooter for active print pages.
 */
type PrintPageHeaderProps = {
  eyebrow: string;
  headline: string;
  subline?: string;
  rightSlot?: ReactNode;
};

export function PrintPageHeader({ eyebrow, headline, subline, rightSlot }: PrintPageHeaderProps) {
  return (
    <header className="space-y-5 border-b border-slate-200 pb-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">{eyebrow}</p>
          <div className="space-y-2">
            <h2 className="text-[28px] font-semibold leading-tight text-slate-900">{headline}</h2>
            {subline ? <p className="text-sm font-medium text-slate-600">{subline}</p> : null}
          </div>
        </div>
        {rightSlot ? <div>{rightSlot}</div> : null}
      </div>
    </header>
  );
}
