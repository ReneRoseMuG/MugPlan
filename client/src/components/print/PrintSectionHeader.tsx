import React from "react";

type PrintSectionHeaderProps = {
  label: string;
};

export function PrintSectionHeader({ label }: PrintSectionHeaderProps) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">{label}</p>
  );
}
