const entityLabels: Record<string, string> = {
  appointment: "Termin",
  customer: "Kunde",
  project: "Projekt",
  tour: "Tour",
  employee: "Mitarbeiter",
  appointment_attachment: "Terminanhang",
  customer_attachment: "Kundenanhang",
  project_attachment: "Projektanhang",
  employee_attachment: "Mitarbeiteranhang",
  note: "Notiz",
  project_order_item: "Auftragsposition",
  product: "Produkt",
  component: "Komponente",
  product_category: "Produktkategorie",
  component_category: "Komponentenkategorie",
  tag: "Tag",
  calendar_week: "Kalenderwoche",
  employee_week_assignment: "Wochenplanung",
};

function extractString(snapshot: unknown, keys: string[]): string | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const record = snapshot as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

export function getJournalEntityLabel(tableName: string): string {
  return entityLabels[tableName] ?? tableName;
}

export function describeJournalEntity(
  tableName: string,
  snapshot: unknown,
  fallbackId?: number | null,
  fallbackKey?: string | null,
): string {
  const candidate = extractString(snapshot, [
    "title",
    "name",
    "fullName",
    "customerNumber",
    "orderNumber",
    "originalName",
    "displayName",
  ]);
  if (candidate) {
    return candidate;
  }
  if (fallbackKey && fallbackKey.trim().length > 0) {
    return fallbackKey;
  }
  if (fallbackId != null) {
    return `#${fallbackId}`;
  }
  return getJournalEntityLabel(tableName);
}

export function buildCreateMessage(tableName: string, snapshot: unknown, fallbackId?: number | null, fallbackKey?: string | null): string {
  return `${getJournalEntityLabel(tableName)} ${describeJournalEntity(tableName, snapshot, fallbackId, fallbackKey)} angelegt`;
}

export function buildUpdateMessage(tableName: string, snapshot: unknown, fallbackId?: number | null, fallbackKey?: string | null): string {
  return `${getJournalEntityLabel(tableName)} ${describeJournalEntity(tableName, snapshot, fallbackId, fallbackKey)} geändert`;
}

export function buildDeleteMessage(tableName: string, snapshot: unknown, fallbackId?: number | null, fallbackKey?: string | null): string {
  return `${getJournalEntityLabel(tableName)} ${describeJournalEntity(tableName, snapshot, fallbackId, fallbackKey)} gelöscht`;
}

export function buildTagMessage(action: "hinzugefügt" | "entfernt", ownerTable: string, ownerSnapshot: unknown, tagName: string, fallbackId?: number | null): string {
  return `Tag ${tagName} bei ${getJournalEntityLabel(ownerTable)} ${describeJournalEntity(ownerTable, ownerSnapshot, fallbackId)} ${action}`;
}

export function buildAttachmentMessage(action: "hochgeladen" | "gelöscht", ownerTable: string, ownerSnapshot: unknown, attachmentName: string, fallbackId?: number | null): string {
  return `Anhang ${attachmentName} bei ${getJournalEntityLabel(ownerTable)} ${describeJournalEntity(ownerTable, ownerSnapshot, fallbackId)} ${action}`;
}

export function buildNoteMessage(action: "erstellt" | "geändert" | "angepinnt" | "entpinnt" | "gelöscht", ownerTable: string, ownerSnapshot: unknown, noteTitle: string, fallbackId?: number | null): string {
  return `Notiz ${noteTitle} bei ${getJournalEntityLabel(ownerTable)} ${describeJournalEntity(ownerTable, ownerSnapshot, fallbackId)} ${action}`;
}

export function buildAppointmentEmployeeMessage(action: "hinzugefügt" | "entfernt", employeeName: string, appointmentSnapshot: unknown, appointmentId?: number | null): string {
  return `Mitarbeiter ${employeeName} bei Termin ${describeJournalEntity("appointment", appointmentSnapshot, appointmentId)} ${action}`;
}

export function buildWeekAssignmentMessage(action: "erstellt" | "geändert" | "gelöscht", employeeName: string, isoYear: number, isoWeek: number, tourName: string | null): string {
  const weekLabel = `KW ${String(isoWeek).padStart(2, "0")}/${isoYear}`;
  const scope = tourName ? `${weekLabel} (${tourName})` : weekLabel;
  return `Wochenplanung für ${employeeName} ${scope} ${action}`;
}

export function buildCalendarWeekMessage(
  action: "erstellt" | "blockiert" | "freigegeben" | "notiz_erstellt" | "notiz_geloescht",
  isoYear: number,
  isoWeek: number,
  tourName: string | null,
): string {
  const weekLabel = `KW ${String(isoWeek).padStart(2, "0")}/${isoYear}`;
  const scope = tourName ? `${weekLabel} (${tourName})` : weekLabel;
  if (action === "erstellt") return `Kalenderwoche ${scope} angelegt`;
  if (action === "blockiert") return `Kalenderwoche ${scope} blockiert`;
  if (action === "freigegeben") return `Kalenderwoche ${scope} freigegeben`;
  if (action === "notiz_erstellt") return `Kalenderwochennotiz für ${scope} erstellt`;
  return `Kalenderwochennotiz für ${scope} gelöscht`;
}

export function buildDisplayModeMessage(previousMode: string, nextMode: string, appointmentSnapshot: unknown, appointmentId?: number | null): string {
  return `Anzeigeformat von Termin ${describeJournalEntity("appointment", appointmentSnapshot, appointmentId)} von ${previousMode} auf ${nextMode} geändert`;
}
