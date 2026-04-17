import React, { type ReactNode } from "react";

interface EditFormContextTextProps {
  children?: ReactNode;
  className?: string;
  testId?: string;
}

export function EditFormContextText({
  children,
  className,
  testId,
}: EditFormContextTextProps) {
  if (children == null || children === false || children === "") {
    return null;
  }

  return (
    <p
      className={`min-w-0 break-words text-sm font-medium leading-snug text-slate-600${className ? ` ${className}` : ""}`}
      data-testid={testId}
    >
      {children}
    </p>
  );
}
