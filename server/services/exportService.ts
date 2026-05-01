import XlsxPopulate from "xlsx-populate";
import PDFDocument from "pdfkit";
import {
  getAllExportAppointmentRows,
  getAppointmentEmployeesByIds,
  getExportAppointmentRows,
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
  const y = String(input.getFullYear()).slice(-2);
  return `${d}.${m}.${y}`;
}

function formatTimestampGerman(input: Date): string {
  return `${formatDateGerman(input)} ${String(input.getHours()).padStart(2, "0")}:${String(input.getMinutes()).padStart(2, "0")}`;
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

function colorToRgb(hex: string | null): string {
  return colorToArgb(hex).slice(2);
}

function columnNumberToName(input: number): string {
  let value = input;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function cellAddress(row: number, column: number): string {
  return `${columnNumberToName(column)}${row}`;
}

function rangeAddress(startRow: number, startColumn: number, endRow: number, endColumn: number): string {
  return `${cellAddress(startRow, startColumn)}:${cellAddress(endRow, endColumn)}`;
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
  const workbook = await XlsxPopulate.fromBlankAsync();
  const calendarSheet = workbook.sheet(0).name("Kalender");
  const detailSheet = workbook.addSheet("Termine");
  const projectsSheet = workbook.addSheet("Projekte");
  const customersSheet = workbook.addSheet("Kunden");
  const employeesSheet = workbook.addSheet("Mitarbeiter");

  const allTours = await listAllTours();
  const selectedTours = input.laneTourIds.length > 0
    ? allTours.filter((tour) => input.laneTourIds.includes(tour.id)).slice(0, 3)
    : allTours.slice(0, 3);
  const selectedTourIds = new Set(selectedTours.map((tour) => tour.id));
  const calendarStart = startOfWeek(new Date());
  const weeks = 26;
  const totalColumns = weeks * 7;

  for (let c = 1; c <= totalColumns; c += 1) {
    calendarSheet.column(c).width(18);
  }

  let currentRow = 1;
  for (let weekIndex = 0; weekIndex < weeks; weekIndex += 1) {
    const weekStart = addDays(calendarStart, weekIndex * 7);
    const weekEnd = addDays(weekStart, 6);
    const startCol = weekIndex * 7 + 1;
    const endCol = startCol + 6;

    calendarSheet.range(rangeAddress(currentRow, startCol, currentRow, endCol)).merged(true);
    calendarSheet.cell(currentRow, startCol)
      .value(`Woche ${formatDateGerman(weekStart)} bis ${formatDateGerman(weekEnd)}`)
      .style({ bold: true, horizontalAlignment: "center" });
  }
  currentRow += 1;

  for (let weekIndex = 0; weekIndex < weeks; weekIndex += 1) {
    for (let day = 0; day < 7; day += 1) {
      const date = addDays(addDays(calendarStart, weekIndex * 7), day);
      calendarSheet.cell(currentRow, weekIndex * 7 + day + 1)
        .value(formatDateGerman(date))
        .style({ bold: true });
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
      calendarSheet.range(rangeAddress(currentRow, startCol, currentRow, endCol)).merged(true);
      calendarSheet.cell(currentRow, startCol)
        .value(lane.title)
        .style({
          fill: colorToRgb(lane.color),
          bold: true,
          horizontalAlignment: "center",
        });
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
          const detailCell = detailSheet.cell(detailRowRef);
          const detailAddress = detailCell.address({ includeSheetName: true });
          const line1Cell = calendarSheet.cell(line1Row, weekIndex * 7 + day + 1)
            .value(firstLine)
            .style({ fontColor: "0563C1", underline: true });
          const line2Cell = calendarSheet.cell(line2Row, weekIndex * 7 + day + 1)
            .value(secondLine)
            .style({ fontColor: "0563C1", underline: true });
          calendarSheet.hyperlink(line1Cell.address(), detailAddress, true);
          calendarSheet.hyperlink(line2Cell.address(), detailAddress, true);
        }

        if (dayAppointments.length > 2) {
          const overflowCount = dayAppointments.length - 2;
          calendarSheet.cell(currentRow + 4, weekIndex * 7 + day + 1)
            .value(`+${overflowCount}`)
            .style({ bold: true, horizontalAlignment: "center" });
        }
      }
    }

    currentRow += 5;
  }

  const appointmentIds = input.allAppointments.map((row) => row.appointmentId);
  const employeesByAppointment = groupBy(await getAppointmentEmployeesByIds(appointmentIds), (row) => row.appointmentId);

  const detailColumns = [
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
  ] as const;
  detailColumns.forEach((column, index) => {
    detailSheet.cell(1, index + 1).value(column.header).style({ bold: true });
    detailSheet.column(index + 1).width(column.width);
  });

  input.allAppointments.forEach((row, index) => {
    const employeeList = (employeesByAppointment.get(row.appointmentId) ?? []).map((e) => e.employeeName).join(", ");
    const values = [
      row.appointmentId,
      formatDateForDisplay(row.startDate),
      formatDateForDisplay(row.endDate),
      row.startTime ? `${row.startTime.slice(0, 5)}${row.endTime ? `-${row.endTime.slice(0, 5)}` : ""}` : "Ganztag",
      row.projectId,
      row.projectName,
      row.orderNumber ?? "-",
      row.customerId,
      row.customerNumber,
      row.customerName ?? "-",
      row.postalCode ?? "-",
      [row.addressLine1, row.addressLine2].filter(Boolean).join(" "),
      row.tourName ?? "-",
      employeeList || "-",
    ];
    values.forEach((value, valueIndex) => {
      detailSheet.cell(index + 2, valueIndex + 1).value(value);
    });
  });

  const allProjects = await listAllProjects();
  const projectsColumns = [
    { header: "ID", key: "id", width: 10 },
    { header: "Name", key: "name", width: 26 },
    { header: "Auftragsnummer", key: "orderNumber", width: 20 },
    { header: "Kunde-ID", key: "customerId", width: 12 },
    { header: "Aktiv", key: "isActive", width: 10 },
    { header: "Updated", key: "updatedAt", width: 24 },
  ] as const;
  projectsColumns.forEach((column, index) => {
    projectsSheet.cell(1, index + 1).value(column.header).style({ bold: true });
    projectsSheet.column(index + 1).width(column.width);
  });
  allProjects.forEach((project, index) => {
    const values = [
      project.id,
      project.name,
      project.orderNumber ?? "-",
      project.customerId,
      project.isActive ? "ja" : "nein",
      String(project.updatedAt ?? ""),
    ];
    values.forEach((value, valueIndex) => {
      projectsSheet.cell(index + 2, valueIndex + 1).value(value);
    });
  });

  const allCustomers = await listAllCustomers();
  const customersColumns = [
    { header: "ID", key: "id", width: 10 },
    { header: "Kundennummer", key: "customerNumber", width: 16 },
    { header: "Name", key: "fullName", width: 24 },
    { header: "PLZ", key: "postalCode", width: 10 },
    { header: "Adresse", key: "address", width: 28 },
    { header: "Aktiv", key: "isActive", width: 10 },
    { header: "Updated", key: "updatedAt", width: 24 },
  ] as const;
  customersColumns.forEach((column, index) => {
    customersSheet.cell(1, index + 1).value(column.header).style({ bold: true });
    customersSheet.column(index + 1).width(column.width);
  });
  allCustomers.forEach((customer, index) => {
    const values = [
      customer.id,
      customer.customerNumber,
      customer.fullName ?? "-",
      customer.postalCode ?? "-",
      [customer.addressLine1, customer.addressLine2].filter(Boolean).join(" "),
      customer.isActive ? "ja" : "nein",
      String(customer.updatedAt ?? ""),
    ];
    values.forEach((value, valueIndex) => {
      customersSheet.cell(index + 2, valueIndex + 1).value(value);
    });
  });

  const allEmployees = await listAllEmployees();
  const employeesColumns = [
    { header: "ID", key: "id", width: 10 },
    { header: "Name", key: "fullName", width: 24 },
    { header: "Telefon", key: "phone", width: 16 },
    { header: "E-Mail", key: "email", width: 24 },
    { header: "Aktiv", key: "isActive", width: 10 },
    { header: "Updated", key: "updatedAt", width: 24 },
  ] as const;
  employeesColumns.forEach((column, index) => {
    employeesSheet.cell(1, index + 1).value(column.header).style({ bold: true });
    employeesSheet.column(index + 1).width(column.width);
  });
  allEmployees.forEach((employee, index) => {
    const values = [
      employee.id,
      employee.fullName,
      employee.phone ?? "-",
      employee.email ?? "-",
      employee.isActive ? "ja" : "nein",
      String(employee.updatedAt ?? ""),
    ];
    values.forEach((value, valueIndex) => {
      employeesSheet.cell(index + 2, valueIndex + 1).value(value);
    });
  });

  const out = await workbook.outputAsync("nodebuffer");
  return Buffer.isBuffer(out) ? out : Buffer.from(out);
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
  doc.fontSize(10).text(`Erzeugt am: ${formatTimestampGerman(new Date())}`);
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
