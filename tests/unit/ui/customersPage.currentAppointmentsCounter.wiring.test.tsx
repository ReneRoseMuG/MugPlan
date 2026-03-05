/**
 * Test Scope:
 *
 * Feature: FT05+/FT13 - Kundenverwaltung
 * Use Case: UC Kundenkarte zeigt geplante Termine im Footer
 *
 * Abgedeckte Regeln:
 * - Die Kundenkarte zeigt den Footer-Text "Geplante Termine".
 * - Die Kundenkarte bindet fuer Notizen den wiederverwendbaren EntityNotesHoverPreview-Trigger.
 * - Der Counter basiert auf Terminen ab heute (startDate >= berlinToday).
 * - Der Kartenfooter ist explizit sichtbar geschaltet.
 *
 * Fehlerfaelle:
 * - Historische Termine werden im Counter mitgezaehlt.
 * - Footer bleibt unsichtbar und der Counter wird nicht angezeigt.
 *
 * Ziel:
 * Sicherstellen, dass der Footer-Counter "Geplante Termine" in CustomersPage korrekt verdrahtet ist.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT05+ customers page current appointments counter wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/CustomersPage.tsx");
  const source = readFileSync(filePath, "utf8");

  it("renders the planned appointments footer label", () => {
    expect(source).toContain("Geplante Termine:");
    expect(source).toContain("data-testid={`text-customer-planned-appointments-${customer.id}`}");
    expect(source).toContain("<EntityNotesHoverPreview");
    expect(source).toContain('sourceMode="single-parent"');
    expect(source).toContain('type: "customer", id: customer.id');
    expect(source).toContain("notesCount");
    expect(source).toContain("data-testid={`text-customer-notes-count-${customer.id}`}");
  });

  it("derives the counter from appointments starting today or later", () => {
    expect(source).toContain("const appointments = appointmentsByCustomerId.get(customer.id) ?? [];");
    expect(source).toContain("const plannedAppointmentsCount = appointments.filter((appointment) => appointment.startDate >= berlinToday).length;");
  });

  it("forces the entity card footer to be visible", () => {
    expect(source).toContain("footerVisibility=\"visible\"");
    expect(source).not.toContain("button-edit-customer-");
  });
});
