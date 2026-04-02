import React from "react";

type PrintSlimFooterProps = {
  pageNumber: number;
  testId?: string;
};

export function PrintSlimFooter({ pageNumber, testId }: PrintSlimFooterProps) {
  return (
    <footer
      className="border-t border-slate-200 pt-2 text-right text-[10px] text-slate-400"
      data-testid={testId}
    >
      {`Seite ${pageNumber}`}
    </footer>
  );
}
