/**
 * Test Scope:
 *
 * Feature: FT16 - Hilfetexte in Sidebar-Panels
 * Use Case: UC Dokumenten-Panels mit kontextspezifischen Hilfe-Keys
 *
 * Abgedeckte Regeln:
 * - AttachmentsPanel akzeptiert optionalen helpKey-Prop.
 * - AttachmentsPanel reicht helpKey an SidebarChildPanel weiter.
 * - Projekt-/Kunden-/Mitarbeiter-Wrapper setzen individuelle panel-spezifische HelpKeys.
 *
 * Fehlerfaelle:
 * - HelpIcon kann fuer Dokumentenpanels nicht aktiviert werden.
 * - Mehrere Panels teilen denselben unspezifischen Key.
 *
 * Ziel:
 * Die Verdrahtung der Help-Icon-Funktion fuer alle Dokumenten-Sidebar-Panels regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT16 attachments panels help key wiring", () => {
  const attachmentsPanelSource = readFileSync(
    path.resolve(process.cwd(), "client/src/components/AttachmentsPanel.tsx"),
    "utf8",
  );
  const projectWrapperSource = readFileSync(
    path.resolve(process.cwd(), "client/src/components/ProjectAttachmentsPanel.tsx"),
    "utf8",
  );
  const customerWrapperSource = readFileSync(
    path.resolve(process.cwd(), "client/src/components/CustomerAttachmentsPanel.tsx"),
    "utf8",
  );
  const employeeWrapperSource = readFileSync(
    path.resolve(process.cwd(), "client/src/components/EmployeeAttachmentsPanel.tsx"),
    "utf8",
  );

  it("extends AttachmentsPanel props and forwards helpKey", () => {
    expect(attachmentsPanelSource).toContain("helpKey?: string;");
    expect(attachmentsPanelSource).toContain("helpKey,");
    expect(attachmentsPanelSource).toContain("helpKey={helpKey}");
  });

  it("sets panel-specific help keys in all attachment wrappers", () => {
    expect(projectWrapperSource).toContain("helpKey=\"projects.sidebar.attachments\"");
    expect(customerWrapperSource).toContain("helpKey=\"customers.sidebar.attachments\"");
    expect(employeeWrapperSource).toContain("helpKey=\"employees.sidebar.attachments\"");
  });
});

