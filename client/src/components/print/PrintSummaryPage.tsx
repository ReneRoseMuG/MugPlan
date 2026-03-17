import React from "react";
import type { ReactNode } from "react";
import { PrintPageShell } from "./PrintPageShell";

type PrintSummaryPageProps = {
  header: ReactNode;
  sections: ReactNode[];
  testId?: string;
};

export function PrintSummaryPage({ header, sections, testId }: PrintSummaryPageProps) {
  return (
    <PrintPageShell orientation="portrait" testId={testId}>
      {header}
      {sections.map((section, index) => (
        <React.Fragment key={index}>{section}</React.Fragment>
      ))}
    </PrintPageShell>
  );
}
