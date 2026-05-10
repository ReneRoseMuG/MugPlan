/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Abwesenheitsliste im Mitarbeiterformular zeigt den Zeitraum im Kurzformat `dd.MM.yy`.
 * - Mehrtägige Abwesenheiten rendern beide Datumswerte formatiert statt der rohen ISO-Werte.
 * - Beim Ändern des Startdatums im Neuanlage-Formular wird das Enddatum automatisch mitgezogen.
 *
 * Fehlerfälle:
 * - Die Liste fällt auf `yyyy-mm-dd` zurück.
 * - Nur eines der beiden Datumsfelder wird formatiert.
 * - Das Enddatum bleibt beim Verschieben des Startdatums auf dem alten Monat stehen.
 *
 * Ziel:
 * Die sichtbare Datumsdarstellung und das Datums-Mitschieben der FT-33-Abwesenheitsmaske regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useMutation: (options: unknown) => useMutationMock(options),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <button type="button" {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/dialog-base", () => ({
  ConfirmDialogBase: ({ open, title }: { open: boolean; title?: React.ReactNode }) => (
    open ? <div data-testid="dialog-delete-employee-absence">{title}</div> : null
  ),
  DialogBaseFooter: ({
    primaryAction,
    secondaryAction,
  }: {
    primaryAction?: { label: string; testId?: string };
    secondaryAction?: { label: string; testId?: string };
  }) => (
    <>
      {secondaryAction ? <button type="button" data-testid={secondaryAction.testId}>{secondaryAction.label}</button> : null}
      {primaryAction ? <button type="button" data-testid={primaryAction.testId}>{primaryAction.label}</button> : null}
    </>
  ),
  DialogBaseShell: ({ children, open, testId, title }: { children?: React.ReactNode; open: boolean; testId?: string; title?: React.ReactNode }) => (
    open ? <section data-testid={testId}><h2>{title}</h2>{children}</section> : null
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <label {...props}>{children}</label>,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: (props: Record<string, unknown>) => <textarea {...props} />,
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children?: React.ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children?: React.ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children?: React.ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <tr {...props}>{children}</tr>,
  TableHead: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <th {...props}>{children}</th>,
  TableCell: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <td {...props}>{children}</td>,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn(async () => undefined) },
}));

import {
  EmployeeAppointmentAbsencesPanel,
  shouldInvalidateAbsenceSideEffectQuery,
  shiftEndDateByStartDateChange,
} from "../../../client/src/components/EmployeeAppointmentAbsencesPanel";

describe("EmployeeAppointmentAbsencesPanel date format", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useQueryMock.mockReturnValue({
      data: [
        {
          id: 91,
          version: 3,
          startDate: "2026-05-02",
          endDate: "2026-05-05",
          description: "Familienfeier",
          appointmentTags: [{ id: 1, name: "Urlaub", color: "#0F766E", isDefault: true, version: 1 }],
        },
      ],
      isLoading: false,
      error: null,
    });
  });

  it("renders the absence range in dd.MM.yy and no longer exposes a generic open-appointment action", () => {
    const markup = renderToStaticMarkup(
      <EmployeeAppointmentAbsencesPanel employeeId={17} readOnly={false} />,
    );

    expect(markup).toContain("02.05.26 - 05.05.26");
    expect(markup).not.toContain("2026-05-02 - 2026-05-05");
    expect(markup).not.toContain("Termin öffnen");
  });

  it("pulls the end date along when the start date changes", () => {
    expect(shiftEndDateByStartDateChange("", "", "2026-07-15")).toBe("2026-07-15");
    expect(shiftEndDateByStartDateChange("2026-07-15", "2026-07-18", "2026-09-15")).toBe("2026-09-18");
  });

  it("invalidates week calendar employee badges after absence side effects", () => {
    expect(shouldInvalidateAbsenceSideEffectQuery(["calendarWeekLaneEmployeePreviews", "2026-05-04", "2026-05-10"], 17)).toBe(true);
    expect(shouldInvalidateAbsenceSideEffectQuery(["calendarAppointments", "2026-05-04", "2026-05-10"], 17)).toBe(true);
    expect(shouldInvalidateAbsenceSideEffectQuery(["/api/employees", 17, "week-plans"], 17)).toBe(true);
    expect(shouldInvalidateAbsenceSideEffectQuery(["/api/employees", 22, "week-plans"], 17)).toBe(false);
    expect(shouldInvalidateAbsenceSideEffectQuery(["calendarMarkers", "2026-05-04", "2026-05-10"], 17)).toBe(false);
  });
});
