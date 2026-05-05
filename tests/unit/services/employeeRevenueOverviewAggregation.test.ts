/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Nur Datensätze mit Projekt, Auftragssumme und ohne Reklamation oder Storno werden gewertet.
 * - Auftragsnummern werden global dedupliziert; die früheste Terminvariante gewinnt deterministisch.
 * - ISO-Wochen- und ISO-Jahresgrenzen bleiben stabil.
 *
 * Fehlerfälle:
 * - Reklamationen, Stornos oder fehlende Beträge landen trotzdem in der Umsatzübersicht.
 * - Dubletten blähen Umsatz oder Auftragszähler mehrfach auf.
 * - Jahresgrenzen erzeugen falsche KW/Jahr-Zuordnungen.
 *
 * Ziel:
 * Die reine Aggregationslogik ohne DB- oder Route-Nebenpfade fachlich belastbar absichern.
 */
import { describe, expect, it } from "vitest";
import type { Tag } from "@shared/schema";
import { RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME } from "@shared/appointmentCancellation";
import { buildEmployeeRevenueOverview } from "../../../server/services/employeeRevenueOverviewAggregation";

function createTag(name: string): Tag {
  return {
    id: Math.abs(name.length * 17),
    name,
    color: "#2563eb",
    isDefault: false,
    version: 1,
  };
}

function createRow(params: {
  appointmentId: number;
  startDate: string;
  startTime?: string | null;
  projectId?: number | null;
  projectName?: string;
  orderNumber?: string | null;
  amount?: string | null;
}) {
  const resolvedProjectId = params.projectId === undefined ? 1 : params.projectId;
  return {
    appointment: {
      id: params.appointmentId,
      projectId: resolvedProjectId,
      startDate: params.startDate,
      startTime: params.startTime ?? null,
    },
    project: resolvedProjectId === null ? null : {
      id: resolvedProjectId,
      name: params.projectName ?? `Projekt ${params.appointmentId}`,
    },
    projectOrder: resolvedProjectId === null ? null : {
      amount: params.amount !== undefined ? params.amount : "100.00",
      orderNumber: params.orderNumber !== undefined ? params.orderNumber : `ORD-${params.appointmentId}`,
    },
  };
}

describe("employee revenue overview aggregation", () => {
  it("filters non-qualifying and complaint-tagged rows", () => {
    const complaintTag = createTag("Reklamation");
    const result = buildEmployeeRevenueOverview({
      employeeId: 7,
      employeeFullName: "Mitarbeiter, Mia",
      rows: [
        createRow({ appointmentId: 1, startDate: "2026-04-27", orderNumber: "REV-100", amount: "100.00" }),
        createRow({ appointmentId: 2, startDate: "2026-04-28", projectId: null }),
        createRow({ appointmentId: 3, startDate: "2026-04-29", orderNumber: "REV-300", amount: null }),
        createRow({ appointmentId: 4, startDate: "2026-04-30", orderNumber: "REV-400", amount: "250.00", projectId: 4 }),
        createRow({ appointmentId: 5, startDate: "2026-05-01", orderNumber: "REV-500", amount: "275.00", projectId: 5 }),
      ],
      appointmentTagsByAppointmentId: new Map([[4, [complaintTag]]]),
      projectTagsByProjectId: new Map([[5, [complaintTag]]]),
    });

    expect(result.employeeId).toBe(7);
    expect(result.employeeFullName).toBe("Mitarbeiter, Mia");
    expect(result.weeks).toHaveLength(1);
    expect(result.weeks[0]).toMatchObject({
      isoYear: 2026,
      isoWeek: 18,
      weekLabel: "KW 18 / 2026",
      orderCount: 1,
      revenueAmount: "100.00",
    });
    expect(result.weeks[0]?.appointments).toEqual([
      {
        appointmentId: 1,
        startDate: "2026-04-27",
        projectName: "Projekt 1",
        orderNumber: "REV-100",
        amount: "100.00",
      },
    ]);
  });

  it("deduplicates globally by order number and keeps the earliest candidate", () => {
    const result = buildEmployeeRevenueOverview({
      employeeId: 9,
      employeeFullName: "Kollegin, Kira",
      rows: [
        createRow({ appointmentId: 11, startDate: "2026-05-03", startTime: "11:00", orderNumber: "REV-DUP", amount: "100.00" }),
        createRow({ appointmentId: 12, startDate: "2026-05-03", startTime: "09:00", orderNumber: "REV-DUP", amount: "100.00" }),
        createRow({ appointmentId: 13, startDate: "2026-05-10", startTime: "08:00", orderNumber: "REV-DUP", amount: "100.00" }),
        createRow({ appointmentId: 14, startDate: "2026-05-04", startTime: "07:30", orderNumber: "REV-UNIQ", amount: "250.50" }),
      ],
      appointmentTagsByAppointmentId: new Map(),
      projectTagsByProjectId: new Map(),
    });

    expect(result.weeks).toHaveLength(2);
    expect(result.weeks[0]).toMatchObject({
      weekLabel: "KW 18 / 2026",
      orderCount: 1,
      revenueAmount: "100.00",
      appointments: [
        expect.objectContaining({
          appointmentId: 12,
          orderNumber: "REV-DUP",
        }),
      ],
    });
    expect(result.weeks[1]).toMatchObject({
      weekLabel: "KW 19 / 2026",
      orderCount: 1,
      revenueAmount: "250.50",
      appointments: [
        expect.objectContaining({
          appointmentId: 14,
          orderNumber: "REV-UNIQ",
        }),
      ],
    });
  });

  it("filters cancelled appointments before deduplicating order numbers", () => {
    const cancellationTag = createTag(RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME);
    const result = buildEmployeeRevenueOverview({
      employeeId: 11,
      employeeFullName: "Storno, Sina",
      rows: [
        createRow({ appointmentId: 31, startDate: "2026-04-20", startTime: "08:00", orderNumber: "REV-STORNO-DUP", amount: "500.00" }),
        createRow({ appointmentId: 32, startDate: "2026-04-27", startTime: "08:00", orderNumber: "REV-STORNO-DUP", amount: "500.00" }),
      ],
      appointmentTagsByAppointmentId: new Map([[31, [cancellationTag]]]),
      projectTagsByProjectId: new Map(),
    });

    expect(result.weeks).toEqual([
      expect.objectContaining({
        isoYear: 2026,
        isoWeek: 18,
        weekLabel: "KW 18 / 2026",
        orderCount: 1,
        revenueAmount: "500.00",
        appointments: [
          expect.objectContaining({
            appointmentId: 32,
            startDate: "2026-04-27",
            orderNumber: "REV-STORNO-DUP",
          }),
        ],
      }),
    ]);
  });

  it("keeps ISO year boundaries and week windows stable", () => {
    const result = buildEmployeeRevenueOverview({
      employeeId: 3,
      employeeFullName: "Grenze, Gesa",
      rows: [
        createRow({ appointmentId: 21, startDate: "2027-01-01", orderNumber: "REV-YEAR-1", amount: "10.00" }),
        createRow({ appointmentId: 22, startDate: "2027-01-04", orderNumber: "REV-YEAR-2", amount: "20.00" }),
      ],
      appointmentTagsByAppointmentId: new Map(),
      projectTagsByProjectId: new Map(),
    });

    expect(result.weeks).toEqual([
      expect.objectContaining({
        isoYear: 2026,
        isoWeek: 53,
        weekStartDate: "2026-12-28",
        weekEndDate: "2027-01-03",
        weekLabel: "KW 53 / 2026",
        revenueAmount: "10.00",
      }),
      expect.objectContaining({
        isoYear: 2027,
        isoWeek: 1,
        weekStartDate: "2027-01-04",
        weekEndDate: "2027-01-10",
        weekLabel: "KW 01 / 2027",
        revenueAmount: "20.00",
      }),
    ]);
  });
});
