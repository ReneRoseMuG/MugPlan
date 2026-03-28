import React from "react";

type PrintSectionHeaderProps = {
  label: string;
  className?: string;
};

export function PrintSectionHeader({ label, className }: PrintSectionHeaderProps) {
  return (
    <p className={`text-xs font-semibold uppercase tracking-[0.28em] text-slate-500${className ? ` ${className}` : ""}`}>{label}</p>
  );
}
