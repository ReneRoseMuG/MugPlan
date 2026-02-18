/**
 * Test Scope:
 *
 * Feature: FT02 - Projektverwaltung
 * Use Case: UC Auftragsnummer in Projektliste
 *
 * Abgedeckte Regeln:
 * - ProjectsPage verdrahtet den Auftragsnummer-Filter in das Projektfilterpanel.
 * - Auftragsnummer wird in Tabellen- und Board-Ansicht angezeigt.
 * - Board-Karten zeigen verknuepfte Projektstatus als gestapelte Badges unter der Auftragsnummer.
 * - PLZ/Ort werden in Projektkarten nicht mehr angezeigt.
 * - Projektbeschreibung in Board-Karten rendert HTML statt roher Tags.
 *
 * Fehlerfaelle:
 * - Filter ist vorhanden, aber nicht mit State verbunden.
 * - Auftragsnummer erscheint nur in einer der beiden Ansichten.
 * - Projektstatus-Badges fehlen oder sind nicht aus den Projekt-Status-Relationen verdrahtet.
 * - Ort/PLZ-Block wird weiterhin in der Karte gerendert.
 * - HTML-Tags werden in der Projektkarte als Text angezeigt.
 *
 * Ziel:
 * Sicherstellen, dass die Projektliste den neuen Auftragsnummer-Use-Case vollstaendig abdeckt.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("FT02 projects page order number wiring", () => {
  it("wires order number filter handlers", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ProjectsPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("orderNumber={filters.orderNumber}");
    expect(source).toContain("onOrderNumberChange={(value) => setFilter(\"orderNumber\", value)}");
    expect(source).toContain("onOrderNumberClear={() => setFilter(\"orderNumber\", \"\")}");
  });

  it("renders order number in table and board views", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ProjectsPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("header: \"Auftragsnummer\"");
    expect(source).toContain("<span className=\"font-semibold\">Auftrag:</span>");
    expect(source).toContain("project.orderNumber?.trim() || \"-\"");
  });

  it("renders stacked project status badges under order number in board cards", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ProjectsPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("`/api/projects/${projectId}/statuses`");
    expect(source).toContain("const assignedStatuses = projectStatusRelationsByProjectId.get(project.id) ?? [];");
    expect(source).toContain("data-testid={`project-status-stack-${project.id}`}");
    expect(source).toContain("<ProjectStatusInfoBadge");
    expect(source).toContain("fullWidth");
    expect(source).toContain("size=\"sm\"");
  });

  it("does not render postal code and city in board cards", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ProjectsPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).not.toContain("customer.postalCode ?? \"-\"");
    expect(source).not.toContain("customer.city ? ` ${customer.city}` : \"\"");
  });

  it("renders project description as html in board cards", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/ProjectsPage.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("dangerouslySetInnerHTML={{ __html: project.descriptionMd }}");
  });
});
