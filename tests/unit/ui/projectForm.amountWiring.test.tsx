/**
 * Test Scope:
 *
 * Feature: FT02 - Projektverwaltung
 * Use Case: UC Projektbetrag erfassen und speichern
 *
 * Abgedeckte Regeln:
 * - ProjectForm verwaltet ein lokales amount-Feld.
 * - Das Eingabefeld fuer Betrag ist im Formular verdrahtet.
 * - Save-Payload mappt amount als optionalen numerischen Wert oder null.
 *
 * Fehlerfälle:
 * - Betrag wird nicht in den Mutationspayload uebernommen.
 * - Betrag kann nicht ueber das Formularfeld erfasst werden.
 *
 * Ziel:
 * Sicherstellen, dass die Betragserfassung im Projektformular technisch korrekt verdrahtet ist.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT02 project form amount wiring", () => {
  const projectFormPath = path.resolve(process.cwd(), "client/src/components/ProjectForm.tsx");
  const projectOrderFormPath = path.resolve(process.cwd(), "client/src/components/ProjectOrderForm.tsx");
  const source = readFileSync(projectFormPath, "utf8");
  const projectOrderFormSource = readFileSync(projectOrderFormPath, "utf8");

  it("tracks amount in local form state and dirty snapshot", () => {
    expect(source).toContain("const [amount, setAmount] = useState(\"\")");
    expect(source).toContain("amount: input.amount.replace(\",\", \".\").trim()");
    expect(source).toContain("setInitialFormSnapshot(buildFormSnapshot({");
    expect(source).toContain("amount,");
    expect(source).toContain("productSelections,");
    expect(source).toContain("extractedArticleListHtml,");
    expect(source).toContain("customerId,");
  });

  it("renders amount input field with wiring", () => {
    expect(source).toContain("onAmountChange={setAmount}");
    expect(projectOrderFormSource).toContain("htmlFor=\"projectAmount\"");
    expect(projectOrderFormSource).toContain("id=\"projectAmount\"");
    expect(projectOrderFormSource).toContain("value={amount}");
    expect(projectOrderFormSource).toContain("onChange={(e) => onAmountChange(e.target.value)}");
    expect(projectOrderFormSource).toContain("data-testid=\"input-project-amount\"");
  });

  it("maps amount to create and update mutation payloads", () => {
    expect(source).toContain("const normalizedAmountText = amount.replace(\",\", \".\").trim();");
    expect(source).toContain("const normalizedAmount = parsedAmountNumber == null ? null : parsedAmountNumber.toFixed(2);");
    expect(source).toContain("amount: normalizedAmount");
    expect(source).toContain("Betrag ist ungueltig (max. 2 Nachkommastellen)");
  });
});
