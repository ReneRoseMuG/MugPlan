import type { ReportAuftragslisteProjectRow } from "@shared/routes";
import { AuftragslisteProjectCard } from "@/components/reports/AuftragslisteProjectCard";
import type { ProduktionsplanungArticleCategory } from "@/components/reports/produktionsplanungProjectCard.shared";

export function AuftragslistePrintLayout({
  items,
  categories,
}: {
  items: ReportAuftragslisteProjectRow[];
  categories: ProduktionsplanungArticleCategory[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {items.map((row) => (
        <AuftragslisteProjectCard key={row.projectId} row={row} categories={categories} hideFooterBadges />
      ))}
    </div>
  );
}
