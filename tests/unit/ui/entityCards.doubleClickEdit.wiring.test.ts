/**
 * Test Scope:
 *
 * Feature: FT17 - EntityCard Interaktionsmodell
 * Use Case: UC Bearbeiten ueber Doppelklick statt Footer-Edit-Button
 *
 * Abgedeckte Regeln:
 * - Domain-Card-Views nutzen Doppelklick als Edit-Einstieg.
 * - Redundante Edit-Buttons sind in den betroffenen Karten entfernt.
 *
 * Fehlerfaelle:
 * - Edit-Buttons bleiben in Karten sichtbar und erzeugen redundante Interaktion.
 * - Doppelklick-Wiring fehlt nach Entfernen der Buttons.
 *
 * Ziel:
 * Sicherstellen, dass das globale Doppelklick-Edit-Pattern in den betroffenen EntityCards konsistent angewendet ist.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT17 entity cards double-click edit wiring", () => {
  it("keeps double-click edit and removes footer edit buttons in board cards", () => {
    const projectsPage = readFileSync(path.resolve(process.cwd(), "client/src/components/ProjectsPage.tsx"), "utf8");
    const customersPage = readFileSync(path.resolve(process.cwd(), "client/src/components/CustomersPage.tsx"), "utf8");
    const employeesPage = readFileSync(path.resolve(process.cwd(), "client/src/components/EmployeesPage.tsx"), "utf8");
    const helpTextsPage = readFileSync(path.resolve(process.cwd(), "client/src/components/HelpTextsPage.tsx"), "utf8");
    const teamManagementPage = readFileSync(path.resolve(process.cwd(), "client/src/components/TeamManagement.tsx"), "utf8");
    const noteTemplatesPage = readFileSync(path.resolve(process.cwd(), "client/src/components/NoteTemplatesPage.tsx"), "utf8");

    expect(projectsPage).toContain("onDoubleClick={handleSelect}");
    expect(projectsPage).not.toContain("button-edit-project-");

    expect(customersPage).toContain("onDoubleClick={handleSelect}");
    expect(customersPage).not.toContain("button-edit-customer-");

    expect(employeesPage).toContain("onDoubleClick={() => handleOpenDetail(employee)}");
    expect(employeesPage).not.toContain("button-edit-employee-");

    expect(helpTextsPage).toContain("onDoubleClick={() => onEditHelpText(helpText.id)}");
    expect(helpTextsPage).not.toContain("button-edit-helptext-");

    expect(teamManagementPage).toContain("onDoubleClick={() => handleOpenEdit(team)}");
    expect(teamManagementPage).not.toContain("button-edit-team-members-");

    expect(noteTemplatesPage).toContain("onDoubleClick={onEdit}");
    expect(noteTemplatesPage).not.toContain("button-edit-template-");
  });
});

