/**
 * Test Scope:
 *
 * Feature: FT29 - Kontextueller Kalenderfluss
 * Use Case: UC ReturnContext fuer kontextuelle Kalender-Navigation
 *
 * Abgedeckte Regeln:
 * - Home fuehrt eine eigene View-Variante `calendarContextual`.
 * - Home verwaltet `calendarContext` mit `returnContext`.
 * - Rueckkehr aus dem Terminformular nutzt `returnContext` deterministisch.
 *
 * Fehlerfaelle:
 * - Kontextueller Kalender kann nicht in den Aufruferkontext zurueckkehren.
 * - Rueckweg verliert Projektbezug durch fehlende ReturnContext-Verdrahtung.
 *
 * Ziel:
 * Stabilen Rueckfluss fuer aktuelle und kuenftige Aufrufer regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT29 UI: home contextual return context wiring", () => {
  const source = readFileSync(path.resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

  it("extends view type and state with contextual calendar structures", () => {
    expect(source).toContain("\"calendarContextual\"");
    expect(source).toContain("type ReturnContext = {");
    expect(source).toContain("const [calendarContext, setCalendarContext] = useState<{");
  });

  it("uses returnContext when returning from appointment", () => {
    expect(source).toContain("if (context?.returnContext) {");
    expect(source).toContain("applyReturnContext(context.returnContext);");
  });

  it("wires contextual calendar mode and project form entrypoint", () => {
    expect(source).toContain("onOpenCalendarWorkspace={(context) => {");
    expect(source).toContain("setView(\"calendarContextual\");");
    expect(source).toContain("<CalendarWorkspace");
    expect(source).toContain("mode=\"contextual\"");
  });
});
