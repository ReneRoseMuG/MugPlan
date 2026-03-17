/**
 * Test Scope:
 *
 * Feature: Formular-Overlay – Sidebar-Ausblendung beim Bearbeiten
 *
 * Abgedeckte Regeln:
 * - Home blendet die Sidebar aus, wenn eines der 5 Bearbeitungsformulare aktiv ist.
 * - Kunden- und Projekt-Formular sind an die Views "customer" / "project" gebunden;
 *   die Sidebar wird allein ueber den View-State ausgeblendet.
 * - Mitarbeiter-, Tour- und Team-Formular melden ihren Edit-Zustand ueber einen
 *   `onEditingChange`-Callback an Home zurueck; Home blendet die Sidebar erst dann
 *   aus, wenn der Callback mit `true` gerufen wurde.
 * - `handleViewChange` setzt die drei Edit-Visible-States zurueck, sobald der
 *   Nutzer zu einer anderen View navigiert.
 *
 * Fehlerfaelle:
 * - `isSidebarHidden` fehlt oder prueft falsche Bedingungen.
 * - Callbacks werden nicht an EmployeesPage, TourManagement oder TeamManagement
 *   weitergegeben.
 * - Edit-States werden beim View-Wechsel nicht zurueckgesetzt (Sidebar bleibt versteckt).
 *
 * Ziel:
 * Das neue Sidebar-Ausblend-Verhalten fuer alle fuenf Formulare regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("Formular-Overlay: Sidebar-Ausblendung beim Bearbeiten", () => {
  const home = readFileSync(path.resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
  const employeesPage = readFileSync(path.resolve(process.cwd(), "client/src/components/EmployeesPage.tsx"), "utf8");
  const tourManagement = readFileSync(path.resolve(process.cwd(), "client/src/components/TourManagement.tsx"), "utf8");
  const teamManagement = readFileSync(path.resolve(process.cwd(), "client/src/components/TeamManagement.tsx"), "utf8");

  describe("Home.tsx – isSidebarHidden-Logik", () => {
    it("definiert drei Edit-Visible-States fuer Employee, Tour und Team", () => {
      expect(home).toContain('const [employeeFormVisible, setEmployeeFormVisible] = useState(false);');
      expect(home).toContain('const [tourFormVisible, setTourFormVisible] = useState(false);');
      expect(home).toContain('const [teamFormVisible, setTeamFormVisible] = useState(false);');
    });

    it("berechnet isSidebarHidden mit allen fuenf Formular-Bedingungen", () => {
      expect(home).toContain("const isSidebarHidden =");
      expect(home).toContain('view === "customer"');
      expect(home).toContain('view === "project"');
      expect(home).toContain('view === "employees" && employeeFormVisible');
      expect(home).toContain('view === "tours" && tourFormVisible');
      expect(home).toContain('view === "teams" && teamFormVisible');
    });

    it("blendet die Sidebar aus wenn isSidebarHidden oder isContextualCalendarView", () => {
      expect(home).toContain("isContextualCalendarView || isSidebarHidden ? null : (");
    });

    it("gibt onEditingChange-Callbacks an EmployeesPage, TourManagement und TeamManagement weiter", () => {
      expect(home).toContain("onEditingChange={setEmployeeFormVisible}");
      expect(home).toContain("onEditingChange={setTourFormVisible}");
      expect(home).toContain("onEditingChange={setTeamFormVisible}");
    });

    it("setzt Employee-Form-State beim Verlassen der employees-View zurueck", () => {
      expect(home).toMatch(/newView !== "employees"[\s\S]*?setEmployeeFormVisible\(false\)/);
    });

    it("setzt Tour-Form-State beim Verlassen der tours-View zurueck", () => {
      expect(home).toMatch(/newView !== "tours"[\s\S]*?setTourFormVisible\(false\)/);
    });

    it("setzt Team-Form-State beim Verlassen der teams-View zurueck", () => {
      expect(home).toMatch(/newView !== "teams"[\s\S]*?setTeamFormVisible\(false\)/);
    });
  });

  describe("EmployeesPage.tsx – onEditingChange Callback", () => {
    it("deklariert onEditingChange als optionale Prop", () => {
      expect(employeesPage).toContain("onEditingChange?: (isEditing: boolean) => void;");
    });

    it("nimmt onEditingChange im Destrukturierungsparameter entgegen", () => {
      expect(employeesPage).toContain("onEditingChange");
    });

    it("ruft onEditingChange per useEffect auf wenn isCreating oder selectedEmployeeId sich aendert", () => {
      expect(employeesPage).toContain("onEditingChange?.(isCreating || selectedEmployeeId !== null);");
      expect(employeesPage).toMatch(/useEffect\([^)]*\(\) => \{[\s\S]*?onEditingChange\?\.\(isCreating \|\| selectedEmployeeId !== null\)[\s\S]*?\}, \[isCreating, selectedEmployeeId, onEditingChange\]\)/);
    });
  });

  describe("TourManagement.tsx – onEditingChange Callback", () => {
    it("deklariert onEditingChange als optionale Prop", () => {
      expect(tourManagement).toContain("onEditingChange?: (isEditing: boolean) => void;");
    });

    it("ruft onEditingChange per useEffect auf wenn editingTour oder isCreating sich aendert", () => {
      expect(tourManagement).toContain("onEditingChange?.(!!editingTour || isCreating);");
      expect(tourManagement).toMatch(/useEffect\([^)]*\(\) => \{[\s\S]*?onEditingChange\?\.\(!!editingTour \|\| isCreating\)[\s\S]*?\}, \[editingTour, isCreating, onEditingChange\]\)/);
    });
  });

  describe("TeamManagement.tsx – onEditingChange Callback", () => {
    it("deklariert onEditingChange als optionale Prop", () => {
      expect(teamManagement).toContain("onEditingChange?: (isEditing: boolean) => void;");
    });

    it("ruft onEditingChange per useEffect auf wenn editingTeam oder isCreating sich aendert", () => {
      expect(teamManagement).toContain("onEditingChange?.(!!editingTeam || isCreating);");
      expect(teamManagement).toMatch(/useEffect\([^)]*\(\) => \{[\s\S]*?onEditingChange\?\.\(!!editingTeam \|\| isCreating\)[\s\S]*?\}, \[editingTeam, isCreating, onEditingChange\]\)/);
    });
  });
});
