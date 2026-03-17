import React from "react";

import type { TourPrintPreviewPage } from "@/lib/tour-print-preview";
import { CalendarTourPrintMembersList } from "./CalendarTourPrintMembersList";
import { CalendarTourPrintSummaryTable } from "./CalendarTourPrintSummaryTable";
import { PrintSummaryPage } from "@/components/print/PrintSummaryPage";
import { PrintPageHeader } from "@/components/print/PrintPageHeader";

type CalendarTourPrintSummaryPageProps = {
  page: Extract<TourPrintPreviewPage, { kind: "summary" }>;
};

export function CalendarTourPrintSummaryPage({ page }: CalendarTourPrintSummaryPageProps) {
  return (
    <PrintSummaryPage
      testId="tour-print-summary-page"
      header={
        <PrintPageHeader
          eyebrow="Tourenplanung"
          headline={page.headline}
          subline={page.rangeLabel}
        />
      }
      sections={[
        <CalendarTourPrintMembersList key="members" members={page.members} />,
        <CalendarTourPrintSummaryTable key="table" rows={page.rows} />,
      ]}
    />
  );
}
