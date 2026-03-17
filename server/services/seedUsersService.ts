import { hashPassword } from "../security/passwordHash";
import * as usersRepository from "../repositories/usersRepository";
import { getSeedFileStatus, readSeedFileUtf8, writeSeedFileUtf8, type SeedFileStatus } from "./seedFileStoreService";
import { parseCsvWithHeaders, stringifyCsv } from "./seedCsvService";
import type { DbRoleCode } from "../settings/registry";

const FILE_NAME = "users.csv";
const VALID_ROLES: DbRoleCode[] = ["ADMIN", "DISPATCHER", "READER"];
const MIN_PASSWORD_LENGTH = 10;

export type SeedExecutionResult = SeedFileStatus & {
  logLines: string[];
};

export async function getUsersSeedStatus(): Promise<SeedFileStatus> {
  return getSeedFileStatus(FILE_NAME);
}

export async function applyUsersSeed(): Promise<SeedExecutionResult> {
  const status = await getUsersSeedStatus();
  if (!status.exists) {
    return { ...status, logLines: [`Quelldatei fehlt: ${FILE_NAME}`] };
  }

  const content = await readSeedFileUtf8(FILE_NAME);
  const { rows } = parseCsvWithHeaders(content);
  const logLines: string[] = [];

  for (const row of rows) {
    const username = (row.Username ?? "").trim();
    const email = (row.Email ?? "").trim();
    const vorname = (row.Vorname ?? "").trim();
    const nachname = (row.Nachname ?? "").trim();
    const rolle = (row.Rolle ?? "").trim();
    const passwort = row.Passwort ?? "";

    if (!username || !email || !vorname || !nachname || !rolle) {
      logLines.push(`Zeile uebersprungen (Pflichtfeld fehlt): Username=${username || "(leer)"}`);
      continue;
    }

    if (!VALID_ROLES.includes(rolle as DbRoleCode)) {
      logLines.push(`Zeile uebersprungen (ungueltige Rolle "${rolle}"): ${username}`);
      continue;
    }

    const existing = await usersRepository.getAuthUserByUsername(username);
    if (existing) {
      logLines.push(`User bereits vorhanden, wird uebersprungen: ${username}`);
      continue;
    }

    if (!passwort || passwort.length < MIN_PASSWORD_LENGTH) {
      logLines.push(`Zeile uebersprungen (Passwort zu kurz oder fehlt): ${username}`);
      continue;
    }

    const passwordHash = await hashPassword(passwort);
    try {
      await usersRepository.createUser({
        username,
        email,
        firstName: vorname,
        lastName: nachname,
        passwordHash,
        roleCode: rolle as DbRoleCode,
      });
      logLines.push(`User angelegt: ${username} (${rolle})`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unbekannter Fehler";
      logLines.push(`User fehlgeschlagen (${username}): ${msg}`);
    }
  }

  return { sourceFile: FILE_NAME, exists: true, logLines };
}

export async function exportUsersSeed(): Promise<SeedExecutionResult> {
  const allUsers = await usersRepository.listUsersForSeedExport();
  const headers = ["Username", "Email", "Vorname", "Nachname", "Rolle", "Passwort"];
  const csvRows = allUsers.map((u) => [
    u.username,
    u.email,
    u.firstName,
    u.lastName,
    u.roleCode ?? "",
    "",
  ]);
  const content = stringifyCsv(headers, csvRows);
  await writeSeedFileUtf8(FILE_NAME, content);
  return {
    sourceFile: FILE_NAME,
    exists: true,
    logLines: [
      `Export geschrieben: ${FILE_NAME}`,
      `Users exportiert: ${allUsers.length}`,
      "Hinweis: Passwort-Spalte ist leer. Beim Import muss das Passwort manuell eingetragen werden.",
    ],
  };
}
