import type { Employee, InsertEmployee, Tag, Team, Tour, UpdateEmployee } from "@shared/schema";
import * as tourWeekEmployeesRepository from "../repositories/tourWeekEmployeesRepository";
import * as employeesRepository from "../repositories/employeesRepository";
import * as tagRelationsRepository from "../repositories/tagRelationsRepository";
import * as tagRelationsService from "./tagRelationsService";
import * as teamsRepository from "../repositories/teamsRepository";
import type { CanonicalRoleKey } from "../settings/registry";
import { isWeekLocked, resolveIsoWeekWindow } from "./tourWeekEmployeesService";

export class EmployeesError extends Error {
  status: number;
  code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR" | "FORBIDDEN" | "BUSINESS_CONFLICT";

  constructor(
    status: number,
    code: "VERSION_CONFLICT" | "NOT_FOUND" | "VALIDATION_ERROR" | "FORBIDDEN" | "BUSINESS_CONFLICT",
  ) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export type EmployeeCsvImportRowStatus = "IMPORTED" | "DUPLICATE" | "INVALID" | "ERROR";

export type EmployeeCsvImportRowResult = {
  lineNumber: number;
  firstName: string;
  lastName: string;
  status: EmployeeCsvImportRowStatus;
  message: string;
};

export type EmployeeCsvImportResult = {
  summary: {
    totalRows: number;
    importedRows: number;
    duplicateRows: number;
    invalidRows: number;
    errorRows: number;
  };
  rows: EmployeeCsvImportRowResult[];
};

export class EmployeeImportError extends Error {
  status: number;
  code: "INVALID_CSV_FORMAT" | "INVALID_CSV_HEADER" | "INVALID_CSV_CONTENT";

  constructor(status: number, code: "INVALID_CSV_FORMAT" | "INVALID_CSV_HEADER" | "INVALID_CSV_CONTENT") {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function resolveScope(roleKey: CanonicalRoleKey, requestedScope: "active" | "inactive"): "active" | "inactive" {
  if (roleKey !== "ADMIN") return "active";
  return requestedScope;
}

function requireAdmin(roleKey: CanonicalRoleKey): void {
  if (roleKey !== "ADMIN") {
    throw new EmployeesError(403, "FORBIDDEN");
  }
}

export async function listEmployees(roleKey: CanonicalRoleKey, scope: "active" | "inactive" = "active"): Promise<Employee[]> {
  const employees = await employeesRepository.getEmployeeListItems(resolveScope(roleKey, scope));
  const tagsByEmployeeId = await tagRelationsRepository.getEmployeeTagsByEmployeeIds(employees.map((employee) => employee.id));
  return employees.map((employee) => ({
    ...employee,
    tags: tagsByEmployeeId.get(employee.id) ?? [],
  })) as Array<Employee & { tags: Tag[]; notesCount: number; attachmentsCount: number }>;
}

export async function listEmployeesForAppointmentDate(
  roleKey: CanonicalRoleKey,
  _appointmentDate: string,
  scope: "active" | "inactive" = "active",
): Promise<Employee[]> {
  const employees = await employeesRepository.getEmployeeListItems(resolveScope(roleKey, scope));
  const tagsByEmployeeId = await tagRelationsRepository.getEmployeeTagsByEmployeeIds(employees.map((employee) => employee.id));
  return employees.map((employee) => ({
    ...employee,
    tags: tagsByEmployeeId.get(employee.id) ?? [],
  })) as Array<Employee & { tags: Tag[]; notesCount: number; attachmentsCount: number }>;
}

export async function getEmployeeWithRelations(
  id: number,
  roleKey: CanonicalRoleKey,
): Promise<{ employee: Employee; team: Team | null; tour: Tour | null } | null> {
  const employee = await employeesRepository.getEmployee(id);
  if (!employee) return null;
  if (roleKey !== "ADMIN" && !employee.isActive) return null;

  let team: Team | null = null;

  if (employee.teamId) {
    team = await teamsRepository.getTeam(employee.teamId);
  }

  return { employee, team, tour: null };
}

export async function listEmployeeWeekPlans(
  id: number,
  roleKey: CanonicalRoleKey,
): Promise<Array<{
  assignmentId: number;
  tourId: number;
  tourName: string;
  tourColor: string | null;
  isoYear: number;
  isoWeek: number;
  weekStartDate: string;
  weekEndDate: string;
  isLocked: boolean;
  members: Array<{ assignmentId: number; employeeId: number; fullName: string }>;
}> | null> {
  const employee = await employeesRepository.getEmployee(id);
  if (!employee) return null;
  if (roleKey !== "ADMIN" && !employee.isActive) return null;

  const employeeAssignments = await tourWeekEmployeesRepository.listAssignmentsByEmployee(id);
  if (employeeAssignments.length === 0) return [];

  const relevantKeys = new Set(
    employeeAssignments.map((assignment) => `${assignment.tourId}-${assignment.isoYear}-${assignment.isoWeek}`),
  );
  const allAssignments = await tourWeekEmployeesRepository.listAssignmentsByTourIds(
    employeeAssignments.map((assignment) => assignment.tourId),
  );

  const grouped = new Map<number, {
    assignmentId: number;
    tourId: number;
    tourName: string;
    tourColor: string | null;
    isoYear: number;
    isoWeek: number;
    weekStartDate: string;
    weekEndDate: string;
    isLocked: boolean;
    members: Array<{ assignmentId: number; employeeId: number; fullName: string }>;
  }>();

  for (const assignment of allAssignments) {
    const key = `${assignment.tourId}-${assignment.isoYear}-${assignment.isoWeek}`;
    if (!relevantKeys.has(key)) continue;

    const numericKey = assignment.tourId * 1000000 + assignment.isoYear * 100 + assignment.isoWeek;
    const existing = grouped.get(numericKey) ?? (() => {
      const weekWindow = resolveIsoWeekWindow(assignment.isoYear, assignment.isoWeek);
      const ownAssignment = employeeAssignments.find((entry) =>
        entry.tourId === assignment.tourId
          && entry.isoYear === assignment.isoYear
          && entry.isoWeek === assignment.isoWeek,
      );

      return {
        assignmentId: ownAssignment?.assignmentId ?? assignment.assignmentId,
        tourId: assignment.tourId,
        tourName: assignment.tourName,
        tourColor: assignment.tourColor,
        isoYear: assignment.isoYear,
        isoWeek: assignment.isoWeek,
        weekStartDate: weekWindow.weekStartDate,
        weekEndDate: weekWindow.weekEndDate,
        isLocked: isWeekLocked(assignment.isoYear, assignment.isoWeek),
        members: [],
      };
    })();

    existing.members.push({
      assignmentId: assignment.assignmentId,
      employeeId: assignment.employeeId,
      fullName: assignment.fullName,
    });
    grouped.set(numericKey, existing);
  }

  return Array.from(grouped.values()).sort((left, right) => {
    if (left.isoYear !== right.isoYear) return left.isoYear - right.isoYear;
    if (left.isoWeek !== right.isoWeek) return left.isoWeek - right.isoWeek;
    return left.tourName.localeCompare(right.tourName, "de");
  });
}

export async function listEmployeeTagRelations(id: number, roleKey: CanonicalRoleKey) {
  const employee = await employeesRepository.getEmployee(id);
  if (!employee) return null;
  if (roleKey !== "ADMIN" && !employee.isActive) return null;
  return tagRelationsService.listTagRelations("employee", id);
}

export async function addEmployeeTag(
  id: number,
  tagId: number,
  roleKey: CanonicalRoleKey,
) {
  if (roleKey !== "ADMIN" && roleKey !== "DISPONENT") {
    throw new EmployeesError(403, "FORBIDDEN");
  }
  const employee = await employeesRepository.getEmployee(id);
  if (!employee) return null;
  if (roleKey !== "ADMIN" && !employee.isActive) return null;
  const tag = await tagRelationsService.getTagById(tagId);
  if (!tag) {
    throw new EmployeesError(404, "NOT_FOUND");
  }
  return tagRelationsService.addTagRelation("employee", id, tagId);
}

export async function removeEmployeeTag(
  id: number,
  tagId: number,
  expectedVersion: number,
  roleKey: CanonicalRoleKey,
) {
  if (roleKey !== "ADMIN" && roleKey !== "DISPONENT") {
    throw new EmployeesError(403, "FORBIDDEN");
  }
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    throw new EmployeesError(422, "VALIDATION_ERROR");
  }
  const employee = await employeesRepository.getEmployee(id);
  if (!employee) return null;
  if (roleKey !== "ADMIN" && !employee.isActive) return null;

  const result = await tagRelationsService.removeTagRelation("employee", id, tagId, expectedVersion);
  if (result.kind === "version_conflict") {
    throw new EmployeesError(409, "VERSION_CONFLICT");
  }
  if (result.kind === "not_found") {
    throw new EmployeesError(404, "NOT_FOUND");
  }
  return;
}

export async function createEmployee(data: InsertEmployee): Promise<Employee> {
  const fullName = `${data.lastName}, ${data.firstName}`;
  return employeesRepository.createEmployee({ ...data, fullName });
}

export async function updateEmployee(
  id: number,
  data: UpdateEmployee & { version: number },
  roleKey: CanonicalRoleKey,
): Promise<Employee | null> {
  if (!Number.isInteger(data.version) || data.version < 1) {
    throw new EmployeesError(422, "VALIDATION_ERROR");
  }

  const existing = await employeesRepository.getEmployee(id);
  if (!existing) return null;
  if (roleKey !== "ADMIN" && !existing.isActive) return null;
  if (roleKey !== "ADMIN" && data.isActive !== undefined && data.isActive !== existing.isActive) {
    throw new EmployeesError(403, "FORBIDDEN");
  }

  let fullName = existing.fullName;
  if (data.firstName !== undefined || data.lastName !== undefined) {
    const firstName = data.firstName !== undefined ? data.firstName : existing.firstName;
    const lastName = data.lastName !== undefined ? data.lastName : existing.lastName;
    fullName = `${lastName}, ${firstName}`;
  }

  const result = await employeesRepository.updateEmployeeWithVersion(id, data.version, { ...data, fullName });
  if (result.kind === "version_conflict") {
    const exists = await employeesRepository.getEmployee(id);
    if (!exists) return null;
    throw new EmployeesError(409, "VERSION_CONFLICT");
  }
  return result.employee;
}

export async function toggleEmployeeActive(
  id: number,
  isActive: boolean,
  version: number,
  roleKey: CanonicalRoleKey,
): Promise<Employee | null> {
  requireAdmin(roleKey);
  if (!Number.isInteger(version) || version < 1) {
    throw new EmployeesError(422, "VALIDATION_ERROR");
  }
  const result = await employeesRepository.toggleEmployeeActiveWithVersion(id, version, isActive);
  if (result.kind === "version_conflict") {
    const exists = await employeesRepository.getEmployee(id);
    if (!exists) return null;
    throw new EmployeesError(409, "VERSION_CONFLICT");
  }
  return result.employee;
}

export async function deleteEmployee(id: number, version: number, roleKey: CanonicalRoleKey): Promise<void> {
  requireAdmin(roleKey);
  if (!Number.isInteger(version) || version < 1) {
    throw new EmployeesError(422, "VALIDATION_ERROR");
  }

  const result = await employeesRepository.deleteEmployeeWithVersion(id, version);
  if (result.kind === "version_conflict") {
    const exists = await employeesRepository.getEmployee(id);
    if (!exists) {
      throw new EmployeesError(404, "NOT_FOUND");
    }
    throw new EmployeesError(409, "VERSION_CONFLICT");
  }
  if (result.kind === "business_conflict") {
    throw new EmployeesError(409, "BUSINESS_CONFLICT");
  }
}

function normalizeNamePart(value: string): string {
  return value.trim().toLocaleLowerCase("de");
}

type ParsedLine = {
  raw: string;
  lineNumber: number;
};

function toLines(content: string): ParsedLine[] {
  return content
    .split(/\r?\n/)
    .map((raw, index) => ({ raw, lineNumber: index + 1 }));
}

function parseCsvRow(row: string, delimiter: string): { values: string[]; error?: string } {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < row.length; i += 1) {
    const char = row[i];
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === delimiter && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  if (inQuotes) {
    return { values: [], error: "UNBALANCED_QUOTES" };
  }

  values.push(current);
  return { values };
}

function detectDelimiter(headerLine: string): string {
  const candidates = [";", ","];
  const matching = candidates.filter((candidate) => {
    const parsed = parseCsvRow(headerLine, candidate);
    if (parsed.error) return false;
    const normalized = parsed.values.map((entry) => entry.trim().toLocaleLowerCase("de"));
    return normalized.includes("vorname") && normalized.includes("nachname");
  });

  if (matching.length === 1) return matching[0];
  if (matching.length > 1) {
    throw new EmployeeImportError(422, "INVALID_CSV_FORMAT");
  }
  throw new EmployeeImportError(400, "INVALID_CSV_HEADER");
}

type ImportCandidate = {
  lineNumber: number;
  firstName: string;
  lastName: string;
  normalizedFirstName: string;
  normalizedLastName: string;
};

type ParseImportResult = {
  candidates: ImportCandidate[];
  rows: EmployeeCsvImportRowResult[];
};

type EmployeeCsvImportSyncResult = EmployeeCsvImportResult & {
  employeeIds: number[];
};

function parseEmployeeImportCsv(rawBuffer: Buffer): ParseImportResult {
  const content = rawBuffer.toString("utf8").replace(/^\uFEFF/, "");
  const lines = toLines(content);
  const nonEmpty = lines.filter((line) => line.raw.trim().length > 0);
  if (nonEmpty.length === 0) {
    throw new EmployeeImportError(422, "INVALID_CSV_CONTENT");
  }

  const headerLine = nonEmpty[0];
  const delimiter = detectDelimiter(headerLine.raw);
  const parsedHeader = parseCsvRow(headerLine.raw, delimiter);
  if (parsedHeader.error) {
    throw new EmployeeImportError(422, "INVALID_CSV_FORMAT");
  }

  const normalizedHeaders = parsedHeader.values.map((entry) => entry.trim().toLocaleLowerCase("de"));
  const firstNameIndex = normalizedHeaders.indexOf("vorname");
  const lastNameIndex = normalizedHeaders.indexOf("nachname");
  if (firstNameIndex < 0 || lastNameIndex < 0) {
    throw new EmployeeImportError(400, "INVALID_CSV_HEADER");
  }

  const rows: EmployeeCsvImportRowResult[] = [];
  const candidates: ImportCandidate[] = [];
  const seenInFile = new Set<string>();

  for (const line of nonEmpty.slice(1)) {
    const parsed = parseCsvRow(line.raw, delimiter);
    if (parsed.error) {
      rows.push({
        lineNumber: line.lineNumber,
        firstName: "",
        lastName: "",
        status: "INVALID",
        message: "CSV-Zeile ist ungueltig formatiert",
      });
      continue;
    }

    const firstName = (parsed.values[firstNameIndex] ?? "").trim();
    const lastName = (parsed.values[lastNameIndex] ?? "").trim();

    if (!firstName || !lastName) {
      rows.push({
        lineNumber: line.lineNumber,
        firstName,
        lastName,
        status: "INVALID",
        message: "Vorname und Nachname sind Pflichtfelder",
      });
      continue;
    }

    if (firstName.length > 100 || lastName.length > 100) {
      rows.push({
        lineNumber: line.lineNumber,
        firstName,
        lastName,
        status: "INVALID",
        message: "Vorname/Nachname darf maximal 100 Zeichen lang sein",
      });
      continue;
    }

    const normalizedFirstName = normalizeNamePart(firstName);
    const normalizedLastName = normalizeNamePart(lastName);
    const key = `${normalizedFirstName}::${normalizedLastName}`;
    if (seenInFile.has(key)) {
      rows.push({
        lineNumber: line.lineNumber,
        firstName,
        lastName,
        status: "DUPLICATE",
        message: "Duplikat innerhalb der CSV-Datei",
      });
      continue;
    }

    seenInFile.add(key);
    candidates.push({
      lineNumber: line.lineNumber,
      firstName,
      lastName,
      normalizedFirstName,
      normalizedLastName,
    });
  }

  return { candidates, rows };
}

export async function importEmployeesFromCsv(rawBuffer: Buffer): Promise<EmployeeCsvImportResult> {
  const parsed = parseEmployeeImportCsv(rawBuffer);
  const rows = [...parsed.rows];
  const allEmployees = await employeesRepository.getAllEmployees();
  const existingKeys = new Set(
    allEmployees.map((employee) => `${normalizeNamePart(employee.firstName)}::${normalizeNamePart(employee.lastName)}`),
  );

  for (const candidate of parsed.candidates) {
    const key = `${candidate.normalizedFirstName}::${candidate.normalizedLastName}`;
    if (existingKeys.has(key)) {
      rows.push({
        lineNumber: candidate.lineNumber,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        status: "DUPLICATE",
        message: "Duplikat bereits im Bestand",
      });
      continue;
    }

    try {
      await createEmployee({
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        phone: null,
        email: null,
      });
      existingKeys.add(key);
      rows.push({
        lineNumber: candidate.lineNumber,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        status: "IMPORTED",
        message: "Importiert",
      });
    } catch {
      rows.push({
        lineNumber: candidate.lineNumber,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        status: "ERROR",
        message: "Insert fehlgeschlagen",
      });
    }
  }

  rows.sort((a, b) => a.lineNumber - b.lineNumber);

  const summary = {
    totalRows: rows.length,
    importedRows: rows.filter((row) => row.status === "IMPORTED").length,
    duplicateRows: rows.filter((row) => row.status === "DUPLICATE").length,
    invalidRows: rows.filter((row) => row.status === "INVALID").length,
    errorRows: rows.filter((row) => row.status === "ERROR").length,
  };

  return { summary, rows };
}

export async function syncEmployeesFromCsv(rawBuffer: Buffer): Promise<EmployeeCsvImportSyncResult> {
  const parsed = parseEmployeeImportCsv(rawBuffer);
  const rows = [...parsed.rows];
  const existingEmployees = await employeesRepository.getAllEmployees();
  const employeesByKey = new Map(
    existingEmployees.map((employee) => [
      `${normalizeNamePart(employee.firstName)}::${normalizeNamePart(employee.lastName)}`,
      employee,
    ]),
  );
  const employeeIds: number[] = [];

  for (const candidate of parsed.candidates) {
    const key = `${candidate.normalizedFirstName}::${candidate.normalizedLastName}`;
    const existingEmployee = employeesByKey.get(key);
    if (existingEmployee) {
      employeeIds.push(existingEmployee.id);
      rows.push({
        lineNumber: candidate.lineNumber,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        status: "DUPLICATE",
        message: "Duplikat bereits im Bestand",
      });
      continue;
    }

    try {
      const createdEmployee = await createEmployee({
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        phone: null,
        email: null,
      });
      employeesByKey.set(key, createdEmployee);
      employeeIds.push(createdEmployee.id);
      rows.push({
        lineNumber: candidate.lineNumber,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        status: "IMPORTED",
        message: "Importiert",
      });
    } catch {
      rows.push({
        lineNumber: candidate.lineNumber,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        status: "ERROR",
        message: "Insert fehlgeschlagen",
      });
    }
  }

  rows.sort((a, b) => a.lineNumber - b.lineNumber);

  const summary = {
    totalRows: rows.length,
    importedRows: rows.filter((row) => row.status === "IMPORTED").length,
    duplicateRows: rows.filter((row) => row.status === "DUPLICATE").length,
    invalidRows: rows.filter((row) => row.status === "INVALID").length,
    errorRows: rows.filter((row) => row.status === "ERROR").length,
  };

  return { summary, rows, employeeIds };
}
