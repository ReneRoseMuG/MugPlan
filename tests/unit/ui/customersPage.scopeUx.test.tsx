/**
 * Test Scope:
 *
 * Feature: FT05+ - Rollenbasierte Filter-UX fuer Kunden
 * Use Case: UC Kundenliste mit Inaktive-Switch nur fuer Admin
 *
 * Abgedeckte Regeln:
 * - Admin sieht den Scope-Switch "Inaktive".
 * - Nicht-Admin erhaelt keinen Scope-Switch im Filterpanel.
 * - Kundenliste sendet Scope active/inactive statt Mischmodus.
 *
 * Fehlerfaelle:
 * - Inaktive-Sicht fuer Admin fehlt.
 * - Nicht-Admin kann inaktive Kundensichten aktivieren.
 *
 * Ziel:
 * Absichern, dass die Kundenlisten-UX die FT05+-Rollensteuerung korrekt umsetzt.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT05+ customers scope UX wiring", () => {
  const pagePath = path.resolve(process.cwd(), "client/src/components/CustomersPage.tsx");
  const panelPath = path.resolve(process.cwd(), "client/src/components/ui/filter-panels/customer-filter-panel.tsx");
  const inputPath = path.resolve(process.cwd(), "client/src/components/filters/customer-inactive-scope-filter-input.tsx");
  const pageSource = readFileSync(pagePath, "utf8");
  const panelSource = readFileSync(panelPath, "utf8");
  const inputSource = readFileSync(inputPath, "utf8");

  it("wires admin-only customer scope switch", () => {
    expect(pageSource).toContain("const [customerScope, setCustomerScope] = useState<\"active\" | \"inactive\">(\"active\")");
    expect(pageSource).toContain("const effectiveCustomerScope = isAdmin ? customerScope : \"active\"");
    expect(pageSource).toContain("customerScope={isAdmin ? customerScope : undefined}");
    expect(pageSource).toContain("onCustomerScopeChange={isAdmin ? setCustomerScope : undefined}");
  });

  it("uses inactive toggle label and scope query", () => {
    expect(panelSource).toContain("CustomerInactiveScopeFilterInput");
    expect(inputSource).toContain("label=\"Inaktive\"");
    expect(pageSource).toContain("/api/customers?scope=${effectiveCustomerScope}");
  });
});
