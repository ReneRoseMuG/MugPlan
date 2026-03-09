/**
 * Test Scope:
 *
 * Feature: FT03 - Wochenkalender Termin-Karten
 * Use Case: UC Weekly Header- und Panel-Inhalte
 *
 * Abgedeckte Regeln:
 * - Weekly-Header nutzt Datums-, Zeit- und Mehrtagesinformationen statt Auftragsnummer.
 * - Projektblock rendert die Auftragsnummer zusammen mit dem Projekttitel.
 * - Kundenblock nutzt den bestehenden CustomerDetailCard im Hover.
 * - Notizen bleiben im Weekly-Kontext auch bei 0 sichtbar.
 * - Termin-Info-Badge nutzt ausschliesslich die Weekly-Panel-Preview.
 *
 * Fehlerfaelle:
 * - Weekly-Header zeigt weiterhin die Auftragsnummer.
 * - Kunden- oder Notiz-Preview verschwindet aus der Wochenkarte.
 *
 * Ziel:
 * Sicherstellen, dass Weekly-Preview und Wochenkarte die neuen Inhaltszonen korrekt verdrahten.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("FT03 appointment weekly panel wiring", () => {
  it("passes date and time information into weekly header panel", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentPanel.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("startDate={appointment.startDate}");
    expect(source).toContain("endDate={appointment.endDate}");
    expect(source).toContain("startTime={appointment.startTime}");
    expect(source).toContain("WEEK_CARD_FOOTER_SAFE_SPACE_PX");
    expect(source).toContain('height: `${uniformHeightPx + WEEK_CARD_FOOTER_SAFE_SPACE_PX}px`');
  });

  it("renders header top line with time/date/day count and second line with customer and postal code", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentPanelHeader.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("CalendarRange");
    expect(source).toContain("const dayCountLabel = `${dayCount} ${dayCount === 1 ? \"Tag\" : \"Tage\"}`;");
    expect(source).toContain('const resolvedStartTime = startTime?.trim().slice(0, 5) || null;');
    expect(source).toContain("const topLineItems = [resolvedStartTime, formattedStartDate].filter(Boolean);");
    expect(source).toContain("{topLineItems.join(\" | \")}");
    expect(source).toContain("{dayCountLabel}");
    expect(source).toContain("K: {resolvedCustomerNumber}");
    expect(source).toContain("PLZ: {resolvedPostalCode}");
  });

  it("renders weekly project header and description as HTML", () => {
    const filePath = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentPanelProject.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("projectOrderNumber: string | null;");
    expect(source).toContain("const resolvedProjectHeader = [projectOrderNumber?.trim() || \"-\", projectName].join(\" - \");");
    expect(source).toContain("data-testid=\"week-project-header\"");
    expect(source).toContain("dangerouslySetInnerHTML={{ __html: projectDescription }}");
    expect(source).toContain("[&_ul]:list-disc");
  });

  it("uses customer detail card hover and keeps notes visible when no preview is available", () => {
    const customerFile = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentPanelCustomer.tsx");
    const customerSource = readFileSync(customerFile, "utf8");
    const notesFile = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekAppointmentNotesHover.tsx");
    const notesSource = readFileSync(notesFile, "utf8");

    expect(customerSource).toContain("<CustomerDetailCard customer={customerPreview} testId=\"week-customer-preview\" />");
    expect(customerSource).toContain("data-testid=\"week-customer-hover-trigger\"");
    expect(notesSource).toContain("data-testid=\"week-appointment-notes-static-trigger\"");
    expect(notesSource).toContain("<span>0</span>");
  });

  it("uses weekly-only preview in termin badge with sidebar/table size profile", () => {
    const badgeFile = path.resolve(process.cwd(), "client/src/components/ui/termin-info-badge.tsx");
    const badgeSource = readFileSync(badgeFile, "utf8");

    expect(badgeSource).toContain('createAppointmentWeeklyPanelPreview(previewAppointment, { sizeProfile: "sidebarTable" })');
    expect(badgeSource).not.toContain("createAppointmentInfoBadgePreview");
  });

  it("enables tour name row only in weekly panel previews", () => {
    const previewFile = path.resolve(process.cwd(), "client/src/components/ui/badge-previews/appointment-weekly-panel-preview.tsx");
    const previewSource = readFileSync(previewFile, "utf8");
    const weekViewFile = path.resolve(process.cwd(), "client/src/components/calendar/CalendarWeekView.tsx");
    const weekViewSource = readFileSync(weekViewFile, "utf8");

    expect(previewSource).toContain("showPreviewTourNameLine");
    expect(weekViewSource).not.toContain("showPreviewTourNameLine");
  });
});
