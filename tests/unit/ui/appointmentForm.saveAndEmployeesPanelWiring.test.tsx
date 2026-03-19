/**
 * Test Scope:
 *
 * Feature: FT01 - Terminverwaltung
 * Use Case: UC Termin bearbeiten speichern / UC Mitarbeiter im Terminformular zuweisen
 *
 * Abgedeckte Regeln:
 * - Edit-Save (PATCH) sendet verpflichtend die Terminversion.
 * - Edit-Save wird blockiert, wenn keine gueltige Version verfuegbar ist.
 * - Delete-Flow nutzt vor dem DELETE eine frische Terminversion und sendet diese verpflichtend.
 * - Bei VERSION_CONFLICT wird genau ein Retry mit frisch geladener Version ausgefuehrt.
 * - AppointmentEmployeeSlot rendert einen Header-Action-Button (+) fuer die Auswahl.
 * - Team-, Tour- und Mitarbeiter-Badges liegen im selben hervorgehobenen Panel.
 * - Das Formular verdrahtet die Tour-Auswahl in das Mitarbeiterpanel und rendert die gesetzte Tour separat vollbreit.
 * - Ein initialer Tour-Kontext befuellt im Create-Fall Tour und aktive Tour-Mitarbeiter.
 * - Der bisherige grosse Button "Mitarbeiter auswaehlen" unterhalb der Liste wird nicht mehr gerendert.
 *
 * Fehlerfaelle:
 * - PATCH ohne version fuehrt zu VALIDATION_ERROR.
 * - Stale Version beim Loeschen fuehrt ohne Refresh zu VERSION_CONFLICT.
 * - Falsche Platzierung der Mitarbeiter-Auswahlaktion.
 *
 * Ziel:
 * Verdrahtung der Save-Precondition und der neuen Mitarbeiter-Panel-Action stabil absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT01 appointment form save and employees panel wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/AppointmentForm.tsx");
  const source = readFileSync(filePath, "utf8");
  const employeeSlotSource = readFileSync(
    path.resolve(process.cwd(), "client/src/components/AppointmentEmployeeSlot.tsx"),
    "utf8",
  );

  it("tracks appointment detail version for edit save", () => {
    expect(source).toContain("interface AppointmentDetail {");
    expect(source).toContain("version: number;");
  });

  it("blocks edit save when version is missing or invalid", () => {
    expect(source).toContain("if (isEditing && (typeof version !== \"number\" || !Number.isInteger(version) || version < 1)) {");
    expect(source).toContain("submit blocked: missing or invalid version");
    expect(source).toContain("Termin kann derzeit nicht gespeichert werden. Bitte neu laden.");
  });

  it("sends version in PATCH payload", () => {
    expect(source).toContain("const payload = isEditing");
    expect(source).toContain("? { ...basePayload, version }");
  });

  it("loads appointment detail always fresh in edit mode", () => {
    expect(source).toContain("staleTime: 0");
    expect(source).toContain("refetchOnMount: \"always\"");
    expect(source).toContain("refetchOnReconnect: true");
  });

  it("sends fresh version in DELETE payload and retries once on VERSION_CONFLICT", () => {
    expect(source).toContain("const fetchFreshVersion = async (): Promise<number> => {");
    expect(source).toContain("queryKey: [\"/api/appointments\", targetAppointmentId]");
    expect(source).toContain("body: JSON.stringify({ version })");
    expect(source).toContain("if (err.code !== \"VERSION_CONFLICT\") throw error;");
    expect(source).toContain("delete retry after VERSION_CONFLICT");
    expect(source).toContain("Termin wurde parallel geaendert. Bitte Formular neu oeffnen.");
  });

  it("maps delete errors by API code instead of raw status text", () => {
    expect(source).toContain("if (parsed?.code === \"VALIDATION_ERROR\")");
    expect(source).toContain("body: JSON.stringify({ version })");
    expect(source).toContain("if (err.code === \"PAST_APPOINTMENT_READONLY\" || err.status === 403)");
    expect(source).toContain("if (err.code === \"CANCELLED_APPOINTMENT_READONLY\")");
    expect(source).toContain("if (err.code === \"VERSION_CONFLICT\")");
    expect(source).toContain("if (err.code === \"VALIDATION_ERROR\")");
  });

  it("wires a dedicated one-way cancellation action with its own API endpoint", () => {
    expect(source).toContain("const cancelAppointmentMutation = useMutation({");
    expect(source).toContain("/api/appointments/${targetAppointmentId}/cancel");
    expect(source).toContain("CANCELLATION_TAG_NOT_CONFIGURED");
    expect(source).toContain("await queryClient.invalidateQueries({ queryKey: projectsQueryKey });");
    expect(source).toContain("await queryClient.invalidateQueries({ queryKey: [`/api/projects/${selectedProjectId}`] });");
    expect(source).toContain("button-cancel-appointment");
    expect(source).toContain("Termin stornieren?");
    expect(source).toContain("Termin storniert");
  });

  it("treats cancelled appointments as readonly across submit and footer actions", () => {
    expect(source).toContain("const isMutationLocked = isLocked || isCancelled;");
    expect(source).toContain("onSubmit={!isMutationLocked ? submitAppointment : undefined}");
    expect(source).toContain("disabled={isMutationLocked || cancelAppointmentMutation.isPending}");
    expect(source).toContain("disabled={isMutationLocked || deleteAppointmentMutation.isPending}");
    expect(source).toContain("Stornierte Termine koennen nicht mehr bearbeitet werden.");
  });

  it("renders employee picker as header action button with plus icon inside AppointmentEmployeeSlot", () => {
    expect(source).toContain('import { AppointmentEmployeeSlot } from "@/components/AppointmentEmployeeSlot";');
    expect(source).toContain("<AppointmentEmployeeSlot");
    expect(source).toContain("tours={tours}");
    expect(source).toContain("tourMembersById={tourMembersById}");
    expect(source).toContain("selectedTour={selectedTour}");
    expect(source).toContain("onTourChange={handleTourChange}");
    expect(employeeSlotSource).toContain("data-testid=\"section-tour-picker\"");
    expect(employeeSlotSource).toContain(">Tour</Label>");
    expect(employeeSlotSource).toContain(">Zugewiesen</Label>");
    expect(employeeSlotSource).toContain("className=\"flex items-center justify-between\"");
    expect(employeeSlotSource).toContain("<PlusActionButton");
    expect(employeeSlotSource).toContain("data-testid=\"button-add-employee\"");
    expect(employeeSlotSource).toContain(">Teams</Label>");
  });

  it("prefills tour and active employees from initialTourId in create mode", () => {
    expect(source).toContain("if (initialTourId === null || initialTourId === undefined) return;");
    expect(source).toContain(".filter((employee) => employee.tourId === initialTourId && employee.isActive)");
    expect(source).toContain("setSelectedTourId(initialTourId);");
    expect(source).toContain("setAssignedEmployeeIds(tourEmployeeIds);");
    expect(source).toContain("employeeCount: tourEmployeeIds.length");
  });

  it("removes legacy large employee selection button block", () => {
    expect(source).not.toContain("Mitarbeiter hinzufügen");
  });

  it("renders the selected tour badge outside the employee slot and removes the legacy tour panel", () => {
    expect(source).toContain("{selectedTour ? (");
    expect(source).toContain("fullWidth");
    expect(source).toContain("testId=\"badge-tour\"");
    expect(source).not.toContain("Keine Tour ausgewählt");
  });
});
