import * as employeesRepository from "../repositories/employeesRepository";
import { createEmployee } from "./employeesService";
import { getSeedFileStatus, readSeedFileUtf8, writeSeedFileUtf8, type SeedFileStatus } from "./seedFileStoreService";
import { hasCsvHeader, parseBooleanFlag, parseCsvWithHeaders, stringifyCsv } from "./seedCsvService";

const FILE_NAME = "employees.csv";

export type SeedExecutionResult = SeedFileStatus & {
  logLines: string[];
};

function employeeKey(firstName: string, lastName: string): string {
  return `${firstName.trim().toLocaleLowerCase("de")}::${lastName.trim().toLocaleLowerCase("de")}`;
}

export async function getEmployeesSeedStatus(): Promise<SeedFileStatus> {
  return getSeedFileStatus(FILE_NAME);
}

export async function exportEmployeesSeed(): Promise<SeedExecutionResult> {
  const employees = await employeesRepository.getAllEmployees();
  if (employees.length === 0) {
    return {
      sourceFile: FILE_NAME,
      exists: false,
      logLines: [`Kein Export geschrieben: ${FILE_NAME} (keine Mitarbeiter vorhanden)`],
    };
  }
  const content = stringifyCsv(
    ["Vorname", "Nachname", "IsActive"],
    employees.map((employee) => [employee.firstName, employee.lastName, employee.isActive ? "true" : "false"]),
  );
  await writeSeedFileUtf8(FILE_NAME, content);
  return {
    sourceFile: FILE_NAME,
    exists: true,
    logLines: [`Export geschrieben: ${FILE_NAME}`, `Mitarbeiter exportiert: ${employees.length}`],
  };
}

export async function applyEmployeesSeed(): Promise<SeedExecutionResult> {
  const status = await getSeedFileStatus(FILE_NAME);
  if (!status.exists) {
    return { ...status, logLines: [`Quelldatei fehlt: ${FILE_NAME}`] };
  }

  const content = await readSeedFileUtf8(FILE_NAME);
  const parsed = parseCsvWithHeaders(content);
  const hasIsActiveHeader = hasCsvHeader(parsed.headers, "IsActive");
  const rows = parsed.rows;
  const existingEmployees = await employeesRepository.getAllEmployees();
  const employeesByKey = new Map(existingEmployees.map((employee) => [employeeKey(employee.firstName, employee.lastName), employee]));
  const logLines: string[] = [];

  for (const row of rows) {
    const firstName = (row.Vorname ?? "").trim();
    const lastName = (row.Nachname ?? "").trim();
    if (!firstName || !lastName) {
      logLines.push("Mitarbeiter uebersprungen: Vorname/Nachname fehlt");
      continue;
    }

    const key = employeeKey(firstName, lastName);
    const existingEmployee = employeesByKey.get(key);
    const isActive = hasIsActiveHeader
      ? parseBooleanFlag(row.IsActive ?? "", existingEmployee?.isActive ?? true)
      : true;

    if (!existingEmployee) {
      await createEmployee({
        firstName,
        lastName,
        phone: null,
        email: null,
      });
      const createdEmployee = (await employeesRepository.getAllEmployees()).find((employee) => employeeKey(employee.firstName, employee.lastName) === key);
      if (createdEmployee && createdEmployee.isActive !== isActive) {
        await employeesRepository.toggleEmployeeActiveWithVersion(createdEmployee.id, createdEmployee.version, isActive);
      }
      logLines.push(`Mitarbeiter angelegt: ${lastName}, ${firstName}`);
      continue;
    }

    if (existingEmployee.isActive !== isActive) {
      await employeesRepository.toggleEmployeeActiveWithVersion(existingEmployee.id, existingEmployee.version, isActive);
      logLines.push(`Mitarbeiter aktualisiert: ${lastName}, ${firstName}`);
    } else {
      logLines.push(`Mitarbeiter bereits vorhanden: ${lastName}, ${firstName}`);
    }
  }

  return { sourceFile: FILE_NAME, exists: true, logLines };
}
