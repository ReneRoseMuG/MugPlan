import React from "react";

type PrintSlimHeaderProps = {
  label: string;
  context?: string;
  testId?: string;
};

export function PrintSlimHeader({ label, context, testId }: PrintSlimHeaderProps) {
  const content = context ? `${label} — ${context}` : label;

  return (
    <header
      className="border-b border-slate-200 pb-2 text-[10px] font-medium text-slate-500"
      data-testid={testId}
    >
      {content}
    </header>
  );
}
