import type { ReportAuftragslisteProjectRow } from "@shared/routes";
import { AuftragslisteProjectCard } from "@/components/reports/AuftragslisteProjectCard";

export function AuftragslistePrintProjectCard({
  row,
  useShortCodes = false,
}: {
  row: ReportAuftragslisteProjectRow;
  useShortCodes?: boolean;
}) {
  return <AuftragslisteProjectCard row={row} useShortCodes={useShortCodes} hideFooterBadges />;
}

export function AuftragslistePrintLayout({
  items,
  useShortCodes = false,
}: {
  items: ReportAuftragslisteProjectRow[];
  useShortCodes?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {items.map((row) => (
        <AuftragslistePrintProjectCard key={row.projectId} row={row} useShortCodes={useShortCodes} />
      ))}
    </div>
  );
}
