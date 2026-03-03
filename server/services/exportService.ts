import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import {
  getAllExportAppointmentRows,
  getAppointmentEmployeesByIds,
  getExportAppointmentRows,
  getProjectStatusesByIds,
  listAllCustomers,
  listAllEmployees,
  listAllProjects,
  listAllTours,
  type ExportAppointmentRow,
} from "../repositories/backupRuntimeRepository";
import { getGlobalSettingValue } from "./userSettingsService";

type ExportResult = {
  excelBuffer: Buffer;
  pdfBuffer: Buffer;
  exportedRecordCount: number;
};

function startOfWeek(date: Date): Date {
  const copy = new Date(date);
  const day = copy.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + delta);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatDateIso(input: Date): string {
  const y = input.getFullYear();
  const m = String(input.getMonth() + 1).padStart(2, "0");
  const d = String(input.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateGerman(input: Date): string {
  const d = String(input.getDate()).padStart(2, "0");
  const m = String(input.getMonth() + 1).padStart(2, "0");
  const y = input.getFullYear();
  return `${d}.${m}.${y}`;
}

function formatDateForDisplay(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return formatDateGerman(parsed);
}

function formatTime(value: string | null): string {
  if (!value) return "Ganztag";
  return value.slice(0, 5);
}

function toBuffer(chunks: Uint8Array[]): Buffer {
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

function colorToArgb(hex: string | null): string {
  if (!hex) return "FFE5E7EB";
  const normalized = hex.replace("#", "").trim();
  if (normalized.length === 6) return `FF${normalized.toUpperCase()}`;
  return "FFE5E7EB";
}

function sanitizeText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function groupBy<T, K>(rows: T[], keySelector: (row: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const row of rows) {
    const key = keySelector(row);
    const bucket = map.get(key) ?? [];
    bucket.push(row);
    map.set(key, bucket);
  }
  return map;
}

function parseBackupLaneTourIds(raw: unknown): number[] {
  if (typeof raw !== "string") return [];
  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const parsed = parts
    .map((part) => Number.parseInt(part, 10))
    .filter((id) => Number.isInteger(id) && id > 0);
  return Array.from(new Set(parsed)).slice(0, 3);
}

function normalizeDateOnly(input: Date): Date {
  return new Date(input.getFullYear(), input.getMonth(), input.getDate());
}

async function buildExcelBuffer(input: {
  calendarAppointments: ExportAppointmentRow[];
  allAppointments: ExportAppointmentRow[];
  laneTourIds: number[];
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const calendarSheet = workbook.addWorksheet("Kalender");
  const detailSheet = workbook.addWorksheet("Termine");
  const projectsSheet = workbook.addWorksheet("Projekte");
  const customersSheet = workbook.addWorksheet("Kunden");
  const employeesSheet = workbook.addWorksheet("Mitarbeiter");

  const allTours = await listAllTours();
  const selectedTours = input.laneTourIds.length > 0
    ? allTours.filter((tour) => input.laneTourIds.includes(tour.id)).slice(0, 3)
    : allTours.slice(0, 3);
  const selectedTourIds = new Set(selectedTours.map((tour) => tour.id));
  const calendarStart = startOfWeek(new Date());
  const weeks = 26;
  const totalColumns = weeks * 7;

  for (let c = 1; c <= totalColumns; c += 1) {
    calendarSheet.getColumn(c).width = 18;
  }

  let currentRow = 1;
  for (let weekIndex = 0; weekIndex < weeks; weekIndex += 1) {
    const weekStart = addDays(calendarStart, weekIndex * 7);
    const weekEnd = addDays(weekStart, 6);
    const startCol = weekIndex * 7 + 1;
    const endCol = startCol + 6;

    calendarSheet.mergeCells(currentRow, startCol, currentRow, endCol);
    const weekTitleCell = calendarSheet.getCell(currentRow, startCol);
    weekTitleCell.value = `Woche ${formatDateGerman(weekStart)} bis ${formatDateGerman(weekEnd)}`;
    weekTitleCell.font = { bold: true };
    weekTitleCell.alignment = { horizontal: "center" };
  }
  currentRow += 1;

  for (let weekIndex = 0; weekIndex < weeks; weekIndex += 1) {
    for (let day = 0; day < 7; day += 1) {
      const date = addDays(addDays(calendarStart, weekIndex * 7), day);
      const cell = calendarSheet.getCell(currentRow, weekIndex * 7 + day + 1);
      cell.value = formatDateGerman(date);
      cell.font = { bold: true };
    }
  }
  currentRow += 1;

  const appointmentsByDate = groupBy(input.calendarAppointments, (row) => row.startDate ?? "");
  const findDetailRowRef = (appointmentId: number) =>
    `A${2 + input.allAppointments.findIndex((a) => a.appointmentId === appointmentId)}`;

  type LaneConfig = {
    title: string;
    color: string | null;
    matches: (appointment: ExportAppointmentRow) => boolean;
  };

  const lanes: LaneConfig[] = [
    ...selectedTours.map((tour) => ({
      title: tour.name,
      color: tour.color,
      matches: (appointment: ExportAppointmentRow) => appointment.tourId === tour.id,
    })),
    {
      title: "Ohne Tour",
      color: null,
      matches: (appointment: ExportAppointmentRow) =>
        appointment.tourId == null || !selectedTourIds.has(appointment.tourId),
    },
  ];

  for (const lane of lanes) {
    for (let weekIndex = 0; weekIndex < weeks; weekIndex += 1) {
      const startCol = weekIndex * 7 + 1;
      const endCol = startCol + 6;
      calendarSheet.mergeCells(currentRow, startCol, currentRow, endCol);
      const cell = calendarSheet.getCell(currentRow, startCol);
      cell.value = lane.title;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorToArgb(lane.color) } };
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center" };
    }
    currentRow += 1;

    for (let weekIndex = 0; weekIndex < weeks; weekIndex += 1) {
      for (let day = 0; day < 7; day += 1) {
        const date = formatDateIso(addDays(addDays(calendarStart, weekIndex * 7), day));
        const dayAppointments = (appointmentsByDate.get(date) ?? [])
          .filter((appointment) => lane.matches(appointment));
        const slotAppointments = dayAppointments.slice(0, 2);

        for (let slot = 0; slot < slotAppointments.length; slot += 1) {
          const appointment = slotAppointments[slot];
          const line1Row = currentRow + slot * 2;
          const line2Row = line1Row + 1;
          const detailRowRef = findDetailRowRef(appointment.appointmentId);
          const firstLine = `${appointment.customerNumber} - ${appointment.customerName ?? "-"} - ${appointment.postalCode ?? "-"}`;
          const secondLine = `${appointment.orderNumber ?? "-"} - ${appointment.projectName}`;
          calendarSheet.getCell(line1Row, weekIndex * 7 + day + 1).value = {
            text: firstLine,
            hyperlink: `#'Termine'!${detailRowRef}`,
          };
          calendarSheet.getCell(line2Row, weekIndex * 7 + day + 1).value = {
            text: secondLine,
            hyperlink: `#'Termine'!${detailRowRef}`,
          };
        }

        if (dayAppointments.length > 2) {
          const overflowCount = dayAppointments.length - 2;
          const overflowCell = calendarSheet.getCell(currentRow + 4, weekIndex * 7 + day + 1);
          overflowCell.value = `+${overflowCount}`;
          overflowCell.font = { bold: true };
          overflowCell.alignment = { horizontal: "center" };
        }
      }
    }

    currentRow += 5;
  }

  const appointmentIds = input.allAppointments.map((row) => row.appointmentId);
  const projectIds = Array.from(new Set(input.allAppointments.map((row) => row.projectId)));
  const employeesByAppointment = groupBy(await getAppointmentEmployeesByIds(appointmentIds), (row) => row.appointmentId);
  const statusesByProject = groupBy(await getProjectStatusesByIds(projectIds), (row) => row.projectId);

  detailSheet.columns = [
    { header: "Termin-ID", key: "appointmentId", width: 14 },
    { header: "Startdatum", key: "startDate", width: 14 },
    { header: "Enddatum", key: "endDate", width: 14 },
    { header: "Zeit", key: "time", width: 12 },
    { header: "Projekt-ID", key: "projectId", width: 12 },
    { header: "Projektname", key: "projectName", width: 24 },
    { header: "Auftragsnummer", key: "orderNumber", width: 20 },
    { header: "Kunde-ID", key: "customerId", width: 12 },
    { header: "Kundennummer", key: "customerNumber", width: 14 },
    { header: "Kundenname", key: "customerName", width: 24 },
    { header: "PLZ", key: "postalCode", width: 10 },
    { header: "Adresse", key: "address", width: 28 },
    { header: "Tour", key: "tour", width: 14 },
    { header: "Mitarbeiter", key: "employees", width: 28 },
    { header: "Projektstatus", key: "statuses", width: 22 },
  ];

  for (const row of input.allAppointments) {
    const employeeList = (employeesByAppointment.get(row.appointmentId) ?? []).map((e) => e.employeeName).join(", ");
    const statusList = (statusesByProject.get(row.projectId) ?? []).map((s) => s.statusTitle).join(", ");
    detailSheet.addRow({
      appointmentId: row.appointmentId,
      startDate: formatDateForDisplay(row.startDate),
      endDate: formatDateForDisplay(row.endDate),
      time: row.startTime ? `${row.startTime.slice(0, 5)}${row.endTime ? `-${row.endTime.slice(0, 5)}` : ""}` : "Ganztag",
      projectId: row.projectId,
      projectName: row.projectName,
      orderNumber: row.orderNumber ?? "-",
      customerId: row.customerId,
      customerNumber: row.customerNumber,
      customerName: row.customerName ?? "-",
      postalCode: row.postalCode ?? "-",
      address: [row.addressLine1, row.addressLine2].filter(Boolean).join(" "),
      tour: row.tourName ?? "-",
      employees: employeeList || "-",
      statuses: statusList || "-",
    });
  }

  const allProjects = await listAllProjects();
  projectsSheet.columns = [
    { header: "ID", key: "id", width: 10 },
    { header: "Name", key: "name", width: 26 },
    { header: "Auftragsnummer", key: "orderNumber", width: 20 },
    { header: "Kunde-ID", key: "customerId", width: 12 },
    { header: "Aktiv", key: "isActive", width: 10 },
    { header: "Updated", key: "updatedAt", width: 24 },
  ];
  for (const project of allProjects) {
    projectsSheet.addRow({
      id: project.id,
      name: project.name,
      orderNumber: project.orderNumber ?? "-",
      customerId: project.customerId,
      isActive: project.isActive ? "ja" : "nein",
      updatedAt: String(project.updatedAt ?? ""),
    });
  }

  const allCustomers = await listAllCustomers();
  customersSheet.columns = [
    { header: "ID", key: "id", width: 10 },
    { header: "Kundennummer", key: "customerNumber", width: 16 },
    { header: "Name", key: "fullName", width: 24 },
    { header: "PLZ", key: "postalCode", width: 10 },
    { header: "Adresse", key: "address", width: 28 },
    { header: "Aktiv", key: "isActive", width: 10 },
    { header: "Updated", key: "updatedAt", width: 24 },
  ];
  for (const customer of allCustomers) {
    customersSheet.addRow({
      id: customer.id,
      customerNumber: customer.customerNumber,
      fullName: customer.fullName ?? "-",
      postalCode: customer.postalCode ?? "-",
      address: [customer.addressLine1, customer.addressLine2].filter(Boolean).join(" "),
      isActive: customer.isActive ? "ja" : "nein",
      updatedAt: String(customer.updatedAt ?? ""),
    });
  }

  const allEmployees = await listAllEmployees();
  employeesSheet.columns = [
    { header: "ID", key: "id", width: 10 },
    { header: "Name", key: "fullName", width: 24 },
    { header: "Telefon", key: "phone", width: 16 },
    { header: "E-Mail", key: "email", width: 24 },
    { header: "Tour-ID", key: "tourId", width: 10 },
    { header: "Aktiv", key: "isActive", width: 10 },
    { header: "Updated", key: "updatedAt", width: 24 },
  ];
  for (const employee of allEmployees) {
    employeesSheet.addRow({
      id: employee.id,
      fullName: employee.fullName,
      phone: employee.phone ?? "-",
      email: employee.email ?? "-",
      tourId: employee.tourId ?? "-",
      isActive: employee.isActive ? "ja" : "nein",
      updatedAt: String(employee.updatedAt ?? ""),
    });
  }

  const out = await workbook.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}

async function buildPdfBuffer(appointments: ExportAppointmentRow[]): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const chunks: Uint8Array[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(toBuffer(chunks)));
  });

  doc.fontSize(16).text("Anstehende Termine");
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Erzeugt am: ${new Date().toISOString()}`);
  doc.moveDown(1);

  const byDate = groupBy(appointments, (row) => row.startDate ?? "");
  const sortedDates = Array.from(byDate.keys()).filter(Boolean).sort((a, b) => a.localeCompare(b));

  for (const date of sortedDates) {
    const parsedDate = new Date(`${date}T00:00:00`);
    const dateLabel = Number.isNaN(parsedDate.getTime()) ? date : formatDateGerman(parsedDate);
    doc.fontSize(12).fillColor("#111827").text(dateLabel);
    doc.moveDown(0.2);
    const dayRows = byDate.get(date) ?? [];
    for (const row of dayRows) {
      const line = [
        formatTime(row.startTime),
        sanitizeText(row.tourName) || "Ohne Tour",
        `${row.customerNumber} ${sanitizeText(row.customerName)}`.trim(),
        sanitizeText(row.postalCode),
        sanitizeText(row.projectName),
        sanitizeText(row.orderNumber),
      ]
        .filter((value) => value.length > 0)
        .join(" | ");
      doc.fontSize(10).fillColor("#374151").text(`- ${line}`);
    }
    doc.moveDown(0.6);
  }

  doc.end();
  return done;
}

export async function generateBackupDocuments(): Promise<ExportResult> {
  const now = new Date();
  const rangeStart = normalizeDateOnly(now);
  const laneTourIdsRaw = await getGlobalSettingValue("backup_lane_tour_ids");
  const laneTourIds = parseBackupLaneTourIds(laneTourIdsRaw);

  const calendarAppointments = await getExportAppointmentRows({
    fromDate: startOfWeek(now),
    toDate: addDays(startOfWeek(now), 7 * 26 - 1),
  });

  const allAppointments = await getAllExportAppointmentRows();
  const upcomingAppointments = allAppointments.filter((row) => {
    if (!row.startDate) return false;
    const d = normalizeDateOnly(new Date(`${row.startDate}T00:00:00`));
    return d >= rangeStart;
  });

  const excelBuffer = await buildExcelBuffer({ calendarAppointments, allAppointments, laneTourIds });
  const pdfBuffer = await buildPdfBuffer(upcomingAppointments);

  return {
    excelBuffer,
    pdfBuffer,
    exportedRecordCount: allAppointments.length,
  };
}
