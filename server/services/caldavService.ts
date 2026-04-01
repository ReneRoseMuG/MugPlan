import https from "node:https";
import * as backupRuntimeRepository from "../repositories/backupRuntimeRepository";

type CaldavConfig = {
  baseUrl: string;
  username: string;
  password: string;
};

function loadConfig(): CaldavConfig | null {
  const baseUrl = process.env.CALDAV_URL?.trim() ?? "";
  const username = process.env.CALDAV_USER?.trim() ?? "";
  const password = process.env.CALDAV_PASS?.trim() ?? "";
  if (!baseUrl || !username || !password) return null;
  if (!baseUrl.toLowerCase().startsWith("https://")) return null;
  return { baseUrl: baseUrl.replace(/\/+$/, ""), username, password };
}

function buildUid(appointmentId: number): string {
  return `mugplan-appointment-${appointmentId}@mugplan.local`;
}

function buildDefaultExternalEventId(appointmentId: number): string {
  return buildUid(appointmentId);
}

function formatDateIcs(date: string): string {
  return date.replace(/-/g, "");
}

function formatDateTimeIcs(date: string, time: string | null): string {
  if (!time) return `${formatDateIcs(date)}T080000`;
  const hhmmss = `${time.slice(0, 2)}${time.slice(3, 5)}00`;
  return `${formatDateIcs(date)}T${hhmmss}`;
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function buildIcsEvent(input: {
  appointmentId: number;
  title: string;
  description: string;
  startDate: string;
  startTime: string | null;
  endDate: string | null;
  endTime: string | null;
}): string {
  const uid = buildUid(input.appointmentId);
  const dtStamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const dtStart = formatDateTimeIcs(input.startDate, input.startTime);
  const endDate = input.endDate ?? input.startDate;
  const dtEnd = formatDateTimeIcs(endDate, input.endTime ?? input.startTime);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MuGPlan//FT07//DE",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
    `DESCRIPTION:${escapeIcsText(input.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function buildEventUrl(config: CaldavConfig, externalEventId: string): string {
  return `${config.baseUrl}/${encodeURIComponent(externalEventId)}.ics`;
}

function authHeader(config: CaldavConfig): string {
  return `Basic ${Buffer.from(`${config.username}:${config.password}`).toString("base64")}`;
}

function shouldAllowInsecureTls(): boolean {
  return process.env.CALDAV_ALLOW_INSECURE_TLS === "1";
}

async function sendCaldavRequest(input: {
  url: string;
  method: "PUT" | "DELETE";
  headers: Record<string, string>;
  body?: string;
}): Promise<{ status: number; body: string }> {
  const targetUrl = new URL(input.url);

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        protocol: targetUrl.protocol,
        hostname: targetUrl.hostname,
        port: targetUrl.port,
        path: `${targetUrl.pathname}${targetUrl.search}`,
        method: input.method,
        headers: input.headers,
        rejectUnauthorized: !shouldAllowInsecureTls(),
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        response.on("end", () => {
          resolve({
            status: response.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );

    request.on("error", reject);

    if (typeof input.body === "string" && input.body.length > 0) {
      request.write(input.body);
    }

    request.end();
  });
}

export async function upsertAppointmentInCaldav(appointmentId: number): Promise<{ externalEventId: string } | null> {
  const config = loadConfig();
  if (!config) return null;

  const row = await backupRuntimeRepository.getAppointmentByIdForSync(appointmentId);
  if (!row || !row.startDate) return null;
  const externalEventId = (typeof row.externalEventId === "string" && row.externalEventId.trim().length > 0)
    ? row.externalEventId.trim()
    : buildDefaultExternalEventId(appointmentId);

  const title = row.title?.trim() || row.projectName || `Termin ${appointmentId}`;
  const descriptionParts = [
    row.customerNumber ? `Kundennummer: ${row.customerNumber}` : "",
    row.customerName ? `Kunde: ${row.customerName}` : "",
    row.projectName ? `Projekt: ${row.projectName}` : "",
    row.orderNumber ? `Auftragsnummer: ${row.orderNumber}` : "",
    row.tourName ? `Tour: ${row.tourName}` : "",
    row.description ? `${row.description}` : "",
  ].filter((part) => part.length > 0);
  const description = descriptionParts.join("\n");

  const ics = buildIcsEvent({
    appointmentId,
    title,
    description,
    startDate: String(row.startDate).slice(0, 10),
    startTime: row.startTime ?? null,
    endDate: row.endDate ? String(row.endDate).slice(0, 10) : null,
    endTime: row.endTime ?? null,
  });

  const response = await sendCaldavRequest({
    url: buildEventUrl(config, externalEventId),
    method: "PUT",
    headers: {
      Authorization: authHeader(config),
      "Content-Type": "text/calendar; charset=utf-8",
    },
    body: ics,
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`CalDAV upsert failed (${response.status})`);
  }
  return { externalEventId };
}

export async function deleteAppointmentInCaldav(
  appointmentId: number,
  externalEventIdOverride?: string | null,
): Promise<{ externalEventId: string } | null> {
  const config = loadConfig();
  if (!config) return null;
  const externalEventId = (typeof externalEventIdOverride === "string" && externalEventIdOverride.trim().length > 0)
    ? externalEventIdOverride.trim()
    : buildDefaultExternalEventId(appointmentId);

  const response = await sendCaldavRequest({
    url: buildEventUrl(config, externalEventId),
    method: "DELETE",
    headers: {
      Authorization: authHeader(config),
    },
  });

  if (response.status < 200 || response.status >= 300 && response.status !== 404) {
    throw new Error(`CalDAV delete failed (${response.status})`);
  }
  return { externalEventId };
}
