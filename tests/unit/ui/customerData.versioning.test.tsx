/**
 * Test Scope:
 *
 * Feature: FT05+ - Kunden Locking im Frontend
 * Use Case: UC Kundendaten speichern mit Optimistic Locking
 *
 * Abgedeckte Regeln:
 * - PATCH auf Kundendaten sendet verpflichtend die aktuelle Version.
 * - Admin darf isActive im Payload setzen, Nicht-Admin nur readonly.
 * - Leere Telefonnummer wird nur nach Bestaetigung gespeichert und als "0" persistiert.
 * - VERSION_CONFLICT und FORBIDDEN werden codebasiert gemappt.
 *
 * Fehlerfaelle:
 * - Fehlende Version wuerde zu VALIDATION_ERROR fuehren.
 * - Konflikte werden ohne Code-Mapping als generische Meldung angezeigt.
 *
 * Ziel:
 * Sicherstellen, dass CustomerData den Multi-User-Locking-Contract contract-konform verdrahtet.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT05+ customer data versioning wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/CustomerData.tsx");
  const source = readFileSync(filePath, "utf8");

  it("sends customer version in update payload", () => {
    expect(source).toContain("version: customer.version");
    expect(source).toContain("const payload = {");
    expect(source).toContain("await apiRequest('PATCH', `/api/customers/${customerId}`, payload)");
  });

  it("guards isActive mutation to admin in payload and UI", () => {
    expect(source).toContain("isActive: isAdmin ? data.isActive : undefined");
    expect(source).toContain("disabled={!isAdmin}");
    expect(source).toContain("onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked === true }))}");
  });

  it("maps VERSION_CONFLICT and FORBIDDEN with dedicated messages", () => {
    expect(source).toContain("if (code === \"VERSION_CONFLICT\")");
    expect(source).toContain("if (code === \"FORBIDDEN\")");
    expect(source).toContain("zwischenzeitlich geaendert");
    expect(source).toContain("nur fuer Admin erlaubt");
  });

  it("supports empty phone via confirmation fallback to 0 and no mandatory star label", () => {
    expect(source).toContain("window.confirm(\"Telefon ist leer. Soll trotzdem gespeichert und Telefon auf 0 gesetzt werden?\")");
    expect(source).toContain("submitData = { ...formData, phone: \"0\" };");
    expect(source).toContain("setFormData((prev) => ({ ...prev, phone: \"0\" }))");
    expect(source).toContain("<Label htmlFor=\"phone\" data-testid=\"label-phone\">Telefon</Label>");
  });
});
